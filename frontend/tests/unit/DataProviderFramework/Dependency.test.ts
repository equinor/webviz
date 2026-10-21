import { CancelledError } from "@tanstack/react-query";
import { describe, expect, test, vi } from "vitest";

import { Dependency } from "@modules/_shared/DataProviderFramework/delegates/_utils/Dependency";
import type { GlobalSettings } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { ResolverSpec } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

function makeDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

// A dependency without local settings - it is a root node, which resolves as part of initialize().
// Global settings can be read, and changed through the returned setGlobalSetting() - optionally as invalid.
function makeRootDependency(resolverSpec: ResolverSpec<string, any, any, any, any>) {
    const globalSettings: Partial<Record<keyof GlobalSettings, any>> = {};
    const invalidGlobalSettingKeys = new Set<keyof GlobalSettings>();
    const globalSettingHandlers = new Map<keyof GlobalSettings, (value: any) => void>();

    const dependency = new Dependency<string, any, any, any, any>(
        () => {
            throw new Error("No local settings");
        },
        (key) => globalSettings[key] ?? null,
        resolverSpec,
        () => {},
        () => false,
        (key, handler) => {
            globalSettingHandlers.set(key, handler);
        },
        "test",
        (key) => !invalidGlobalSettingKeys.has(key),
    );

    function setGlobalSetting(key: keyof GlobalSettings, value: any, isValid: boolean = true) {
        globalSettings[key] = value;
        if (isValid) {
            invalidGlobalSettingKeys.delete(key);
        } else {
            invalidGlobalSettingKeys.add(key);
        }
        globalSettingHandlers.get(key)?.(value);
    }

    return { dependency, globalSettings, setGlobalSetting };
}

describe("Dependency", () => {
    test("retries when its resolve is cancelled from outside", async () => {
        const resolve = vi.fn().mockRejectedValueOnce(new CancelledError()).mockResolvedValue("value");
        const { dependency } = makeRootDependency({ resolve });

        dependency.initialize();
        await flush();

        expect(resolve).toHaveBeenCalledTimes(2);
        expect(dependency.getValue()).toBe("value");
        expect(dependency.getIsLoading()).toBe(false);
    });

    test("gives up with an error after repeated external cancellations", async () => {
        const resolve = vi.fn().mockRejectedValue(new CancelledError());
        const { dependency } = makeRootDependency({ resolve });

        dependency.initialize();
        await flush();

        expect(resolve).toHaveBeenCalledTimes(4);
        expect(dependency.getValue()).toBeNull();
        expect(dependency.getIsLoading()).toBe(false);
        expect(dependency.getStatusMessages()).toHaveLength(1);
    });

    test("reports an error that is not an API error, e.g. a bug in the resolver", async () => {
        const resolve = vi.fn().mockRejectedValue(new Error("Cannot read properties of undefined"));
        const { dependency } = makeRootDependency({ resolve });

        dependency.initialize();
        await flush();

        expect(dependency.getValue()).toBeNull();
        expect(dependency.getStatusMessages()).toEqual([
            expect.objectContaining({ message: "Cannot read properties of undefined" }),
        ]);
    });

    test("does not retry a resolve that is cancelled after being destroyed", async () => {
        const deferred = makeDeferred<string>();
        const resolve = vi.fn().mockReturnValue(deferred.promise);
        const { dependency } = makeRootDependency({ resolve });

        dependency.initialize();
        dependency.beforeDestroy();
        deferred.reject(new CancelledError());
        await flush();

        expect(resolve).toHaveBeenCalledTimes(1);
    });

    test("does not start a queued resolve after being destroyed", async () => {
        const deferreds: Deferred<string>[] = [];
        const resolve = vi.fn(() => {
            const deferred = makeDeferred<string>();
            deferreds.push(deferred);
            return deferred.promise;
        });
        const { dependency, globalSettings, setGlobalSetting } = makeRootDependency({
            read: (read) => ({ fieldId: read.globalSetting("fieldId") }),
            resolve,
        });
        globalSettings.fieldId = "old";

        dependency.initialize();
        setGlobalSetting("fieldId", "new");
        dependency.beforeDestroy();
        deferreds[0].resolve("result");
        await flush();

        expect(resolve).toHaveBeenCalledTimes(1);
    });

    test("discards the result of a resolve that finishes after being destroyed", async () => {
        const deferred = makeDeferred<string>();
        const { dependency } = makeRootDependency({ resolve: () => deferred.promise });

        dependency.initialize();
        dependency.beforeDestroy();
        deferred.resolve("value");
        await flush();

        expect(dependency.getValue()).toBeNull();
    });

    test("a resolve started before a change cannot overwrite the result for the changed input", async () => {
        const deferreds: Deferred<string>[] = [];
        const { dependency, globalSettings, setGlobalSetting } = makeRootDependency({
            read: (read) => ({ fieldId: read.globalSetting("fieldId") }),
            resolve: ({ fieldId }) => {
                const deferred = makeDeferred<string>();
                deferreds.push(deferred);
                return deferred.promise.then((value) => `${value}-${fieldId}`);
            },
        });
        globalSettings.fieldId = "old";

        dependency.initialize();
        setGlobalSetting("fieldId", "new");

        // Let the resolves finish newest first - the result for the old input finishing last must not win
        let settled = 0;
        while (settled < deferreds.length) {
            const pending = deferreds.slice(settled);
            settled = deferreds.length;
            for (const deferred of pending.reverse()) {
                deferred.resolve("result");
            }
            await flush();
        }

        expect(dependency.getValue()).toBe("result-new");
        expect(dependency.getIsLoading()).toBe(false);
    });

    test("discards the result of a resolve that is in flight when the input changes", async () => {
        const deferreds: Deferred<string>[] = [];
        const { dependency, globalSettings, setGlobalSetting } = makeRootDependency({
            read: (read) => ({ fieldId: read.globalSetting("fieldId") }),
            resolve: ({ fieldId }) => {
                const deferred = makeDeferred<string>();
                deferreds.push(deferred);
                return deferred.promise.then((value) => `${value}-${fieldId}`);
            },
        });
        const appliedValues: (string | null)[] = [];
        dependency.subscribe((value) => appliedValues.push(value));
        globalSettings.fieldId = "old";

        dependency.initialize();
        setGlobalSetting("fieldId", "new");
        deferreds[0].resolve("result");
        await flush();
        expect(dependency.getIsLoading()).toBe(true);

        deferreds[1].resolve("result");
        await flush();

        expect(appliedValues).toEqual(["result-new"]);
        expect(dependency.getIsLoading()).toBe(false);
    });

    test("is blocked, without loading or resolving, while a read global setting is invalid", async () => {
        const resolve = vi.fn(async (values: Record<string, unknown>) => `headers-${String(values.fieldId)}`);
        const { dependency, globalSettings, setGlobalSetting } = makeRootDependency({
            read: (read) => ({ fieldId: read.globalSetting("fieldId") }),
            resolve,
        });
        globalSettings.fieldId = "field-a";

        dependency.initialize();
        await flush();
        expect(dependency.getValue()).toBe("headers-field-a");

        // E.g. the last ensemble for the field was removed - the field is retained, but must not be requested for
        setGlobalSetting("fieldId", "field-a", false);
        await flush();

        expect(resolve).toHaveBeenCalledTimes(1);
        expect(dependency.getIsBlocked()).toBe(true);
        expect(dependency.getBlockedBy()).toEqual(["Field"]);
        expect(dependency.getIsLoading()).toBe(false);

        setGlobalSetting("fieldId", "field-b");
        await flush();

        expect(dependency.getValue()).toBe("headers-field-b");
        expect(dependency.getIsBlocked()).toBe(false);
        expect(dependency.getIsLoading()).toBe(false);
    });

    test("does not resolve on its first run when a read global setting is already invalid", async () => {
        const resolve = vi.fn(async (values: Record<string, unknown>) => `headers-${String(values.fieldId)}`);
        const { dependency, setGlobalSetting } = makeRootDependency({
            read: (read) => ({ fieldId: read.globalSetting("fieldId") }),
            resolve,
        });
        // E.g. a provider added or restored while the field is retained but invalid
        setGlobalSetting("fieldId", "field-a", false);

        await dependency.initialize();

        expect(resolve).not.toHaveBeenCalled();
        expect(dependency.getIsBlocked()).toBe(true);
        expect(dependency.getBlockedBy()).toEqual(["Field"]);
        expect(dependency.getIsLoading()).toBe(false);
    });
});

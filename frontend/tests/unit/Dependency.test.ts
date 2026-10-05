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
// Global settings can be read, and changed through the returned setGlobalSetting().
function makeRootDependency(resolverSpec: ResolverSpec<string, any, any, any, any>) {
    const globalSettings: Partial<Record<keyof GlobalSettings, any>> = {};
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
    );

    function setGlobalSetting(key: keyof GlobalSettings, value: any) {
        globalSettings[key] = value;
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
});

import { afterEach, describe, expect, test, vi } from "vitest";

import { isDevMode } from "@lib/utils/devMode";

/** Stub the global `localStorage` (absent in the node test environment) with a custom `getItem`. */
function stubLocalStorageGetItem(getItem: (key: string) => string | null): void {
    vi.stubGlobal("localStorage", { getItem: vi.fn(getItem) });
}

describe("isDevMode", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    describe("the forceDevMode localStorage override takes precedence over NODE_ENV", () => {
        test.each([
            ["true", true],
            ["1", true],
            ["TRUE", true],
            ["  true  ", true],
            ["false", false],
            ["0", false],
            ["False", false],
        ])("stored value %j forces dev mode to %s", (storedValue, expected) => {
            // NODE_ENV set to the opposite of what the override should yield
            vi.stubEnv("NODE_ENV", expected ? "production" : "development");
            stubLocalStorageGetItem(() => storedValue);

            expect(isDevMode()).toBe(expected);
        });
    });

    describe("falls back to the NODE_ENV check", () => {
        test("when the flag is unset", () => {
            stubLocalStorageGetItem(() => null);

            vi.stubEnv("NODE_ENV", "development");
            expect(isDevMode()).toBe(true);

            vi.stubEnv("NODE_ENV", "production");
            expect(isDevMode()).toBe(false);
        });

        test.each(["yes", "no", "", "2", "enabled", "off"])(
            "when the flag holds the unrecognized value %j",
            (storedValue) => {
                stubLocalStorageGetItem(() => storedValue);

                vi.stubEnv("NODE_ENV", "development");
                expect(isDevMode()).toBe(true);

                vi.stubEnv("NODE_ENV", "production");
                expect(isDevMode()).toBe(false);
            },
        );

        test("when reading localStorage throws", () => {
            stubLocalStorageGetItem(() => {
                throw new DOMException("The operation is insecure.");
            });

            vi.stubEnv("NODE_ENV", "development");
            expect(isDevMode()).toBe(true);

            vi.stubEnv("NODE_ENV", "production");
            expect(isDevMode()).toBe(false);
        });
    });

    test("reads the flag from the webvizDebug_forceToggleDevModeTo key", () => {
        const getItem = vi.fn(() => "false");
        vi.stubGlobal("localStorage", { getItem });

        isDevMode();

        expect(getItem).toHaveBeenCalledWith("webvizDebug_forceToggleDevModeTo");
    });
});

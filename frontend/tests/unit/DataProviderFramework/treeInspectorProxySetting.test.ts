import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    bindProxySetting,
    makeProxySetting,
} from "@modules/_shared/DataProviderFramework/framework/TreeInspector/proxySetting";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    findProvider,
    getProviderSetting,
    makeDataProviderManager,
    managerState,
    resetTestBackend,
    settle,
    surfaceProvider,
    type TestBackend,
} from "../../utils/dataProviderFramework";

let backend: TestBackend;

beforeEach(() => {
    vi.useFakeTimers();
    backend = resetTestBackend();
    backend.catalogues["field-a"] = {
        depth: { "Top reservoir": [1, 2, 3], "Base reservoir": [2, 3, 4] },
    };
});

afterEach(() => {
    vi.useRealTimers();
});

async function restoreTwoSurfaces(realizationA: number, realizationB: number) {
    const manager = makeDataProviderManager({ fieldId: "field-a" });
    manager.deserializeState(
        managerState([
            surfaceProvider("A", { attribute: "depth", surfaceName: "Top reservoir", realization: realizationA }),
            surfaceProvider("B", { attribute: "depth", surfaceName: "Top reservoir", realization: realizationB }),
        ]),
    );
    await settle(manager);
    const settingOf = (name: string, setting: Setting) => getProviderSetting(findProvider(manager, name), setting);
    return { manager, settingOf };
}

describe("Tree inspector proxy setting (multi selection)", () => {
    test("offers the intersection of the targets' options and writes a picked value to all targets", async () => {
        const { manager, settingOf } = await restoreTwoSurfaces(1, 1);
        const targets = [settingOf("A", Setting.REALIZATION), settingOf("B", Setting.REALIZATION)];
        const proxy = makeProxySetting(targets);
        const unbind = bindProxySetting(proxy, targets);

        expect(proxy.isLoading()).toBe(false);
        expect(proxy.getValueConstraints()).toEqual([1, 2, 3]);
        expect(proxy.getInternalValue()).toBe(1);

        proxy.setValue(3);
        await settle(manager);

        expect(proxy.getInternalValue()).toBe(3);
        expect(targets.map((target) => target.getInternalValue())).toEqual([3, 3]);
        unbind();
    });

    test("writes the value the proxy starts out with as well, once picked (after 'Override for all')", async () => {
        const { manager, settingOf } = await restoreTwoSurfaces(1, 2);
        const targets = [settingOf("A", Setting.REALIZATION), settingOf("B", Setting.REALIZATION)];
        const proxy = makeProxySetting(targets);
        const unbind = bindProxySetting(proxy, targets);

        // Starts out with the first target's value - picking it must still be written to the others
        expect(proxy.getInternalValue()).toBe(1);
        proxy.setValue(1);
        await settle(manager);

        expect(targets.map((target) => target.getInternalValue())).toEqual([1, 1]);
        unbind();
    });

    test("is not left loading after the targets reload with different options", async () => {
        const { manager, settingOf } = await restoreTwoSurfaces(2, 2);
        const targets = [settingOf("A", Setting.REALIZATION), settingOf("B", Setting.REALIZATION)];
        const proxy = makeProxySetting(targets);
        const unbind = bindProxySetting(proxy, targets);
        expect(proxy.getValueConstraints()).toEqual([1, 2, 3]);

        // Changes the realizations available to both targets
        settingOf("A", Setting.SURFACE_NAME).setValue("Base reservoir");
        settingOf("B", Setting.SURFACE_NAME).setValue("Base reservoir");
        await settle(manager);

        expect(proxy.isLoading()).toBe(false);
        expect(proxy.getValueConstraints()).toEqual([2, 3, 4]);

        proxy.setValue(4);
        await settle(manager);
        expect(targets.map((target) => target.getInternalValue())).toEqual([4, 4]);
        unbind();
    });

    test("never writes to the targets by itself", async () => {
        const { manager, settingOf } = await restoreTwoSurfaces(1, 2);
        const targets = [settingOf("A", Setting.REALIZATION), settingOf("B", Setting.REALIZATION)];
        const proxy = makeProxySetting(targets);
        const unbind = bindProxySetting(proxy, targets);
        await settle(manager);

        expect(targets.map((target) => target.getInternalValue())).toEqual([1, 2]);
        unbind();
    });
});

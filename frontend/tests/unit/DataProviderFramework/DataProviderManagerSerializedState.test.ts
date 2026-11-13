import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DashboardSettingValueSource } from "@framework/DashboardSettings/DashboardSettingInstance";
import { REALIZATION_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/realization";
import {
    type DataProviderManager,
    DataProviderManagerTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { ErrorPlaceholder } from "@modules/_shared/DataProviderFramework/framework/ErrorPlaceholder/ErrorPlaceholder";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    findItem,
    findProvider,
    getProviderSetting,
    makeDataProviderManager,
    managerState,
    resetTestBackend,
    settle,
    surfaceProvider,
    type TestBackend,
    view,
} from "../../utils/dataProviderFramework";

function countSerializedStateRevisions(manager: DataProviderManager) {
    const onSerializedStateRevision = vi.fn();
    manager
        .getPublishSubscribeDelegate()
        .subscribe(DataProviderManagerTopic.SERIALIZED_STATE_REVISION, onSerializedStateRevision);
    return onSerializedStateRevision;
}

function getPersistedSetting(manager: DataProviderManager, providerName: string, setting: Setting): unknown {
    const serializedState = JSON.parse(manager.getSerializedState()!);
    const provider = serializedState.children.find((child: { name: string }) => child.name === providerName);
    return JSON.parse(provider.settings[setting]);
}

let backend: TestBackend;

beforeEach(() => {
    vi.useFakeTimers();
    backend = resetTestBackend();
    backend.catalogues["field-a"] = { depth: { "Top reservoir": [1, 2, 3], "Base reservoir": [1] } };
    // The same surfaces as field-a - switching to it reloads the settings without changing them
    backend.catalogues["field-c"] = backend.catalogues["field-a"];
});

afterEach(() => {
    vi.useRealTimers();
});

describe("DataProviderManager serialized state", () => {
    test("restoring a state publishes it once, when restoring has finished", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        const onSerializedStateRevision = countSerializedStateRevisions(manager);

        manager.deserializeState(managerState([surfaceProvider("Surface", { surfaceName: "Base reservoir" })]));
        await settle(manager);

        expect(onSerializedStateRevision).toHaveBeenCalledTimes(1);
        expect(getPersistedSetting(manager, "Surface", Setting.SURFACE_NAME)).toBe("Base reservoir");
    });

    test("changes that only affect what is shown publish nothing", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        await settle(manager);
        const onSerializedStateRevision = countSerializedStateRevisions(manager);
        const onGuiStateRevision = vi.fn();
        manager
            .getPublishSubscribeDelegate()
            .subscribe(DataProviderManagerTopic.GUI_STATE_REVISION, onGuiStateRevision);

        // The settings load again and the provider refetches - but all values stay the same
        manager.updateGlobalSetting("fieldId", "field-c");
        await settle(manager);

        expect(onGuiStateRevision).toHaveBeenCalled();
        expect(onSerializedStateRevision).not.toHaveBeenCalled();
    });

    test("changing a setting publishes the new state", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        await settle(manager);
        const onSerializedStateRevision = countSerializedStateRevisions(manager);

        getProviderSetting(findProvider(manager, "Surface"), Setting.REALIZATION).setValue(3);
        await settle(manager);

        expect(onSerializedStateRevision).toHaveBeenCalledTimes(1);
        expect(getPersistedSetting(manager, "Surface", Setting.REALIZATION)).toBe(3);
    });

    test("expanding or collapsing an item publishes the new state, although it changes nothing that is shown", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        await settle(manager);
        const onSerializedStateRevision = countSerializedStateRevisions(manager);
        const onGuiStateRevision = vi.fn();
        manager
            .getPublishSubscribeDelegate()
            .subscribe(DataProviderManagerTopic.GUI_STATE_REVISION, onGuiStateRevision);

        findProvider(manager, "Surface").getItemDelegate().setExpanded(false);

        expect(onGuiStateRevision).not.toHaveBeenCalled();
        expect(onSerializedStateRevision).toHaveBeenCalledTimes(1);
        expect(JSON.parse(manager.getSerializedState()!).children[0].expanded).toBe(false);
    });

    test("expanding or collapsing a group publishes the new state", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([view("View", [surfaceProvider("Surface")])]));
        await settle(manager);
        const onSerializedStateRevision = countSerializedStateRevisions(manager);

        findItem(manager, "View").getItemDelegate().setExpanded(false);

        expect(onSerializedStateRevision).toHaveBeenCalledTimes(1);
        expect(JSON.parse(manager.getSerializedState()!).children[0].expanded).toBe(false);
    });

    test("after restoring a state failed, nothing is published until a state is restored successfully", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        const groupDelegate = manager.getGroupDelegate();
        const appendChild = groupDelegate.appendChild.bind(groupDelegate);
        vi.spyOn(groupDelegate, "appendChild").mockImplementationOnce(() => {
            throw new Error("Unexpected failure");
        });
        const onSerializedStateRevision = countSerializedStateRevisions(manager);

        expect(() => manager.deserializeState(managerState([surfaceProvider("Surface")]))).toThrow();
        // A change to the tree would otherwise be persisted
        appendChild(new ErrorPlaceholder("Placeholder", "Error", { id: "Placeholder" } as any, manager));
        await settle(manager);
        expect(onSerializedStateRevision).not.toHaveBeenCalled();

        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        await settle(manager);
        expect(onSerializedStateRevision).toHaveBeenCalledTimes(1);
    });

    test("a restored dashboard value controls the restored providers, while their own values stay persisted", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        const dashboardSettingsService = manager.getDashboardSettingsService();
        // As on load: the dashboard settings are restored before the module instances (see Dashboard)
        dashboardSettingsService.deserializeState({ [REALIZATION_DASHBOARD_SETTING.key]: { value: 2 } });
        manager.deserializeState(
            managerState([
                surfaceProvider("Surface", { attribute: "depth", surfaceName: "Top reservoir", realization: 3 }),
            ]),
        );
        await settle(manager);
        const realization = getProviderSetting(findProvider(manager, "Surface"), Setting.REALIZATION);
        const dashboardRealization = dashboardSettingsService.getSetting(REALIZATION_DASHBOARD_SETTING)!;

        expect(realization.getValue()).toBe(2);
        expect(dashboardRealization.getValueSource()).toBe(DashboardSettingValueSource.USER);
        expect(getPersistedSetting(manager, "Surface", Setting.REALIZATION)).toBe(3);
        // Only fetched with the dashboard value - never with the persisted local one
        expect(backend.callsTo("getSurfaceData")).toEqual([["field-a", "depth", "Top reservoir", 2]]);

        // The dashboard value is persisted by the dashboard, not by the module
        const onSerializedStateRevision = countSerializedStateRevisions(manager);
        dashboardRealization.setValue(1);
        await settle(manager);
        expect(realization.getValue()).toBe(1);
        expect(onSerializedStateRevision).not.toHaveBeenCalled();

        dashboardSettingsService.removeSetting(REALIZATION_DASHBOARD_SETTING);
        await settle(manager);
        expect(realization.getValue()).toBe(3);
        expect(getPersistedSetting(manager, "Surface", Setting.REALIZATION)).toBe(3);
    });
});

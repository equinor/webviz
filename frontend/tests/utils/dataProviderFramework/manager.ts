import { QueryClient } from "@tanstack/react-query";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import {
    DataProviderManager,
    type GlobalSettings,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

export const GROUP_COLORS = ["#group-color-1", "#group-color-2", "#group-color-3"];

// Just enough of a WorkbenchSession for constructing a DataProviderManager.
function makeFakeWorkbenchSession(): WorkbenchSession {
    return {
        getPublishSubscribeDelegate: () => new PublishSubscribeDelegate(),
        getEnsembleSet: () => ({ getRegularEnsembleArray: () => [] }),
        getUserCreatedItems: () => ({
            getIntersectionPolylines: () => ({ subscribe: () => () => {}, getPolylines: () => [] }),
        }),
    } as unknown as WorkbenchSession;
}

// Just enough of a WorkbenchSettings for groups, which take their color from the categorical palette.
function makeFakeWorkbenchSettings(): WorkbenchSettings {
    return {
        getSelectedColorPalette: () => ({ getColors: () => GROUP_COLORS }),
    } as unknown as WorkbenchSettings;
}

export function makeDataProviderManager(globalSettings: Partial<GlobalSettings> = {}): DataProviderManager {
    // Without retries, a failing request fails right away instead of after TanStack's retry delays
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const manager = new DataProviderManager(makeFakeWorkbenchSession(), makeFakeWorkbenchSettings(), queryClient);
    for (const [key, value] of Object.entries(globalSettings)) {
        manager.updateGlobalSetting(key as keyof GlobalSettings, value);
    }
    return manager;
}

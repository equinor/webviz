import isEqual from "lodash-es/isEqual";

import type { WellboreTrajectory_api } from "@api";

import type { CustomDataProviderImplementation } from "../../interfacesAndTypes/customDataProviderImplementation";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import { Setting } from "../../settings/settingsDefinitions";

const WELL_TRAJECTORIES_SETTINGS = [Setting.ENSEMBLE];
type WellTrajectoriesSettings = typeof WELL_TRAJECTORIES_SETTINGS;
type SettingsWithTypes = MakeSettingTypesMap<WellTrajectoriesSettings>;

type WellboreTrajectoriesData = WellboreTrajectory_api[];

export class WellboreTrajectoriesProvider
    implements CustomDataProviderImplementation<WellTrajectoriesSettings, WellboreTrajectoriesData>
{
    settings = WELL_TRAJECTORIES_SETTINGS;

    getDefaultName() {
        return "Well Trajectories";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData(): Promise<WellboreTrajectoriesData> {
        // This data provider does not fetch any data itself, it is only used to provide a common interface for settings
        return Promise.resolve([]);
    }

    defineDependencies() {
        return [];
    }
}

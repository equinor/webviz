import type { CustomGroupImplementationWithSettings } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customGroupImplementation";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { baseSettings } from "./_shared";

const continuousTrackSettings = [...baseSettings, Setting.SCALE] as const;
export type ContinuousTrackSettings = typeof continuousTrackSettings;
type TrackSettingTypes = MakeSettingTypesMap<ContinuousTrackSettings>;

export class ContinuousLogTrack
    implements CustomGroupImplementationWithSettings<ContinuousTrackSettings, TrackSettingTypes>
{
    settings = continuousTrackSettings;

    getDefaultSettingsValues(): TrackSettingTypes {
        return {
            [Setting.TRACK_WIDTH]: 3,
            [Setting.SCALE]: "linear",
        };
    }

    getDefaultName(): string {
        return "Continuous track";
    }
}

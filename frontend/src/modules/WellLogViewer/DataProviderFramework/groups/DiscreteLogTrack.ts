import React from "react";

import { WellLogCurveTypeEnum_api } from "@api";
import type { CustomGroupImplementationWithSettings } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customGroupImplementation";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { TrackIcon } from "@modules/WellLogViewer/_shared/components/icons";

import { baseSettings } from "./_shared";

const discreteTrackSettings = [...baseSettings] as const;
export type DiscreteTrackSettings = typeof discreteTrackSettings;
type TrackSettingTypes = MakeSettingTypesMap<DiscreteTrackSettings>;

export class DiscreteLogTrack
    implements CustomGroupImplementationWithSettings<DiscreteTrackSettings, TrackSettingTypes>
{
    settings = discreteTrackSettings;

    getDefaultSettingsValues(): TrackSettingTypes {
        return {
            [Setting.TRACK_WIDTH]: 3,
        };
    }

    getDefaultName(): string {
        return "Discrete track";
    }

    getIcon(): React.ReactNode {
        return React.createElement(TrackIcon, { type: WellLogCurveTypeEnum_api.DISCRETE });
    }
}

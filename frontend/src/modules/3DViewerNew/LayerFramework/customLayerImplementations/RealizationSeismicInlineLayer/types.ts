import { SeismicCubeMeta_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type RealizationSeismicInlineSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.ATTRIBUTE]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
    [SettingType.SEISMIC_INLINE]: number | null;
};

export type RealizationSeismicInlineSliceStoredData = {
    seismicCubeMeta: SeismicCubeMeta_api[];
};

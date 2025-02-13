import { SeismicCubeMeta_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type RealizationSeismicCrosslineSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.ATTRIBUTE]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
    [SettingType.SEISMIC_CROSSLINE]: number | null;
};

export type RealizationSeismicCrosslineStoredData = {
    seismicCubeMeta: SeismicCubeMeta_api[];
};

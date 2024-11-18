import { WellboreHeader_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SettingType } from "@modules/2DViewer/layers/implementations/settings/settingsTypes";

export type DrilledWellTrajectoriesSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.SMDA_WELLBORE_HEADERS]: WellboreHeader_api[] | null;
};

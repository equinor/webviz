import type { WellboreHeader_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type DrilledWellTrajectoriesSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.SMDA_WELLBORE_HEADERS]: WellboreHeader_api[] | null;
};

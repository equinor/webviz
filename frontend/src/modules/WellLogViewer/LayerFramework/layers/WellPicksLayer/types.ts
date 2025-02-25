import { WellborePick_api } from "@api";
import { transformFormationData } from "@equinor/esv-intersection";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

// ! esv-intersection doesn't export this, so need derive it like this
// unused for now, miiiight use later
export type PairedUnitPick = ReturnType<typeof transformFormationData>["unitPicks"][0];

export type WellPicksLayerSettings = {
    [SettingType.STRAT_COLUMN]: string | null;
    [SettingType.SMDA_INTERPRETER]: string | null;
    [SettingType.WELL_PICKS]: WellborePick_api[] | null;
};

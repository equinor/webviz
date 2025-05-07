import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedColorByAtom, validRealizationNumbersAtom } from "./settings/atoms/baseAtoms";
import { selectedVisualizationTypeAtom } from "./settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentAtom,
    selectedRelPermCurveNamesAtom,
    selectedRelPermSaturationAxisAtom,
    selectedRelPermTableNameAtom,
    selectedSatNumsAtom,
} from "./settings/atoms/derivedAtoms";
import { ColorBy, VisualizationType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    ensembleIdent: RegularEnsembleIdent | null;
    realizationNumbers: number[] | null;
    tableName: string | null;
    saturationAxis: string | null;
    satNums: number[];
    relPermCurveNames: string[] | null;
    colorBy: ColorBy;
    visualizationType: VisualizationType;
};
export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    ensembleIdent: (get) => {
        return get(selectedEnsembleIdentAtom);
    },
    realizationNumbers: (get) => {
        return get(validRealizationNumbersAtom);
    },
    tableName: (get) => {
        return get(selectedRelPermTableNameAtom);
    },
    saturationAxis: (get) => {
        return get(selectedRelPermSaturationAxisAtom);
    },
    satNums: (get) => {
        return get(selectedSatNumsAtom);
    },
    relPermCurveNames: (get) => {
        return get(selectedRelPermCurveNamesAtom);
    },
    colorBy: (get) => {
        return get(selectedColorByAtom);
    },
    visualizationType: (get) => {
        return get(selectedVisualizationTypeAtom);
    },
};

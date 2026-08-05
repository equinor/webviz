import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    userSelectedComparisonEnsembleIdentAtom,
    userSelectedReferenceEnsembleIdentAtom,
} from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    isEnsemblePairValidAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNameAtom,
    selectedSubplotByAtom,
    selectedTableNameAtom,
    waterfallFactorSpecAtom,
} from "./settings/atoms/derivedAtoms";
import type { WaterfallFactorSpec } from "./view/utils/computeVolumeChangeDecomposition";

export type SettingsToViewInterface = {
    referenceEnsembleIdent: RegularEnsembleIdent | null;
    comparisonEnsembleIdent: RegularEnsembleIdent | null;
    tableName: string | null;
    resultName: string | null;
    subplotBy: string | null;
    indicesWithValues: InplaceVolumesIndexWithValues_api[];
    waterfallFactorSpec: WaterfallFactorSpec | null;
    isEnsemblePairValid: boolean;
    areSelectedTablesComparable: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    referenceEnsembleIdent: (get) => get(userSelectedReferenceEnsembleIdentAtom),
    comparisonEnsembleIdent: (get) => get(userSelectedComparisonEnsembleIdentAtom),
    tableName: (get) => get(selectedTableNameAtom),
    resultName: (get) => get(selectedResultNameAtom),
    subplotBy: (get) => get(selectedSubplotByAtom),
    indicesWithValues: (get) => get(selectedIndicesWithValuesAtom),
    waterfallFactorSpec: (get) => get(waterfallFactorSpecAtom),
    isEnsemblePairValid: (get) => get(isEnsemblePairValidAtom),
    areSelectedTablesComparable: (get) => get(areSelectedTablesComparableAtom),
};

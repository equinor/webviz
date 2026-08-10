import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    userSelectedComparisonEnsembleIdentAtom,
    userSelectedReferenceEnsembleIdentAtom,
} from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    selectedComparisonTableNameAtom,
    selectedIndicesWithValuesAtom,
    selectedReferenceTableNameAtom,
    selectedResultNameAtom,
    selectedSubplotByAtom,
    waterfallFactorSpecAtom,
} from "./settings/atoms/derivedAtoms";
import type { WaterfallFactorSpec } from "./view/utils/computeVolumeChangeDecomposition";

export type SettingsToViewInterface = {
    referenceEnsembleIdent: RegularEnsembleIdent | null;
    comparisonEnsembleIdent: RegularEnsembleIdent | null;
    referenceTableName: string | null;
    comparisonTableName: string | null;
    resultName: string | null;
    subplotBy: string | null;
    indicesWithValues: InplaceVolumesIndexWithValues_api[];
    waterfallFactorSpec: WaterfallFactorSpec | null;
    areSourcesDistinct: boolean;
    areSelectedTablesComparable: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    referenceEnsembleIdent: (get) => get(userSelectedReferenceEnsembleIdentAtom),
    comparisonEnsembleIdent: (get) => get(userSelectedComparisonEnsembleIdentAtom),
    referenceTableName: (get) => get(selectedReferenceTableNameAtom),
    comparisonTableName: (get) => get(selectedComparisonTableNameAtom),
    resultName: (get) => get(selectedResultNameAtom),
    subplotBy: (get) => get(selectedSubplotByAtom),
    indicesWithValues: (get) => get(selectedIndicesWithValuesAtom),
    waterfallFactorSpec: (get) => get(waterfallFactorSpecAtom),
    areSourcesDistinct: (get) => get(areSourcesDistinctAtom),
    areSelectedTablesComparable: (get) => get(areSelectedTablesComparableAtom),
};

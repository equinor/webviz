import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    indicesWithValuesForQueryAtom,
    waterfallFactorSpecAtom,
} from "./settings/atoms/derivedAtoms";
import {
    selectedComparisonEnsembleIdentAtom,
    selectedComparisonTableNameAtom,
    selectedReferenceEnsembleIdentAtom,
    selectedReferenceTableNameAtom,
    selectedResultNameAtom,
    selectedSubplotByAtom,
} from "./settings/atoms/persistableFixableAtoms";
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
    referenceEnsembleIdent: (get) => get(selectedReferenceEnsembleIdentAtom).value,
    comparisonEnsembleIdent: (get) => get(selectedComparisonEnsembleIdentAtom).value,
    referenceTableName: (get) => get(selectedReferenceTableNameAtom).value,
    comparisonTableName: (get) => get(selectedComparisonTableNameAtom).value,
    resultName: (get) => get(selectedResultNameAtom).value,
    subplotBy: (get) => get(selectedSubplotByAtom).value,
    indicesWithValues: (get) => get(indicesWithValuesForQueryAtom),
    waterfallFactorSpec: (get) => get(waterfallFactorSpecAtom),
    areSourcesDistinct: (get) => get(areSourcesDistinctAtom),
    areSelectedTablesComparable: (get) => get(areSelectedTablesComparableAtom),
};

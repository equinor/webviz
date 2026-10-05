import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { showTableAtom } from "./settings/atoms/baseAtoms";
import {
    areSelectedIndicesWithValuesValidAtom,
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    indexColumnsLeftUnfilteredAtom,
    indexColumnsWithNoSelectedValuesAtom,
    indicesWithValuesForQueryAtom,
    isIndexValueIntersectionActiveAtom,
    waterfallFactorSpecAtom,
    waterfallSourcesAtom,
} from "./settings/atoms/derivedAtoms";
import {
    selectedReferenceEnsembleIdentAtom,
    selectedComparisonEnsembleIdentAtom,
    selectedResultNameAtom,
    selectedSubplotByAtom,
} from "./settings/atoms/persistableFixableAtoms";
import type { WaterfallFactorSpec } from "./view/utils/computeVolumeChangeDecomposition";
import type { WaterfallSource } from "./view/utils/waterfallSources";

export type SettingsToViewInterface = {
    referenceEnsembleIdent: RegularEnsembleIdent | null;
    comparisonEnsembleIdent: RegularEnsembleIdent | null;
    waterfallSources: { reference: WaterfallSource; comparison: WaterfallSource } | null;
    resultName: string | null;
    subplotBy: string | null;
    indicesWithValues: InplaceVolumesIndexWithValues_api[];
    /** Index columns the sources disagree on that are compared unfiltered rather than intersected. */
    indexColumnsLeftUnfiltered: string[];
    /** True when the compared volumes are restricted to the index values shared by both sources. */
    isIndexValueIntersectionActive: boolean;
    /** Index filters with no selected value, which would exclude every row. */
    indexColumnsWithNoSelectedValues: string[];
    waterfallFactorSpec: WaterfallFactorSpec | null;
    areSourcesDistinct: boolean;
    areSelectedTablesComparable: boolean;
    /** False for a persisted/template index-value selection that is invalid in the current context. */
    areSelectedIndicesWithValuesValid: boolean;
    showTable: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    referenceEnsembleIdent: (get) => get(selectedReferenceEnsembleIdentAtom).value,
    comparisonEnsembleIdent: (get) => get(selectedComparisonEnsembleIdentAtom).value,
    waterfallSources: (get) => get(waterfallSourcesAtom),
    resultName: (get) => get(selectedResultNameAtom).value,
    subplotBy: (get) => get(selectedSubplotByAtom).value,
    indicesWithValues: (get) => get(indicesWithValuesForQueryAtom),
    indexColumnsLeftUnfiltered: (get) => get(indexColumnsLeftUnfilteredAtom),
    isIndexValueIntersectionActive: (get) => get(isIndexValueIntersectionActiveAtom),
    indexColumnsWithNoSelectedValues: (get) => get(indexColumnsWithNoSelectedValuesAtom),
    waterfallFactorSpec: (get) => get(waterfallFactorSpecAtom),
    areSourcesDistinct: (get) => get(areSourcesDistinctAtom),
    areSelectedTablesComparable: (get) => get(areSelectedTablesComparableAtom),
    areSelectedIndicesWithValuesValid: (get) => get(areSelectedIndicesWithValuesValidAtom),
    showTable: (get) => get(showTableAtom),
};

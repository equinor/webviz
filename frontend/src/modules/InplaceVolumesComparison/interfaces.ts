import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { showTableAtom } from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    indexColumnsLeftUnfilteredAtom,
    indexColumnsWithNoSelectedValuesAtom,
    indicesWithValuesForQueryAtom,
    isIndexValueIntersectionActiveAtom,
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
    /** Index columns the sources disagree on that are compared unfiltered rather than intersected. */
    indexColumnsLeftUnfiltered: string[];
    /** True when the compared volumes are restricted to the index values shared by both sources. */
    isIndexValueIntersectionActive: boolean;
    /** Index filters with no selected value, which would exclude every row. */
    indexColumnsWithNoSelectedValues: string[];
    waterfallFactorSpec: WaterfallFactorSpec | null;
    areSourcesDistinct: boolean;
    areSelectedTablesComparable: boolean;
    showTable: boolean;
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
    indexColumnsLeftUnfiltered: (get) => get(indexColumnsLeftUnfilteredAtom),
    isIndexValueIntersectionActive: (get) => get(isIndexValueIntersectionActiveAtom),
    indexColumnsWithNoSelectedValues: (get) => get(indexColumnsWithNoSelectedValuesAtom),
    waterfallFactorSpec: (get) => get(waterfallFactorSpecAtom),
    areSourcesDistinct: (get) => get(areSourcesDistinctAtom),
    areSelectedTablesComparable: (get) => get(areSelectedTablesComparableAtom),
    showTable: (get) => get(showTableAtom),
};

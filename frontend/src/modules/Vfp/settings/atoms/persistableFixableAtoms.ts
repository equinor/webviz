import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { areEnsembleIdentsEqual } from "@framework/utils/ensembleIdentUtils";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { VfpParam } from "@modules/Vfp/types";
import { isProdTable } from "@modules/Vfp/utils/vfpTableClassifier";

import { availableRealizationNumbersAtom, availableVfpTableNamesAtom } from "./derivedAtoms";
import { vfpTableNamesQueryAtom, vfpTableQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    areEqualFunction: areEnsembleIdentsEqual,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return value !== null && ensembleSet.hasEnsemble(value);
    },
    fixupFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return fixupRegularEnsembleIdent(value ?? null, ensembleSet);
    },
});

export const selectedRealizationNumberAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const availableRealizations = get(availableRealizationNumbersAtom);
        if (value === null) {
            return availableRealizations.length === 0;
        }
        return availableRealizations.includes(value);
    },
    fixupFunction: ({ get, value }) => {
        const availableRealizations = get(availableRealizationNumbersAtom);
        if (value === null || value === undefined) {
            return availableRealizations[0] ?? null;
        }

        // When value is invalid number, enforce user to reselect
        return null;
    },
});

export const selectedVfpTableNameAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    computeDependenciesState: ({ get }) => {
        const vfpTableNamesQuery = get(vfpTableNamesQueryAtom);

        if (vfpTableNamesQuery.isError) {
            return "error";
        }
        if (vfpTableNamesQuery.isFetching) {
            return "loading";
        }

        return !vfpTableNamesQuery.data ? "error" : "loaded";
    },
    isValidFunction: ({ get, value }) => {
        const availableVfpTableNames = get(availableVfpTableNamesAtom);
        if (!value) {
            return availableVfpTableNames.length === 0;
        }
        return availableVfpTableNames.includes(value);
    },
    fixupFunction: ({ get, value }) => {
        const availableVfpTableNames = get(availableVfpTableNamesAtom);
        if (!value) {
            return availableVfpTableNames[0] ?? null;
        }

        // When value is invalid string, enforce user to reselect
        return null;
    },
});

export const selectedThpIndicesAtom = persistableFixableAtom<number[] | null, number[]>({
    initialValue: null,
    computeDependenciesState: computeVfpTableQueryDependenciesState,
    precomputeFunction: ({ get }) => {
        return get(vfpTableQueryAtom).data?.thpValues ?? [];
    },
    isValidFunction: ({ value, precomputedValue: thpValues }) => {
        if (!value) {
            return thpValues.length === 0;
        }
        return value.every((index) => index < thpValues.length);
    },
    fixupFunction: ({ value, precomputedValue: thpValues }) => {
        if (!value) {
            return thpValues.length > 0 ? [0] : null;
        }

        // Get only valid indices
        return value.filter((index) => index < thpValues.length);
    },
});

export const selectedWfrIndicesAtom = persistableFixableAtom<number[] | null, number[]>({
    initialValue: null,
    computeDependenciesState: computeVfpTableQueryDependenciesState,
    precomputeFunction: ({ get }) => {
        const vfpTable = get(vfpTableQueryAtom).data;
        if (!vfpTable || !isProdTable(vfpTable)) {
            return [];
        }
        return vfpTable.wfrValues ?? [];
    },
    isValidFunction: ({ value, precomputedValue: wfrValues }) => {
        if (!value) {
            return wfrValues.length === 0;
        }
        return value.every((index) => index < wfrValues.length);
    },
    fixupFunction: ({ value, precomputedValue: wfrValues }) => {
        if (!value) {
            return wfrValues.length > 0 ? [0] : null;
        }

        // Get only valid indices
        return value.filter((index) => index < wfrValues.length);
    },
});

export const selectedGfrIndicesAtom = persistableFixableAtom<number[] | null, number[]>({
    initialValue: null,
    computeDependenciesState: computeVfpTableQueryDependenciesState,
    precomputeFunction: ({ get }) => {
        const vfpTable = get(vfpTableQueryAtom).data;
        if (!vfpTable || !isProdTable(vfpTable)) {
            return [];
        }
        return vfpTable.gfrValues ?? [];
    },
    isValidFunction: ({ value, precomputedValue: gfrValues }) => {
        if (!value) {
            return gfrValues.length === 0;
        }
        return value.every((index) => index < gfrValues.length);
    },
    fixupFunction: ({ value, precomputedValue: gfrValues }) => {
        if (!value) {
            return gfrValues.length > 0 ? [0] : null;
        }

        // Get only valid indices
        return value.filter((index) => index < gfrValues.length);
    },
});

export const selectedAlqIndicesAtom = persistableFixableAtom<number[] | null, number[]>({
    initialValue: null,
    computeDependenciesState: computeVfpTableQueryDependenciesState,
    precomputeFunction: ({ get }) => {
        const vfpTable = get(vfpTableQueryAtom).data;
        if (!vfpTable || !isProdTable(vfpTable)) {
            return [];
        }
        return vfpTable.alqValues;
    },
    isValidFunction: ({ value, precomputedValue: alqValues }) => {
        if (!value) {
            return alqValues.length === 0;
        }
        return value.every((index) => index < alqValues.length);
    },
    fixupFunction: ({ value, precomputedValue: alqValues }) => {
        if (!value) {
            return alqValues.length > 0 ? [0] : null;
        }

        // Get only valid indices
        return value.filter((index) => index < alqValues.length);
    },
});

export const selectedColorByAtom = persistableFixableAtom<VfpParam>({
    initialValue: VfpParam.THP,
    computeDependenciesState: computeVfpTableQueryDependenciesState,
    isValidFunction: ({ get, value }) => {
        const vfpTable = get(vfpTableQueryAtom).data;

        // Cleanup value if no vfpTable is loaded, value is null, or value is invalid for non-prod table
        if (!vfpTable || !value || (!isProdTable(vfpTable) && ["WFR", "GFR", "ALQ"].includes(value))) {
            return value === VfpParam.THP;
        }

        return Object.values(VfpParam).includes(value);
    },
    fixupFunction: ({ get, value }) => {
        const vfpTable = get(vfpTableQueryAtom).data;

        // Cleanup value if no vfpTable is loaded, value is null, or value is invalid for non-prod table
        if (!vfpTable || !value || (!isProdTable(vfpTable) && ["WFR", "GFR", "ALQ"].includes(value))) {
            return VfpParam.THP;
        }

        return value;
    },
});

// Utility function to compute dependencies state from vfpTableQueryAtom
function computeVfpTableQueryDependenciesState({ get }: { get: (atom: any) => any }): "error" | "loading" | "loaded" {
    const vfpTableQuery = get(vfpTableQueryAtom);

    if (vfpTableQuery.isError) {
        return "error";
    }
    if (vfpTableQuery.isFetching) {
        return "loading";
    }
    return !vfpTableQuery.data ? "error" : "loaded";
}

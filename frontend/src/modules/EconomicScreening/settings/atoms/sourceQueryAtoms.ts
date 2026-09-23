import { atom } from "jotai";

import { Frequency_api, getDeltaEnsembleRealizationsVectorDataOptions, getRealizationsVectorDataOptions } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom, ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import {
    GAS_CONSUMPTION_VECTOR,
    GAS_INJECTION_VECTOR,
    GAS_PRODUCTION_VECTOR,
    OIL_PRODUCTION_VECTOR,
    SALES_GAS_VECTOR,
} from "@modules/EconomicScreening/utils/vectorResolution";

import { hasOilProductionVectorAtom, isSelectedEnsembleDeltaAtom, salesGasStrategyAtom } from "./derivedAtoms";
import { selectedEnsembleIdentAtom } from "./persistableFixableAtoms";

/** Fixed positions of the vectors in `vectorDataQueriesAtom`. */
export const VectorQueryIndex = {
    OIL_PRODUCTION: 0,
    SALES_GAS: 1,
    GAS_PRODUCTION: 2,
    GAS_INJECTION: 3,
    GAS_CONSUMPTION: 4,
} as const;

const VECTOR_NAMES_IN_QUERY_ORDER = [
    OIL_PRODUCTION_VECTOR,
    SALES_GAS_VECTOR,
    GAS_PRODUCTION_VECTOR,
    GAS_INJECTION_VECTOR,
    GAS_CONSUMPTION_VECTOR,
];

/** Realizations of the selected ensemble that pass the current realization filter. */
export const validRealizationNumbersAtom = atom<number[] | null>((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom).value;
    if (!ensembleIdent) {
        return null;
    }
    return [...get(ValidEnsembleRealizationsFunctionAtom)(ensembleIdent)];
});

const encodedRealizationsAtom = atom<string | null>((get) => {
    const validRealizationNumbers = get(validRealizationNumbersAtom);
    return validRealizationNumbers ? encodeAsUintListStr(validRealizationNumbers) : null;
});

export function getAllEnsembleRealizationNumbers(
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null,
    ensembleSet: EnsembleSet,
): number[] | null {
    return ensembleIdent ? [...(ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [])] : null;
}

const allEnsembleRealizationNumbersAtom = atom<number[] | null>((get) => {
    return getAllEnsembleRealizationNumbers(get(selectedEnsembleIdentAtom).value, get(EnsembleSetAtom));
});

const encodedAllEnsembleRealizationsAtom = atom<string | null>((get) => {
    const realizationNumbers = get(allEnsembleRealizationNumbersAtom);
    return realizationNumbers ? encodeAsUintListStr(realizationNumbers) : null;
});

/** Per-vector enabled flags, following `VectorQueryIndex` order. */
export const isVectorNeededAtom = atom<boolean[]>((get) => {
    const salesGasStrategy = get(salesGasStrategyAtom);
    return [
        get(hasOilProductionVectorAtom),
        salesGasStrategy.kind === "DIRECT",
        salesGasStrategy.kind === "DERIVED",
        salesGasStrategy.kind === "DERIVED" && salesGasStrategy.hasGasInjection,
        (salesGasStrategy.kind === "DIRECT" || salesGasStrategy.kind === "DERIVED") &&
            salesGasStrategy.hasGasConsumption,
    ];
});

/**
 * Monthly native cumulative totals with source coverage, for the full ensemble so that the evaluation
 * horizon and cost years do not move with realization filtering; filtering is applied afterwards.
 */
const regularEnsembleVectorDataQueriesAtom = atomWithQueries((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom).value;
    const regularEnsembleIdent =
        ensembleIdent && isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent) ? ensembleIdent : null;
    const realizationsEncodedAsUintListStr = get(encodedAllEnsembleRealizationsAtom);
    const isVectorNeeded = get(isVectorNeededAtom);

    const queries = VECTOR_NAMES_IN_QUERY_ORDER.map((vectorName, index) => {
        const options = getRealizationsVectorDataOptions({
            query: {
                case_uuid: regularEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: regularEnsembleIdent?.getEnsembleName() ?? "",
                vector_name: vectorName,
                resampling_frequency: Frequency_api.MONTHLY,
                include_source_coverage: true,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(regularEnsembleIdent),
            },
        });

        return () => ({ ...options, enabled: Boolean(regularEnsembleIdent) && isVectorNeeded[index] });
    });

    return { queries };
});

const deltaEnsembleVectorDataQueriesAtom = atomWithQueries((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom).value;
    const deltaEnsembleIdent =
        ensembleIdent && isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent) ? ensembleIdent : null;
    const comparisonEnsembleIdent = deltaEnsembleIdent?.getComparisonEnsembleIdent() ?? null;
    const referenceEnsembleIdent = deltaEnsembleIdent?.getReferenceEnsembleIdent() ?? null;
    const realizationsEncodedAsUintListStr = get(encodedAllEnsembleRealizationsAtom);
    const isVectorNeeded = get(isVectorNeededAtom);

    const queries = VECTOR_NAMES_IN_QUERY_ORDER.map((vectorName, index) => {
        const options = getDeltaEnsembleRealizationsVectorDataOptions({
            query: {
                comparison_case_uuid: comparisonEnsembleIdent?.getCaseUuid() ?? "",
                comparison_ensemble_name: comparisonEnsembleIdent?.getEnsembleName() ?? "",
                reference_case_uuid: referenceEnsembleIdent?.getCaseUuid() ?? "",
                reference_ensemble_name: referenceEnsembleIdent?.getEnsembleName() ?? "",
                vector_name: vectorName,
                resampling_frequency: Frequency_api.MONTHLY,
                include_source_coverage: true,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(comparisonEnsembleIdent, referenceEnsembleIdent),
            },
        });

        return () => ({ ...options, enabled: Boolean(deltaEnsembleIdent) && isVectorNeeded[index] });
    });

    return { queries };
});

/** Delta FGCT is differenced server-side; fetch constituent FGCT separately for diagnostics only. */
export const deltaConstituentGasConsumptionQueriesAtom = atomWithQueries((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom).value;
    const deltaEnsembleIdent =
        ensembleIdent && isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent) ? ensembleIdent : null;
    const constituents = deltaEnsembleIdent
        ? [deltaEnsembleIdent.getComparisonEnsembleIdent(), deltaEnsembleIdent.getReferenceEnsembleIdent()]
        : [];
    const realizationsEncodedAsUintListStr = get(encodedRealizationsAtom);

    const queries = constituents.map((constituent) => {
        const options = getRealizationsVectorDataOptions({
            query: {
                case_uuid: constituent.getCaseUuid(),
                ensemble_name: constituent.getEnsembleName(),
                vector_name: GAS_CONSUMPTION_VECTOR,
                resampling_frequency: Frequency_api.YEARLY,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(constituent),
            },
        });
        return () => ({ ...options, enabled: true });
    });

    return { queries };
});

export const vectorDataQueriesAtom = atom((get) => {
    return get(isSelectedEnsembleDeltaAtom)
        ? get(deltaEnsembleVectorDataQueriesAtom)
        : get(regularEnsembleVectorDataQueriesAtom);
});

import { atom } from "jotai";

import { Frequency_api, getDeltaEnsembleRealizationsVectorDataOptions, getRealizationsVectorDataOptions } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
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

import { ensembleIdentAtom, salesGasStrategyAtom } from "./baseAtoms";

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

export const validRealizationNumbersAtom = atom<number[] | null>((get) => {
    const ensembleIdent = get(ensembleIdentAtom);
    if (!ensembleIdent) {
        return null;
    }
    return [...get(ValidEnsembleRealizationsFunctionAtom)(ensembleIdent)];
});

const isDeltaEnsembleAtom = atom<boolean>((get) => {
    const ensembleIdent = get(ensembleIdentAtom);
    return ensembleIdent !== null && isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent);
});

const encodedRealizationsAtom = atom<string | null>((get) => {
    const validRealizationNumbers = get(validRealizationNumbersAtom);
    return validRealizationNumbers ? encodeAsUintListStr(validRealizationNumbers) : null;
});

/** Per-vector enabled flags, following `VectorQueryIndex` order. */
const isVectorNeededAtom = atom<boolean[]>((get) => {
    const salesGasStrategy = get(salesGasStrategyAtom);
    return [
        true,
        salesGasStrategy.kind === "DIRECT",
        salesGasStrategy.kind === "DERIVED",
        salesGasStrategy.kind === "DERIVED" && salesGasStrategy.hasGasInjection,
        salesGasStrategy.kind === "DERIVED" && salesGasStrategy.hasGasConsumption,
    ];
});

const regularEnsembleVectorDataQueriesAtom = atomWithQueries((get) => {
    const ensembleIdent = get(ensembleIdentAtom);
    const regularEnsembleIdent =
        ensembleIdent && isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent) ? ensembleIdent : null;
    const realizationsEncodedAsUintListStr = get(encodedRealizationsAtom);
    const isVectorNeeded = get(isVectorNeededAtom);

    const queries = VECTOR_NAMES_IN_QUERY_ORDER.map((vectorName, index) => {
        const options = getRealizationsVectorDataOptions({
            query: {
                case_uuid: regularEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: regularEnsembleIdent?.getEnsembleName() ?? "",
                vector_name: vectorName,
                resampling_frequency: Frequency_api.YEARLY,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(regularEnsembleIdent),
            },
        });

        return () => ({ ...options, enabled: Boolean(regularEnsembleIdent) && isVectorNeeded[index] });
    });

    return { queries };
});

const deltaEnsembleVectorDataQueriesAtom = atomWithQueries((get) => {
    const ensembleIdent = get(ensembleIdentAtom);
    const deltaEnsembleIdent =
        ensembleIdent && isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent) ? ensembleIdent : null;
    const comparisonEnsembleIdent = deltaEnsembleIdent?.getComparisonEnsembleIdent() ?? null;
    const referenceEnsembleIdent = deltaEnsembleIdent?.getReferenceEnsembleIdent() ?? null;
    const realizationsEncodedAsUintListStr = get(encodedRealizationsAtom);
    const isVectorNeeded = get(isVectorNeededAtom);

    const queries = VECTOR_NAMES_IN_QUERY_ORDER.map((vectorName, index) => {
        const options = getDeltaEnsembleRealizationsVectorDataOptions({
            query: {
                comparison_case_uuid: comparisonEnsembleIdent?.getCaseUuid() ?? "",
                comparison_ensemble_name: comparisonEnsembleIdent?.getEnsembleName() ?? "",
                reference_case_uuid: referenceEnsembleIdent?.getCaseUuid() ?? "",
                reference_ensemble_name: referenceEnsembleIdent?.getEnsembleName() ?? "",
                vector_name: vectorName,
                resampling_frequency: Frequency_api.YEARLY,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(comparisonEnsembleIdent, referenceEnsembleIdent),
            },
        });

        return () => ({ ...options, enabled: Boolean(deltaEnsembleIdent) && isVectorNeeded[index] });
    });

    return { queries };
});

export const vectorDataQueriesAtom = atom((get) => {
    return get(isDeltaEnsembleAtom)
        ? get(deltaEnsembleVectorDataQueriesAtom)
        : get(regularEnsembleVectorDataQueriesAtom);
});

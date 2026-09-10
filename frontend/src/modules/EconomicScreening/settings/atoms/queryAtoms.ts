import { atomWithQuery } from "jotai-tanstack-query";

import { getDeltaEnsembleVectorListOptions, getVectorListOptions } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedEnsembleIdentAtom } from "./persistableFixableAtoms";

export const regularEnsembleVectorListQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const regularEnsembleIdent =
        selectedEnsembleIdent && isEnsembleIdentOfType(selectedEnsembleIdent, RegularEnsembleIdent)
            ? selectedEnsembleIdent
            : null;

    return {
        ...getVectorListOptions({
            query: {
                case_uuid: regularEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: regularEnsembleIdent?.getEnsembleName() ?? "",
                ...makeCacheBustingQueryParam(regularEnsembleIdent),
            },
        }),
        enabled: Boolean(regularEnsembleIdent),
    };
});

export const deltaEnsembleVectorListQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const deltaEnsembleIdent =
        selectedEnsembleIdent && isEnsembleIdentOfType(selectedEnsembleIdent, DeltaEnsembleIdent)
            ? selectedEnsembleIdent
            : null;
    const comparisonEnsembleIdent = deltaEnsembleIdent?.getComparisonEnsembleIdent() ?? null;
    const referenceEnsembleIdent = deltaEnsembleIdent?.getReferenceEnsembleIdent() ?? null;

    return {
        ...getDeltaEnsembleVectorListOptions({
            query: {
                comparison_case_uuid: comparisonEnsembleIdent?.getCaseUuid() ?? "",
                comparison_ensemble_name: comparisonEnsembleIdent?.getEnsembleName() ?? "",
                reference_case_uuid: referenceEnsembleIdent?.getCaseUuid() ?? "",
                reference_ensemble_name: referenceEnsembleIdent?.getEnsembleName() ?? "",
                include_derived_vectors: false,
                ...makeCacheBustingQueryParam(comparisonEnsembleIdent, referenceEnsembleIdent),
            },
        }),
        enabled: Boolean(deltaEnsembleIdent),
    };
});

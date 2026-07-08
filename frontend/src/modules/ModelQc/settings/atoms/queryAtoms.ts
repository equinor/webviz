import { atomWithQuery } from "jotai-tanstack-query";

import { getGridModelsInfoOptions } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { referenceRealizationAtom, selectedEnsembleIdentValueAtom } from "./derivedAtoms";

export const gridModelsInfoQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentValueAtom);
    const referenceRealization = get(referenceRealizationAtom);

    const caseUuid = selectedEnsembleIdent?.getCaseUuid();
    const ensembleName = selectedEnsembleIdent?.getEnsembleName();

    return {
        ...getGridModelsInfoOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
                realization_num: referenceRealization,
                ...makeCacheBustingQueryParam(selectedEnsembleIdent),
            },
        }),
        enabled: Boolean(caseUuid && ensembleName),
    };
});

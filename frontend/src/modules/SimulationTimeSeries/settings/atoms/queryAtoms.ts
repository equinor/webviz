import { apiService } from "@framework/ApiService";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";

import { atom } from "jotai";

import { selectedEnsembleIdentsAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const regularEnsembleVectorListQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const regularEnsembleIdents = filterEnsembleIdentsByType(selectedEnsembleIdents, EnsembleIdent);

    const queries = regularEnsembleIdents.map((ensembleIdent) => {
        return () => ({
            queryKey: ["ensembles", ensembleIdent.toString()],
            queryFn: () =>
                apiService.timeseries.getVectorList(ensembleIdent.getCaseUuid(), ensembleIdent.getEnsembleName()),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
    });

    return {
        queries,
    };
});

export const deltaEnsembleVectorListQueriesAtom = atomWithQueries((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const deltaEnsembleIdents = filterEnsembleIdentsByType(selectedEnsembleIdents, DeltaEnsembleIdent);

    const deltaEnsembleIdentStringAndEnsembleObject: { [key: string]: DeltaEnsemble } = {};
    for (const ensembleIdent of deltaEnsembleIdents) {
        const deltaEnsemble = ensembleSet.findEnsemble(ensembleIdent);
        if (deltaEnsemble) {
            deltaEnsembleIdentStringAndEnsembleObject[ensembleIdent.toString()] = deltaEnsemble;
        }
    }

    const queries = Object.entries(deltaEnsembleIdentStringAndEnsembleObject).map((elm) => {
        const deltaEnsembleIdentString = elm[0];
        const deltaEnsemble = elm[1];
        const compareEnsembleIdent = deltaEnsemble.getCompareEnsembleIdent();
        const referenceEnsembleIdent = deltaEnsemble.getReferenceEnsembleIdent();

        return () => ({
            queryKey: ["ensembles", deltaEnsembleIdentString],
            queryFn: () =>
                apiService.timeseries.getDeltaEnsembleVectorList(
                    compareEnsembleIdent.getCaseUuid(),
                    compareEnsembleIdent.getEnsembleName(),
                    referenceEnsembleIdent.getCaseUuid(),
                    referenceEnsembleIdent.getEnsembleName()
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
    });

    return {
        queries,
    };
});

export const vectorListQueriesAtom = atom((get) => {
    const regularEnsembleVectorListQueries = get(regularEnsembleVectorListQueriesAtom);
    const deltaEnsembleVectorListQueries = get(deltaEnsembleVectorListQueriesAtom);

    const queries = [...regularEnsembleVectorListQueries, ...deltaEnsembleVectorListQueries];
    return queries;
});

import { getRftTableDefinitionOptions } from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedEnsembleIdentsAtom } from "./persistableFixableAtoms";

export const rftTableDefinitionQueriesAtom = atomWithQueries(function makeRftTableDefinitionQueryOptions(get) {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map(function makeRftTableDefinitionQuery(ensembleIdent) {
        const options = getRftTableDefinitionOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        return function getRftTableDefinitionQueryOptions() {
            return { ...options, enabled: ensembleIdentsValid };
        };
    });

    return { queries };
});


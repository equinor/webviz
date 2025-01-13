import { VectorDescription_api, getVectorListOptions } from "@api";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

export function useVectorListQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<Array<VectorDescription_api>> {
    return useQuery({
        ...getVectorListOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
            },
        }),
        enabled: Boolean(caseUuid && ensembleName),
    });
}

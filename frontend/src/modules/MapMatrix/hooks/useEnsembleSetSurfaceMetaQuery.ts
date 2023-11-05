import { SurfaceMeta_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;
type EnsembleSurfaceMetas = {
    ensembleIdent: EnsembleIdent;
    surfaceMetas?: SurfaceMeta_api[];
};
export type EnsembleSetSurfaceMetas = {
    data: EnsembleSurfaceMetas[];
    isFetching: boolean;
};
function intersectEnsembleSetSurfaceMetas(ensembleSurfaceMetas: EnsembleSurfaceMetas[]): EnsembleSurfaceMetas[] {
    if (!ensembleSurfaceMetas || ensembleSurfaceMetas.length === 0) {
        return [];
    }

    const surfaceMetaCountMap = new Map<string, number>();

    for (const ensembleSurfaceMeta of ensembleSurfaceMetas) {
        for (const surfaceMeta of ensembleSurfaceMeta.surfaceMetas ?? []) {
            const key = `${surfaceMeta.name}-${surfaceMeta.attribute_name}-${surfaceMeta.iso_date_or_interval}`;
            surfaceMetaCountMap.set(key, (surfaceMetaCountMap.get(key) ?? 0) + 1);
        }
    }

    const filteredSurfaceMetas = ensembleSurfaceMetas[0].surfaceMetas?.filter((surfaceMeta) => {
        const key = `${surfaceMeta.name}-${surfaceMeta.attribute_name}-${surfaceMeta.iso_date_or_interval}`;
        return surfaceMetaCountMap.get(key) === ensembleSurfaceMetas.length;
    });

    return ensembleSurfaceMetas
        .map((ensembleSurfaceMeta) => ({
            ensembleIdent: ensembleSurfaceMeta.ensembleIdent,
            surfaceMetas: filteredSurfaceMetas,
        }))
        .filter(
            (ensembleSurfaceMeta) => ensembleSurfaceMeta.surfaceMetas && ensembleSurfaceMeta.surfaceMetas.length > 0
        );
}

export function useEnsembleSetSurfaceMetaQuery(ensembleIdents: EnsembleIdent[]): EnsembleSetSurfaceMetas {
    return useQueries({
        queries: ensembleIdents.map((ensembleIdent) => ({
            queryKey: ["getSurfaceDirectory", ensembleIdent?.toString()],
            queryFn: () => {
                const caseUuid = ensembleIdent?.getCaseUuid();
                const ensembleName = ensembleIdent?.getEnsembleName();
                return apiService.surface.getSurfaceDirectory(caseUuid ?? "", ensembleName ?? "");
            },
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: Boolean(ensembleIdent),
        })),
        combine: (results: UseQueryResult<Array<SurfaceMeta_api>>[]) => ({
            data: intersectEnsembleSetSurfaceMetas(
                results.map((result, index) => ({
                    ensembleIdent: ensembleIdents[index],
                    surfaceMetas: result.data,
                }))
            ),
            isFetching: results.some((result) => result.isFetching),
        }),
    });
}

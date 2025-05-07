import type { RelPermTableInfo_api } from "@api";
import type { UseQueryResult } from "@tanstack/react-query";

/**
 * Helper class for working with ensembles and corresponding vector list query results
 *
 * Assuming that the order of ensembles and queries is the same
 */
export class relPermTablesInfoHelper {
    // private _ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
    private _queries: UseQueryResult<RelPermTableInfo_api>[];
    private _isFetching: boolean;
    constructor(
        // ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
        vectorListQueryResults: UseQueryResult<RelPermTableInfo_api>[],
    ) {
        // if (ensembleIdents.length !== vectorListQueryResults.length) {
        //     throw new Error("Number of ensembles and vector list query results must be equal");
        // }

        // this._ensembleIdents = ensembleIdents;
        this._queries = vectorListQueryResults;
        this._isFetching = vectorListQueryResults.some((query) => query.isFetching);
    }

    saturationNamesIntersection(): string[] {
        const saturationNames = this._queries.flatMap((query) => {
            return query.data ? query.data.saturation_axes.map((axis) => axis.saturation_name) : [];
        });

        return Array.from(new Set(saturationNames));
    }
    relPermCurveNamesIntersection(selectedSaturationAxis: string | null): string[] {
        if (!selectedSaturationAxis) {
            return [];
        }

        const curveNames = this._queries.flatMap((query) => {
            return query.data
                ? (query.data.saturation_axes.find((axis) => axis.saturation_name === selectedSaturationAxis)
                      ?.relperm_curve_names ?? [])
                : [];
        });

        return Array.from(new Set(curveNames));
    }

    satNumsIntersection(): number[] {
        const satNums = this._queries.flatMap((query) => {
            return query.data ? query.data.satnums : [];
        });

        return Array.from(new Set(satNums));
    }
}

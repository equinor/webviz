import type { RelPermTableInfo_api } from "@api";
import { CurveType } from "@modules/RelPerm/typesAndEnums";
import type { UseQueryResult } from "@tanstack/react-query";

/**
 * Helper class for working with ensembles and corresponding relperm info list query results

 */
export class relPermTablesInfoHelper {
    private _queries: UseQueryResult<RelPermTableInfo_api>[];
    private _curveType: CurveType;
    constructor(relPermTableInfoQueryList: UseQueryResult<RelPermTableInfo_api>[], curveType: CurveType) {
        this._queries = relPermTableInfoQueryList;
        this._curveType = curveType;
    }

    saturationNamesIntersection(): string[] {
        const saturationNames = this._queries.flatMap((query) => {
            return query.data ? query.data.saturation_axes.map((axis) => axis.saturation_name) : [];
        });

        return Array.from(new Set(saturationNames));
    }
    curveNamesForSaturationAxisIntersection(selectedSaturationAxis: string | null): string[] {
        if (!selectedSaturationAxis) {
            return [];
        }
        if (this._curveType === CurveType.RELPERM) {
            return this.relPermCurveNamesIntersection(selectedSaturationAxis);
        } else {
            return this.capPressureNamesIntersection(selectedSaturationAxis);
        }
    }

    satNumsIntersection(): number[] {
        const satNums = this._queries.flatMap((query) => {
            return query.data ? query.data.satnums : [];
        });

        return Array.from(new Set(satNums));
    }
    private relPermCurveNamesIntersection(selectedSaturationAxis: string | null): string[] {
        const curveNames = this._queries.flatMap((query) => {
            return query.data
                ? (query.data.saturation_axes.find((axis) => axis.saturation_name === selectedSaturationAxis)
                      ?.relperm_curve_names ?? [])
                : [];
        });

        return Array.from(new Set(curveNames));
    }

    private capPressureNamesIntersection(selectedSaturationAxis: string | null): string[] {
        const curveNames = this._queries.flatMap((query) => {
            return query.data
                ? (query.data.saturation_axes.find((axis) => axis.saturation_name === selectedSaturationAxis)
                      ?.capillary_pressure_curve_names ?? [])
                : [];
        });

        return Array.from(new Set(curveNames));
    }
}

import type { UseQueryResult } from "@tanstack/react-query";

import type { RelPermTableInfo_api } from "@api";
import { CurveType } from "@modules/RelPerm/typesAndEnums";

/**
 * Helper class for working with multiple RelPerm table info queries.
 * It provides methods to find intersections of saturation names, curve names, and saturation numbers across the queries.

 */
export class relPermTablesInfoHelper {
    private _queryResults: UseQueryResult<RelPermTableInfo_api>[];
    private _curveType: CurveType;
    constructor(relPermTableInfoQueryList: UseQueryResult<RelPermTableInfo_api>[], curveType: CurveType) {
        this._queryResults = relPermTableInfoQueryList;
        this._curveType = curveType;
    }

    saturationNamesIntersection(): string[] {
        const saturationNames = this._queryResults.flatMap((query) => {
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
        const satNums = this._queryResults.flatMap((query) => {
            return query.data ? query.data.satnums : [];
        });

        return Array.from(new Set(satNums));
    }
    private relPermCurveNamesIntersection(selectedSaturationAxis: string | null): string[] {
        const curveNames = this._queryResults.flatMap((query) => {
            return query.data
                ? (query.data.saturation_axes.find((axis) => axis.saturation_name === selectedSaturationAxis)
                      ?.relperm_curve_names ?? [])
                : [];
        });

        return Array.from(new Set(curveNames));
    }

    private capPressureNamesIntersection(selectedSaturationAxis: string | null): string[] {
        const curveNames = this._queryResults.flatMap((query) => {
            return query.data
                ? (query.data.saturation_axes.find((axis) => axis.saturation_name === selectedSaturationAxis)
                      ?.capillary_pressure_curve_names ?? [])
                : [];
        });

        return Array.from(new Set(curveNames));
    }
}

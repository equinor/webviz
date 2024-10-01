import { WellboreGeoData_api, WellboreLogCurveData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import { UseQueryResult, useQueries } from "@tanstack/react-query";
import { WellLogMetadataDiscrete } from "@webviz/well-log-viewer/dist/components/WellLogTypes";

import { DEFAULT_OPTIONS } from "./shared";

export function useLogCurveDataQueries(
    wellboreUuid: string,
    curveNames: string[]
): UseQueryResult<WellboreLogCurveData_api>[] {
    return useQueries({
        queries: curveNames.map((name) => ({
            queryKey: ["getLogCurveData", wellboreUuid, name],
            queryFn: () => apiService.well.getLogCurveData(wellboreUuid, name),
            enabled: Boolean(wellboreUuid && name),
            ...DEFAULT_OPTIONS,
        })),
    });
}

export function useGeologyCurveDataQueries(
    wellboreUuid: string,
    plotConfigs: TemplatePlotConfig[]
): UseQueryResult<WellboreGeoData_api[]>[] {
    // TODO: Catch non-unique names better. Only add project
    return useQueries({
        queries: plotConfigs.map(({ _sourceId, name }) => ({
            queryKey: ["getWellboreGeologyData", wellboreUuid, _sourceId],
            enabled: Boolean(wellboreUuid && plotConfigs),
            // ...DEFAULT_OPTIONS,
            // queryFn: () => apiService.well.getWellboreGeologyData(wellboreUuid, u),
            queryFn: async function fetchAndTransformGeolCurveData(): Promise<WellboreGeologyCurveData> {
                //! Assumes the entries are sorted on the backend
                const result = await apiService.well.getWellboreGeologyData(wellboreUuid, _sourceId as string);

                if (result.length === 1) throw new Error("No entries found for geological header");

                const dataPoints: WellboreGeologyCurveData["dataPoints"] = [];
                const discreteMetadata: WellLogMetadataDiscrete = {
                    attributes: ["color", "code"],
                    objects: {},
                };

                let indexMin = Number.MAX_VALUE;
                let indexMax = Number.MIN_VALUE;

                // ! Subsurface is a bit weird when drawing discrete curves; when selecting what to fill between two points, the *latter* point is used. Because of this, we build the datapoints entry with the BOTTOM values

                dataPoints.push([result[0].mdRange[0], null]);
                result.forEach((geoEntry) => {
                    if (geoEntry.mdRange[0] < indexMin) indexMin = geoEntry.mdRange[0];
                    if (geoEntry.mdRange[1] > indexMax) indexMax = geoEntry.mdRange[1];

                    dataPoints.push([geoEntry.mdRange[1], geoEntry.code]);

                    // @ts-expect-error subsurface project has the wrong typing here.
                    discreteMetadata.objects[geoEntry.identifier] = [[...geoEntry.color, 255], geoEntry.code];
                });

                return {
                    indexMax,
                    indexMin,
                    dataPoints,
                    name: name ?? "",
                    _dataSource: "geology",
                    _originalData: result,
                    _discreteMetaData: discreteMetadata,
                    // Garbage fields
                    curveAlias: null,
                    curveDescription: null,
                    curveUnitDesc: null,
                    indexUnit: "",
                    maxCurveValue: 0,
                    minCurveValue: 0,
                    noDataValue: null,
                    unit: "",
                };
            },
        })),
    });
}

// type CurveData = number | string | boolean | null;

export interface BaseAgnosticSourceData extends WellboreLogCurveData_api {
    _dataSource: "geology" | "wellLog" | "stratigraphy";
    _originalData: unknown;
    _discreteMetaData?: unknown;
}

export interface WellboreLogSourceData extends BaseAgnosticSourceData {
    _dataSource: "wellLog";
    _originalData: WellboreLogCurveData_api;
    _discreteMetaData?: never;
}

export interface WellboreGeologyCurveData extends BaseAgnosticSourceData {
    _dataSource: "geology";
    _originalData: WellboreGeoData_api[];
    _discreteMetaData: WellLogMetadataDiscrete;
}

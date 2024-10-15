import { WellboreLogCurveData_api } from "@api";
import { transformFormationData } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { Ensemble } from "@framework/Ensemble";
import { WellPicksLayerDataAndUnits } from "@modules/WellLogViewer/settings/atoms/derivedAtoms";
import { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import { UseQueryOptions, UseQueryResult, useQueries } from "@tanstack/react-query";
import { WellLogMetadataDiscrete } from "@webviz/well-log-viewer/dist/components/WellLogTypes";

import _ from "lodash";

import { DEFAULT_OPTIONS } from "./shared";

export function useLogCurveDataQueries(wellboreUuid: string, curveNames: string[]) {
    return useQueries({
        queries: curveNames.map((name) => ({
            queryKey: ["getLogCurveData", wellboreUuid, name],
            queryFn: () => apiService.well.getLogCurveData(wellboreUuid, name),
            enabled: Boolean(wellboreUuid && name),
            ...DEFAULT_OPTIONS,
        })),
        combine(results) {
            return mergeResults(results, function chunkDataByLogName(data) {
                return _.chain(data).groupBy("logName").values().value() as WellboreLogSourceData[][];
            });
        },
    });
}

export function useStratigraphyCurveQueries(
    ensembleSet: Ensemble | null,
    wellboreUuid: string,
    plotConfigs: TemplatePlotConfig[],
    picksAndUnits: WellPicksLayerDataAndUnits
) {
    return useQueries({
        combine: mergeResults,
        queries: plotConfigs.map(
            ({ _curveHeader, name }): UseQueryOptions => ({
                queryKey: ["getStratigraphyCurveData", _curveHeader?.sourceId],
                enabled: !picksAndUnits.stratUnits.length,

                queryFn: function transformStratigraphyPicksToCurve(): WellboreStratigraphyCurveData[] {
                    if (!_curveHeader) throw new Error(`Missing curve header provided for curve ${name}`);

                    // Casting the type, since this method only runs when stratUnitQuery.isPending is false, so we know it's not undefined
                    // TODO: What was teh filter? Type of unit?
                    // const unitsToUse = _.filter(stratigraphic_units, ["stratUnitType", _curveHeader?.sourceId]);
                    const { unitPicks } = picksAndUnits;

                    const names = [] as string[];

                    let indexMin = Number.MAX_VALUE;
                    let indexMax = Number.MIN_VALUE;
                    const dataPoints: WellboreGeologyCurveData["dataPoints"] = [];
                    const discreteMetadata: WellLogMetadataDiscrete = {
                        attributes: ["color", "code"],
                        objects: {},
                    };

                    // Assumes transformFormationData returns sorted arrays
                    const firstValues = getValuesFromUnitPick(unitPicks[0], names);
                    dataPoints.push([firstValues.from, null]);

                    unitPicks.forEach((unitPick) => {
                        const values = getValuesFromUnitPick(unitPick, names);

                        if (values.from < indexMin) indexMin = values.from;
                        if (values.to > indexMax) indexMax = values.to;

                        dataPoints.push([values.from + 0.00001, null]);
                        dataPoints.push([values.to, values.code]);

                        discreteMetadata.objects[values.name] = [values.color, values.code];
                    });

                    return [
                        {
                            indexMax,
                            indexMin,
                            dataPoints,
                            name: name ?? "",
                            logName: `stratigraphy::${name}`,
                            _dataSource: "stratigraphy",
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
                        },
                    ];
                },
            })
        ),
    });
}

// Manually defining the return from the transform utility, since they don't export them
type PairedPickAndUnit = ReturnType<typeof transformFormationData>["unitPicks"][0];

function getValuesFromUnitPick(pick: PairedPickAndUnit, existingNames: string[]) {
    let code = _.findIndex(existingNames, pick.name);
    if (code === -1) {
        code = existingNames.length;
        existingNames.push(pick.name);
    }

    return {
        code,
        name: pick.name,
        color: [pick.color.r, pick.color.g, pick.color.b],
        from: pick.entryPick.md,
        to: pick.exitPick.md,
    };
}

export function useGeologyCurveDataQueries(wellboreUuid: string, plotConfigs: TemplatePlotConfig[]) {
    // TODO: Catch non-unique names better. Only add project
    // TODO: Handle patterns? Can be found on SMDA Geology Standard, under "synbol"
    /*
        <img
            src="data:image/svg+xml;base64,PHN2ZyBzdHlsZT0iYmFja2dyb3VuZDogIzY1YTc0MCIgd2lkdGg9IjIwbW0iIGhlaWdodD0iMTBtbSIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMjAgMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iLjEiPiAKPHBhdGggZD0ibTEuNSAxLjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im02LjUgMS4yOGgyLjUiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtMTEuNSAxLjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xNi41IDEuMjhoMi41Ii8+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0ibTEuNSA2LjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im02LjUgNi4yOGgyLjUiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtMTEuNSA2LjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xNi41IDYuMjhoMi41Ii8+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0ibTAgMy43OGgxLjUiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtMCA4Ljc4aDEuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xOSAzLjc4aDEiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtOSAzLjc4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xOS4xIDguNzhoMSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im05LjEgOC43OGgyLjUiLz4iPHBhdGggZD0ibTQgMy43OGgyLjUiLz48cGF0aCBkPSJtMTQgMy43OGgyLjUiLz48cGF0aCBkPSJtNC4xIDguNzhoMi41Ii8+PHBhdGggZD0ibTE0LjEgOC43OGgyLjUiLz4gPC9nPjwvc3ZnPiA="
            alt="test"
        />
    */

    return useQueries({
        combine: mergeResults,
        queries: plotConfigs.map(({ _curveHeader, name }) => ({
            queryKey: ["getWellboreGeologyData", wellboreUuid, _curveHeader],
            enabled: Boolean(wellboreUuid && plotConfigs),
            queryFn: async function fetchAndTransformGeolCurveData(): Promise<WellboreGeologyCurveData[]> {
                if (!_curveHeader) throw new Error(`Missing curve header provided for curve {name}`);

                //! Assumes the entries are sorted on the backend
                const result = await apiService.well.getWellboreGeologyData(
                    wellboreUuid,
                    _curveHeader.sourceId as string
                );

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

                    discreteMetadata.objects[geoEntry.identifier] = [[...geoEntry.color, 255], geoEntry.code];
                });

                return [
                    {
                        indexMax,
                        indexMin,
                        dataPoints,
                        name: name ?? "",
                        logName: "COMPUTED::geology",
                        _dataSource: "geology",
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
                    },
                ];
            },
        })),
    });
}

function mergeResults<T, K = T[]>(
    results: UseQueryResult<T>[],
    dataTransform?: (data: T[]) => NonNullable<K>
): Partial<UseQueryResult<K>> {
    const error = _.find(results, "error")?.error;
    const isLoading = _.some(results, "isLoading");
    const isSuccess = _.every(results, "isSuccess");
    const isFetched = _.every(results, "isFetched");

    // Guard clauses for pending states. Data not defined here
    if (error) return { error, isLoading: false, isSuccess: false, isFetched };
    if (!isSuccess) return { isLoading, isSuccess: false, isFetched };

    // Data fetched, return and maybe apply transform
    let data: T[] | K = _.map(results, "data") as T[];

    if (data && dataTransform) {
        data = dataTransform(data);
    }

    return { data: data as K, isLoading, isSuccess, isFetched };
}

// type CurveData = number | string | boolean | null;

export interface BaseAgnosticSourceData extends WellboreLogCurveData_api {
    _dataSource: "geology" | "wellLog" | "stratigraphy";
    _discreteMetaData?: unknown;
}

export interface WellboreLogSourceData extends BaseAgnosticSourceData {
    _dataSource: "wellLog";
    _discreteMetaData?: never;
}

export interface WellboreGeologyCurveData extends BaseAgnosticSourceData {
    _dataSource: "geology";
    _discreteMetaData: WellLogMetadataDiscrete;
}

export interface WellboreStratigraphyCurveData extends BaseAgnosticSourceData {
    _dataSource: "stratigraphy";
    _discreteMetaData: WellLogMetadataDiscrete;
}

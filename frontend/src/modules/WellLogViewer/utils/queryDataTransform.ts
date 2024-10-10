/**
 * Utilities to convert fetched well log data to the JSON well-log format (see https://jsonwelllogformat.org/)
 */
import { WellboreLogCurveData_api, WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";
import {
    WellLog,
    WellLogCurve,
    WellLogDataRow,
    WellLogHeader,
} from "@webviz/well-log-viewer/dist/components/WellLogTypes";
import { WellPickProps } from "@webviz/well-log-viewer/dist/components/WellLogView";

import _ from "lodash";

import { COLOR_TABLES } from "./logViewerColors";

export const MAIN_AXIS_CURVE: WellLogCurve = {
    name: "MD",
    unit: "M",
    dimensions: 1,
    valueType: "float",
};

export const SECONDARY_AXIS_CURVE: WellLogCurve = {
    name: "DVER",
    unit: "M",
    dimensions: 1,
    valueType: "float",
};

export function createWellLog(
    curveData: WellboreLogCurveData_api[],
    wellboreTrajectory: WellboreTrajectory_api,
    referenceSystem: IntersectionReferenceSystem,
    padDataWithEmptyRows = false
): WellLog {
    // TODO: these all iterate over the curve data list, so should probably just combine them into a single reduce method to optimize
    const header = createLogHeader(wellboreTrajectory);

    // ! Important: Always make sure that the data row and curve arrays are in the same order!
    const curves = createLogCurves(curveData);
    const data = createLogData(curveData, wellboreTrajectory, referenceSystem, padDataWithEmptyRows);

    return { header, curves, data };
}

function createLogCurves(curveData: WellboreLogCurveData_api[]): WellLogCurve[] {
    return [MAIN_AXIS_CURVE, SECONDARY_AXIS_CURVE, ...curveData.map(apiCurveToLogCurve)];
}

function apiCurveToLogCurve(curve: WellboreLogCurveData_api): WellLogCurve {
    return {
        name: curve.name,
        // ! The Well Log JSON format does *technically* support multiple dimensions, but the subsurface component does not
        // dimensions: curve.dataPoints[0].length - 1,
        dimensions: 1,
        valueType: typeof curve.dataPoints[0][1],
        // ? if this is just gonna be the meter in depth for all of them
        unit: curve.unit,
        description: curve.curveDescription,
        // quantity,
        // description
    };
}

type SafeWellLogDataRow = [number, ...(WellLogDataRow | [])];
type DataRowAccumulatorMap = Record<number, SafeWellLogDataRow>;

function createLogData(
    curveData: WellboreLogCurveData_api[],
    wellboreTrajectory: WellboreTrajectory_api,
    referenceSystem: IntersectionReferenceSystem,
    padWithEmptyRows: boolean
): SafeWellLogDataRow[] {
    // We add 2 since each row also includes the MD and TVD axis curves
    const rowLength = curveData.length + 2;
    const rowAcc: DataRowAccumulatorMap = {};

    let minCurveMd = Number.MAX_VALUE;
    let maxCurveMd = Number.MIN_VALUE;

    curveData.forEach((curve, curveIndex) => {
        if (curve.indexMin < minCurveMd) minCurveMd = curve.indexMin;
        if (curve.indexMax > maxCurveMd) maxCurveMd = curve.indexMax;

        curve.dataPoints.forEach(([scaleIdx, entry, ...restData]) => {
            if (!scaleIdx) return console.warn("Unexpected null for scale entry");
            if (restData.length) console.warn("Multi-dimensional data not supported, using first value only");

            maybeInjectDataRow(rowAcc, scaleIdx, rowLength, referenceSystem);

            rowAcc[scaleIdx][curveIndex + 2] = entry === curve.noDataValue ? null : entry;
        });
    });

    if (padWithEmptyRows) {
        wellboreTrajectory.mdArr.forEach((mdValue) => {
            if (mdValue <= maxCurveMd && mdValue >= minCurveMd) return;

            maybeInjectDataRow(rowAcc, mdValue, rowLength, referenceSystem);
        });
    }

    return _.sortBy(Object.values(rowAcc), "0");
}

function maybeInjectDataRow(
    rowAcc: DataRowAccumulatorMap,
    targetMdValue: number,
    rowLength: number,
    referenceSystem: IntersectionReferenceSystem
) {
    if (!rowAcc[targetMdValue]) {
        rowAcc[targetMdValue] = Array(rowLength).fill(null) as SafeWellLogDataRow;
        rowAcc[targetMdValue][0] = targetMdValue;
        rowAcc[targetMdValue][1] = referenceSystem.project(targetMdValue)[1] ?? 0;
    }
}

function createLogHeader(wellboreTrajectory: WellboreTrajectory_api): WellLogHeader {
    // TODO: Might want more data from https://api.equinor.com/api-details#api=equinor-subsurfacedata-api-v3&operation=get-api-v-api-version-welllog-wellboreuuid, which provides:
    /*
    {
        "logName": "string",
        "logVersion": 0,
        "sourceUpdateDate": "string",
        "curveName": "string",
        "curveVersion": 0,
        "curveUnit": "string",
        "logActivity": "string",
        "dateLogged": "string",
        "loggingNumber": "string",
        "casingSizeManual": "string"
    }
    */

    return {
        ...getDerivedLogHeaderValues(wellboreTrajectory),
    };
}

type PartialHeader = Pick<WellLogHeader, "startIndex" | "endIndex" | "step">;

function getDerivedLogHeaderValues(wellboreTrajectory: WellboreTrajectory_api): PartialHeader {
    return {
        startIndex: wellboreTrajectory.mdArr[0] ?? 0,
        endIndex: wellboreTrajectory.mdArr[wellboreTrajectory.mdArr.length - 1] ?? 4000,
        // Unsure if this one is even used?
        step: 1,
    };
}

export function createLogViewerWellpicks(wellborePicks: WellPicksLayerData): WellPickProps {
    let wellpickData = generateWellpickData(wellborePicks);
    wellpickData = mergeStackedPicks(wellpickData);

    return {
        wellpick: {
            header: {},
            curves: [
                MAIN_AXIS_CURVE,
                {
                    name: "PICK",
                    valueType: "string",
                    dimensions: 1,
                },
            ],
            data: wellpickData,
        },
        name: "PICK",
        color: "Stratigraphy",
        // TODO: Color table should be generated form workbench settings
        colorTables: COLOR_TABLES,
    };
}

function generateWellpickData(wellborePicks: WellPicksLayerData): WellLogDataRow[] {
    const rowsFromNonUnitPicks = wellborePicks.nonUnitPicks.map(pickToDataRow);
    // Each unit-pick consists of two picks, entry and exit
    const rowsFromUnitPicks = wellborePicks.unitPicks.flatMap(({ entryPick, exitPick }) => [
        pickToDataRow(entryPick),
        pickToDataRow(exitPick),
    ]);

    return [...rowsFromNonUnitPicks, ...rowsFromUnitPicks];
}

function pickToDataRow(pick: WellPicksLayerData["nonUnitPicks"][0]): WellLogDataRow {
    return [pick.md, pick.identifier];
}

// ! The well log viewer does not support stacked wellpicks (same MD), and will render them on top of eachother!
// ! As a workaround, we merge stacked picks into a single pick with all their names.
function mergeStackedPicks(wellborePicks: WellLogDataRow[]): WellLogDataRow[] {
    const mergedPicks: Record<number, WellLogDataRow> = {};

    wellborePicks.forEach((pick) => {
        const md = pick[0] as number;

        if (!mergedPicks[md]) mergedPicks[md] = pick;
        else mergedPicks[md] = mergePicks(mergedPicks[md], pick);
    });

    return Object.values(mergedPicks);
}

function mergePicks(pick1: WellLogDataRow, pick2: WellLogDataRow): WellLogDataRow {
    // ! I have no clue how the well-log viewer computes the colors, but if I DONT use a plus here they all end up having the same color???
    return [pick1[0], `${pick1[1]} + ${pick2[1]}`];
}

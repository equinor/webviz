/**
 * Utilities to convert fetched well log data to the JSON well-log format (see https://jsonwelllogformat.org/)
 * @author Anders R. Hunderi
 */
import { WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import {
    WellLog,
    WellLogCurve,
    WellLogDataRow,
    WellLogHeader,
} from "@webviz/well-log-viewer/dist/components/WellLogTypes";

import _ from "lodash";

import { LogCurveDataWithName } from "../view/queries/wellLogQueries";

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
    curveData: LogCurveDataWithName[],
    wellboreTrajectory: WellboreTrajectory_api,
    referenceSystem: IntersectionReferenceSystem
): WellLog {
    // TODO: these all iterate over the curve data list, so should probably just combine them into a single reduce method to optimize
    const header = createLogHeader(wellboreTrajectory);

    // ! Important: Always make sure that the data row and curve arrays are in the same order!
    const curves = createLogCurves(curveData);
    const data = createLogData(curveData, referenceSystem);

    return { header, curves, data };
}

function createLogCurves(curveData: LogCurveDataWithName[]): WellLogCurve[] {
    return [MAIN_AXIS_CURVE, SECONDARY_AXIS_CURVE, ...curveData.map(apiCurveToLogCurve)];
}

function apiCurveToLogCurve(curve: LogCurveDataWithName): WellLogCurve {
    return {
        name: curve.name,
        dimensions: curve.dataPoints[0].length - 1,
        valueType: typeof curve.dataPoints[0][1],
        // ? if this is just gonna be the meter in depth for all of them
        unit: curve.indexUnit,
        // quantity,
        // description
    };
}

type SafeWellLogDataRow = [number, ...WellLogDataRow];
type DataRowAccumulatorMap = Record<number, SafeWellLogDataRow>;

function createLogData(
    curveData: LogCurveDataWithName[],
    referenceSystem: IntersectionReferenceSystem
): SafeWellLogDataRow[] {
    // We add 2 since each row also includes the MD and TVD axis curves
    const rowLength = curveData.length + 2;
    const rowAcc: DataRowAccumulatorMap = {};

    curveData.forEach((curve, curveIndex) => {
        curve.dataPoints.forEach(([scaleIdx, ...restData]: WellLogDataRow) => {
            if (!scaleIdx) return console.warn("Unexpected null for scale entry");
            if (typeof scaleIdx === "string") return console.warn("Unexpected string for scale entry");

            maybeInjectDataRow(rowAcc, scaleIdx, rowLength, referenceSystem);

            // Same +2 here, because of MD and TVD curves
            rowAcc[scaleIdx][curveIndex + 2] = restData[0];
        });
    });

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
        rowAcc[targetMdValue][1] = referenceSystem.project(targetMdValue)[0] ?? 0;
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
        endIndex: wellboreTrajectory.mdArr.slice(-1)[1] ?? 4000,
        // Unsure if this one is even used?
        step: 1,
    };
}

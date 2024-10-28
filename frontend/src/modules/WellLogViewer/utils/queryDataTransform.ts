/**
 * Utilities to convert fetched well log data to the JSON well-log format (see https://jsonwelllogformat.org/)
 */
import { WellboreLogCurveData_api, WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";
import {
    WellLogCurve,
    WellLogDataRow,
    WellLogHeader,
    WellLogSet,
} from "@webviz/well-log-viewer/dist/components/WellLogTypes";
import { WellPickProps } from "@webviz/well-log-viewer/dist/components/WellLogView";

import _ from "lodash";

import { COLOR_TABLES } from "./logViewerColors";
import { getUniqueCurveNameForCurveData } from "./strings";

export const MAIN_AXIS_CURVE: WellLogCurve = {
    name: "RKB",
    unit: "M",
    dimensions: 1,
    valueType: "float",
};

export const SECONDARY_AXIS_CURVE: WellLogCurve = {
    name: "MSL",
    unit: "M",
    dimensions: 1,
    valueType: "float",
};

const DATA_ROW_HEAD = Object.freeze([MAIN_AXIS_CURVE, SECONDARY_AXIS_CURVE]);
// Sometime rows data-points are very close to each other. This is likely due to rounding errors. To avoid weird holes in the graphs, we round the index values to this value to ensure close rows are joined together
const DATA_ROW_PRESICION = 3;

export function createWellLogSets(
    curveDataSets: WellboreLogCurveData_api[][],
    wellboreTrajectory: WellboreTrajectory_api,
    referenceSystem: IntersectionReferenceSystem,
    nonUniqueCurveNames?: Set<string>,
    padDataWithEmptyRows = false
): WellLogSet[] {
    const wellLogsSets = curveDataSets.map((curveSet) => {
        return {
            header: createLogHeader(curveSet, wellboreTrajectory),
            ...createLogCurvesAndData(
                curveSet,
                wellboreTrajectory,
                referenceSystem,
                nonUniqueCurveNames,
                padDataWithEmptyRows
            ),
        };
    });

    // The well-log viewer always picks the axis from the first log set in the collection. Adding a dedicated set for the axis to guarantee that it's always visible
    const axisSet: WellLogSet = {
        header: {
            name: "Axis set",
        },
        curves: [...DATA_ROW_HEAD],
        data: wellboreTrajectory.mdArr.reduce<WellLogDataRow[]>((acc, mdValue) => {
            const tvdValue = referenceSystem.project(mdValue)[1] ?? null;

            return [...acc, [mdValue, tvdValue]];
        }, []),
    };

    return [axisSet, ...wellLogsSets];
}

function createLogCurvesAndData(
    curveData: WellboreLogCurveData_api[],
    wellboreTrajectory: WellboreTrajectory_api,
    referenceSystem: IntersectionReferenceSystem,
    nonUniqueCurveNames?: Set<string>,
    padDataWithEmptyRows?: boolean
): Pick<WellLogSet, "curves" | "data" | "metadata_discrete"> {
    const curves: WellLogSet["curves"] = [...DATA_ROW_HEAD];
    const discreteMeta: WellLogSet["metadata_discrete"] = {};

    // We add 2 since each row also includes the MD and TVD axis curves
    // ! We're assuming the DataPoints list is sorted on MD, and that continuous sets
    const rowLength = curveData.length + 2;
    const rowAcc: DataRowAccumulatorMap = {};

    let minCurveMd = Number.MAX_VALUE;
    let maxCurveMd = Number.MIN_VALUE;

    curveData.forEach((curve, curveIndex) => {
        if (curve.indexMin < minCurveMd) minCurveMd = curve.indexMin;
        if (curve.indexMax > maxCurveMd) maxCurveMd = curve.indexMax;
        if (curve.metadataDiscrete)
            _.set(discreteMeta, getUniqueCurveNameForCurveData(curve, nonUniqueCurveNames), {
                attributes: ["code", "color"],
                objects: curve.metadataDiscrete,
            });

        curves.push(apiCurveToLogCurve(curve, nonUniqueCurveNames));

        curve.dataPoints.forEach(([scaleIdx, actualEntry, ...restData], idx) => {
            // ! Hack to fix subsurface graph weirdly prioritizing the PREVIOUS entry
            // To make it look correct, we essentially offset the entire graph by one.
            // Go back to using the actual entry once that's fixed
            let entry;
            if (curve.metadataDiscrete) entry = curve.dataPoints[idx - 1]?.[1] ?? null;
            else entry = actualEntry;

            if (!scaleIdx) return console.warn("Unexpected null for scale entry");
            if (typeof scaleIdx === "string") throw new Error("Scale index value cannot be a string");
            if (restData.length) console.warn("Multi-dimensional data not supported, using first value only");

            scaleIdx = _.round(scaleIdx, DATA_ROW_PRESICION);

            maybeInjectDataRow(rowAcc, scaleIdx, rowLength, referenceSystem);

            const valueIsEmpty = entry === "" || entry === curve.noDataValue;

            rowAcc[scaleIdx][curveIndex + 2] = valueIsEmpty ? null : entry;
        });
    });

    if (padDataWithEmptyRows) {
        wellboreTrajectory.mdArr.forEach((mdValue) => {
            if (mdValue <= maxCurveMd && mdValue >= minCurveMd) return;

            maybeInjectDataRow(rowAcc, mdValue, rowLength, referenceSystem);
        });
    }

    return {
        data: _.chain(rowAcc).values().sortBy("0").value(),
        metadata_discrete: discreteMeta,
        curves,
    };
}

function apiCurveToLogCurve(curve: WellboreLogCurveData_api, nonUniqueCurveNames?: Set<string>): WellLogCurve {
    const firstValue = curve.dataPoints[0]?.[1];

    let valueType = typeof firstValue as string;
    if (valueType === "string") valueType = "integer";

    return {
        name: getUniqueCurveNameForCurveData(curve, nonUniqueCurveNames),
        // ! The Well Log JSON format does *technically* support multiple dimensions, but the subsurface component does not
        // dimensions: curve.dataPoints[0].length - 1,
        dimensions: 1,
        valueType,
        // ? if this is just gonna be the meter in depth for all of them
        unit: curve.unit,
        description: curve.curveDescription,
        // quantity,
        // description
    };
}

type SafeWellLogDataRow = [number, ...WellLogDataRow];
type DataRowAccumulatorMap = Record<number, SafeWellLogDataRow>;

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

function createLogHeader(
    curveData: WellboreLogCurveData_api[],
    wellboreTrajectory: WellboreTrajectory_api
): WellLogHeader {
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
        name: curveData[0].logName,
        wellbore: wellboreTrajectory.uniqueWellboreIdentifier,
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
        md: MAIN_AXIS_CURVE.name,
        name: "PICK",
        // TODO: Color table should be generated form workbench settings
        colorMapFunctionName: "Stratigraphy",
        colorMapFunctions: COLOR_TABLES,
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

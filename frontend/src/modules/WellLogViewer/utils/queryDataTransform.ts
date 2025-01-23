/**
 * Utilities to convert fetched well log data to the JSON well-log format (see https://jsonwelllogformat.org/)
 */
import { WellLogCurveSourceEnum_api, WellboreLogCurveData_api, WellboreTrajectory_api } from "@api";
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

type DataRowAccumulatorMap = Record<number, SafeWellLogDataRow>;

// As per the well log json curve header definition
const ALLOWED_LOG_VALUE_TYPES = ["float", "integer", "string", "datetime", "boolean"] as const;
type AllowedLogValue = (typeof ALLOWED_LOG_VALUE_TYPES)[number];

const DATA_ROW_HEAD = Object.freeze([MAIN_AXIS_CURVE, SECONDARY_AXIS_CURVE]);
// Sometime rows data-points are very close to each other. This is likely due to rounding
// errors. To avoid weird holes in the graphs, we round the index values to this value
// to ensure close rows are joined together
const DATA_ROW_PRESICION = 3;

export function createWellLogSets(
    curveData: WellboreLogCurveData_api[],
    wellboreTrajectory: WellboreTrajectory_api,
    referenceSystem: IntersectionReferenceSystem,
    nonUniqueCurveNames?: Set<string>,
    padDataWithEmptyRows = false
): WellLogSet[] {
    // The well-log viewer always picks the axis from the first log set in the collection.
    // Adding a dedicated set for only the axes, so we always have a full set to show from.
    const axisOnlyLog = makeAxisOnlyLog(wellboreTrajectory, referenceSystem);

    const wellLogsSets = _.chain(curveData)
        // Initial map to handle some cornercases
        .map((curveData) => {
            curveData = _.clone(curveData);

            // Occasionally names are duplicated between logs. The log-viewer looks up
            // curves by name only, and picks the first one when building it's graphs,
            // must make it so all names are unique
            curveData.name = getUniqueCurveNameForCurveData(curveData, nonUniqueCurveNames);

            // These curves *will* have different sampling rates (as they only have
            // entries when the value changes). To render these correctly in the viewer,
            // we must ensure they have different log-names
            if (curveData.source !== WellLogCurveSourceEnum_api.SSDL_WELL_LOG) {
                // Names *should* be unique across logs
                curveData.logName = `${curveData.logName}::${curveData.name}`;
            }

            return curveData;
        })
        // According to the well-log JSON format, each log should have their own object
        .groupBy("logName")
        .entries()
        .map(([logName, curveSet]) => {
        const { curves, data, metadata_discrete } = createLogCurvesAndData(
            curveSet,
            wellboreTrajectory,
            referenceSystem,
            padDataWithEmptyRows
        );

        const header = createLogHeader(logName, data, wellboreTrajectory);

        return { header, curves, data, metadata_discrete };
        })
        .value();

    return [axisOnlyLog, ...wellLogsSets];
}

type SafeWellLogDataRow = [number, ...WellLogDataRow];
type LogCurveAndDataResult = { data: SafeWellLogDataRow[] } & Pick<WellLogSet, "curves" | "metadata_discrete">;

function makeAxisOnlyLog(
    wellboreTrajectory: WellboreTrajectory_api,
    referenceSystem: IntersectionReferenceSystem
): WellLogSet {
    const data = wellboreTrajectory.mdArr.reduce<SafeWellLogDataRow[]>((acc, mdValue) => {
        const tvdValue = referenceSystem.project(mdValue)[1] ?? null;

        return [...acc, [mdValue, tvdValue]];
    }, []);

    const header = createLogHeader("Log axes", data, wellboreTrajectory);

    return { header, data, curves: [...DATA_ROW_HEAD] };
}

function createLogCurvesAndData(
    curveData: WellboreLogCurveData_api[],
    wellboreTrajectory: WellboreTrajectory_api,
    referenceSystem: IntersectionReferenceSystem,
    padDataWithEmptyRows?: boolean
): LogCurveAndDataResult {
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
            _.set(discreteMeta, curve.name, {
                attributes: ["code", "color"],
                objects: curve.metadataDiscrete,
            });

        curves.push(apiCurveToLogCurve(curve));

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

function apiCurveToLogCurve(curve: WellboreLogCurveData_api): WellLogCurve {
    return {
        name: curve.name,
        // ! The official Well Log JSON format supports multiple dimensions, but the subsurface component does not
        // dimensions: curve.dataPoints[0].length - 1,
        dimensions: 1,
        valueType: getCurveValueType(curve),
        // ? if this is just gonna be the meter in depth for all of them
        unit: curve.unit,
        description: curve.curveDescription,
        // quantity,
        // description
    };
}

function getCurveValueType(curve: WellboreLogCurveData_api): AllowedLogValue {
    // This check could be done a bit more thoroughly, but AFAIK the value type field
    // is not *actually* used in the viewer, and per now, all points return float
    const valueType = typeof curve.dataPoints[0]?.[1];

    // @ts-expect-error typing of includes() doesn't accept general strings (which is weird)
    if (ALLOWED_LOG_VALUE_TYPES.includes(valueType)) {
        return valueType as AllowedLogValue;
    }

    return "float";
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
        rowAcc[targetMdValue][1] = referenceSystem.project(targetMdValue)[1] ?? null;
    }
}

function createLogHeader(
    logName: string,
    data: SafeWellLogDataRow[],
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
        name: logName,
        wellbore: wellboreTrajectory.uniqueWellboreIdentifier,
        startIndex: data[0]?.[0],
        endIndex: data.at(-1)?.[0],
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

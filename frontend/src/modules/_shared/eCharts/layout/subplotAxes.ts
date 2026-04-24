import type { TitleOption, XAXisOption } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { SubplotLayoutResult } from "./subplotGridLayout";

export interface AxisDef {
    type: "value" | "category";
    data?: (string | number)[];
    label?: string;
    nameGap?: number;
    boundaryGap?: boolean;
    scale?: boolean;
    splitLine?: boolean;
    splitArea?: boolean;
    axisPointer?: XAXisOption["axisPointer"];
}

export interface SubplotAxisDef {
    xAxis: AxisDef;
    yAxis: AxisDef;
    title?: string;
}

type CartesianAxisOption = XAXisOption;

export interface SubplotAxesResult {
    xAxes: CartesianAxisOption[];
    yAxes: CartesianAxisOption[];
    titles: TitleOption[];
}

/** Builds x/y axis configs and title options from per-subplot axis definitions and a grid layout. */
export function buildSubplotAxes(layout: SubplotLayoutResult, axisDefs: SubplotAxisDef[]): SubplotAxesResult {
    const isMultiGrid = layout.grids.length > 1;
    const xAxes: CartesianAxisOption[] = [];
    const yAxes: CartesianAxisOption[] = [];
    const titles: TitleOption[] = [];

    for (let i = 0; i < axisDefs.length; i++) {
        const def = axisDefs[i];
        const cell = layout.cells[i];

        xAxes.push(buildAxis(def.xAxis, i, "x"));
        yAxes.push(buildAxis(def.yAxis, i, "y"));

        if (isMultiGrid && def.title) {
            titles.push({
                text: def.title,
                left: `${cell.leftPct + cell.widthPct / 2}%`,
                top: `${cell.titleTopPct}%`,
                textAlign: "center" as const,
                textStyle: { fontSize: 12, fontWeight: "normal" as const, color: "#555" },
            });
        }
    }

    return { xAxes, yAxes, titles };
}

function buildAxis(def: AxisDef, gridIndex: number, direction: "x" | "y"): XAXisOption {
    const isValue = def.type === "value";
    const defaultNameGap = direction === "x" ? 30 : 40;

    return {
        type: def.type,
        gridIndex,
        ...(def.data != null ? { data: def.data } : {}),
        ...(def.label
            ? {
                name: def.label,
                nameLocation: "middle" as const,
                nameGap: def.nameGap ?? defaultNameGap,
            }
            : {}),
        ...(def.boundaryGap != null ? { boundaryGap: def.boundaryGap } : {}),
        ...(def.scale != null ? { scale: def.scale } : {}),
        ...(def.splitLine != null ? { splitLine: { show: def.splitLine } } : {}),
        ...(def.splitArea != null ? { splitArea: { show: def.splitArea } } : {}),
        ...(def.axisPointer != null ? { axisPointer: def.axisPointer } : {}),
        axisLabel: {
            show: true,
            fontSize: 11,
            hideOverlap: true,
            ...(isValue ? { formatter: (v: number) => formatNumber(v) } : {}),
        },
        axisTick: { show: true },
    } as XAXisOption;
}

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { SubplotLayoutResult } from "./subplotGridLayout";

export type AxisDef = {
    type: "value" | "category";
    data?: (string | number)[];
    label?: string;
    nameGap?: number;
    boundaryGap?: boolean;
    scale?: boolean;
    splitLine?: boolean;
    splitArea?: boolean;
    axisPointer?: any;
};

export type SubplotAxisDef = {
    xAxis: AxisDef;
    yAxis: AxisDef;
    title?: string;
};

export type SubplotAxesResult = {
    xAxes: any[];
    yAxes: any[];
    titles: any[];
};

const VALUE_AXIS_FORMATTER = (v: number) => formatNumber(v);

export function buildSubplotAxes(layout: SubplotLayoutResult, axisDefs: SubplotAxisDef[]): SubplotAxesResult {
    const isMultiGrid = layout.grids.length > 1;
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const titles: any[] = [];

    for (let i = 0; i < axisDefs.length; i++) {
        const def = axisDefs[i];
        const cell = layout.cells[i];

        xAxes.push(buildAxis(def.xAxis, i, isMultiGrid, "x"));
        yAxes.push(buildAxis(def.yAxis, i, isMultiGrid, "y"));

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

function buildAxis(def: AxisDef, gridIndex: number, isMultiGrid: boolean, direction: "x" | "y"): any {
    const isValue = def.type === "value";
    const defaultNameGap = direction === "x" ? 30 : 40;

    return {
        type: def.type,
        gridIndex,
        ...(def.data != null ? { data: def.data } : {}),
        ...(def.label
            ? {
                  name: isMultiGrid ? "" : def.label,
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
            ...(isValue ? { formatter: VALUE_AXIS_FORMATTER } : {}),
        },
        axisTick: { show: true },
    };
}

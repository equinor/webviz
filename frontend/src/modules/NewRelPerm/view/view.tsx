import React from "react";
import Plot from "react-plotly.js";

import {
    RelPermRealizationCurveData_api,
    RelPermRealizationData_api,
    RelPermStatisticalDataForSaturation_api,
    RftRealizationData_api,
} from "@api";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import {
    FanchartData,
    FreeLineData,
    LowHighData,
    MinMaxData,
    createFanchartTraces,
} from "@modules/_shared/PlotlyTraceUtils/fanchartPlotting";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { ConstructionOutlined } from "@mui/icons-material";

import { useAtomValue } from "jotai";
import { PlotData } from "plotly.js";

import {
    loadedRelPermSpecificationsAndRealizationDataAtom,
    loadedRelPermSpecificationsAndStatisticalDataAtom,
} from "./atoms/derivedAtoms";
import { usePlotBuilder } from "./hooks/usePlotBuilder";

import { Interfaces } from "../interfaces";
import { RelPermSpec, VisualizationMode } from "../typesAndEnums";

export const View = ({ viewContext, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(viewContext);

    const colorSet = workbenchSettings.useColorSet();

    const plot = usePlotBuilder(viewContext, wrapperDivSize, colorSet);
    const visualizationMode = viewContext.useSettingsToViewInterfaceValue("visualizationMode");
    const loadedRelPermSpecificationsAndRealizationData = useAtomValue(
        loadedRelPermSpecificationsAndRealizationDataAtom,
    );
    const loadedRelPermSpecificationsAndStatisticalData = useAtomValue(
        loadedRelPermSpecificationsAndStatisticalDataAtom,
    );

    let content = null;
    let plotData: Partial<PlotData>[] = [];
    if (visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS) {
        plotData = createRealizationsTraces(loadedRelPermSpecificationsAndRealizationData);
    }
    // if (visualizationMode === visualizationMode.STATISTICAL_FANCHART) {
    //     plotData = createRelPermFanchartTraces(loadedRelPermSpecificationsAndStatisticalData);
    // }
    content = (
        <Plot
            key={plotData.length} // Note: Temporary to trigger re-render and remove legends when plotData is empty
            data={plotData}
            layout={{
                title: "Relative Permeability",
                height: wrapperDivSize.height,
                width: wrapperDivSize.width,
                xaxis: { range: [0, 1] },
                // yaxis: { autorange: "reversed", title: "Depth" },
            }}
            config={{ scrollZoom: true }}
        />
    );

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {content}
        </div>
    );
};
function createRealizationsTraces(
    relPermSpecAndRealizationData: {
        relPermSpecification: RelPermSpec;
        data: RelPermRealizationData_api;
    }[],
): Partial<PlotData>[] {
    const plotData: Partial<PlotData>[] = [];

    let totalPoints = 0;
    relPermSpecAndRealizationData.forEach((realizationData) => {
        totalPoints += realizationData.data.relperm_curve_data.length;
    });

    const useGl: boolean = totalPoints > 1000;
    const curveNames = new Set(
        relPermSpecAndRealizationData.map((real) => {
            return real.data.relperm_curve_data.map((data) => data.curve_name);
        }),
    );

    relPermSpecAndRealizationData.forEach((real) => {
        real.data.relperm_curve_data.forEach((realizationData) => {
            plotData.push(
                createRelPermRealizationTrace(
                    realizationData.realization_id,
                    real.data.saturation_axis_data.curve_values,
                    realizationData.curve_values,
                    useGl,
                ),
            );
        });
    });
    return plotData;
}

function createRelPermRealizationTrace(
    realization: number,
    saturationValues: number[],
    curveValues: number[],
    useGl: boolean,
): Partial<PlotData> {
    const trace: Partial<PlotData> = {
        x: saturationValues,
        y: curveValues,

        type: useGl ? "scatter" : "scatter",
        mode: "lines",
        showlegend: false,
        line: {
            width: 1,
        },
        marker: {
            color: "rgba(100,100,10,0.1)",
            size: 5,
        },
        hovertext: `Realization: ${realization}`,
    };
    return trace;
}

// function getResponseValueRange(rftRealizationData: RftRealizationData_api[] | null): [number, number] {
//     let minValue = Number.POSITIVE_INFINITY;
//     let maxValue = Number.NEGATIVE_INFINITY;
//     if (rftRealizationData !== null && rftRealizationData.length) {
//         rftRealizationData.forEach((realizationData) => {
//             realizationData.value_arr.forEach((value) => {
//                 if (value < minValue) {
//                     minValue = value;
//                 }
//                 if (value > maxValue) {
//                     maxValue = value;
//                 }
//             });
//         });
//     }
//     return [minValue, maxValue];
// }

/**
    Utility function for creating traces representing statistical fanchart for given statistics data.

    The function creates filled transparent area between P10 and P90, and between MIN and MAX, and a free line 
    for MEAN.

    NOTE: P10 and P90, and MIN and MAX are considered to work in pairs, therefore the pairs are neglected if
    only one of the statistics in each pair is present in the data. I.e. P10/P90 is neglected if only P10 or P90
    is presented in the data. Similarly, MIN/MAX is neglected if only MIN or MAX is presented in the data.
 */

type CreateRelPermFanchartTracesOptions = {
    relPermStatisticsData: {
        relPermSpecification: RelPermSpec;
        data: RelPermRealizationData_api;
    }[];

    curveName: string;
    hexColor: string;
    legendGroup: string;
    name?: string;
    yaxis?: string;
    // lineShape?: "vh" | "linear" | "spline" | "hv" | "hvh" | "vhv";
    hoverTemplate?: string;
    showLegend?: boolean;
    legendRank?: number;
    type?: "scatter" | "scattergl";
};
function createRelPermFanchartTraces({
    relPermStatisticsData,
    curveName,
    hexColor,
    legendGroup,
    name = undefined,
    yaxis = "y",
    hoverTemplate = "(%{x}, %{y})<br>",
    showLegend = false,
    type = "scatter",
    legendRank,
}: CreateRelPermFanchartTracesOptions): Partial<PlotData>[] {
    const curveData = relPermStatisticsData.relperm_curve_data.find((v) => v.curve_name === curveName);
    if (!curveData) {
        throw new Error(`Curve data for curve name ${curveName} not found in rel perm statistics data`);
    }
    const lowData = curveData.curve_values[Statistic_api.P90];
    const highData = curveData.curve_values[Statistic_api.P10];

    let lowHighData: LowHighData | undefined = undefined;
    if (lowData && highData) {
        lowHighData = {
            highName: Statistic_api.P10.toString(),
            highData: highData,
            lowName: Statistic_api.P90.toString(),
            lowData: lowData,
        };
    }

    const minData = curveData.curve_values[Statistic_api.MIN];
    const maxData = curveData.curve_values[Statistic_api.MAX];

    let minMaxData: MinMaxData | undefined = undefined;
    if (minData && maxData) {
        minMaxData = {
            maximum: maxData,
            minimum: minData,
        };
    }

    const meanData = curveData.curve_values[Statistic_api.MEAN];
    let meanFreeLineData: FreeLineData | undefined = undefined;
    if (meanData) {
        meanFreeLineData = {
            name: Statistic_api.MEAN.toString(),
            data: meanData,
        };
    }

    const fanchartData: FanchartData = {
        samples: relPermStatisticsData.saturation_axis_data.curve_values,
        lowHigh: lowHighData,
        minimumMaximum: minMaxData,
        freeLine: meanFreeLineData,
    };

    return createFanchartTraces({
        data: fanchartData,
        hexColor: hexColor,
        legendGroup: legendGroup,
        name: name,
        lineShape: "linear", //getLineShape(relPermStatisticsData.is_rate),
        showLegend: showLegend,
        hoverTemplate: hoverTemplate,
        legendRank: legendRank,
        yaxis: yaxis,
        type: type,
    });
}

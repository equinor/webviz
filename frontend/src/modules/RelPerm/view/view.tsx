import React from "react";
import Plot from "react-plotly.js";

import { RftRealizationData_api } from "@api";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { ConstructionOutlined } from "@mui/icons-material";

import { useAtomValue } from "jotai";
import { PlotData } from "plotly.js";
import { vi } from "vitest";

import { relPermRealizationDataQueryAtom, relPermStatisticalDataQueryAtom } from "./atoms/queryAtoms";
import { createRelPermFanchartTraces } from "./utils/createRelPermTracesUtils";

import { Interfaces } from "../interfaces";
import { VisualizationType } from "../typesAndEnums";

export const View = ({ viewContext }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const visualizationType = viewContext.useSettingsToViewInterfaceValue("visualizationType");
    const relPermRealizationsDataQuery = useAtomValue(relPermRealizationDataQueryAtom);
    const relPermStatisticalDataQuery = useAtomValue(relPermStatisticalDataQueryAtom);

    const statusWriter = useViewStatusWriter(viewContext);
    const statusErrorRealizations = usePropagateApiErrorToStatusWriter(relPermRealizationsDataQuery, statusWriter);
    const statusErrorStatistical = usePropagateApiErrorToStatusWriter(relPermStatisticalDataQuery, statusWriter);
    console.log("statData", relPermStatisticalDataQuery.data);
    let content = null;
    const plotData: Partial<PlotData>[] = [];

    if (visualizationType === VisualizationType.INDIVIDUAL_REALIZATIONS) {
        if (relPermRealizationsDataQuery.isFetching) {
            content = (
                <ContentMessage type={ContentMessageType.INFO}>
                    <CircularProgress />
                </ContentMessage>
            );
        } else if (statusErrorRealizations !== null) {
            content = <div className="w-full h-full flex justify-center items-center">{statusErrorRealizations}</div>;
        } else if (relPermRealizationsDataQuery.isError || relPermRealizationsDataQuery.data === undefined) {
            content = <div className="w-full h-full flex justify-center items-center">Could not load RFT data</div>;
        } else {
            const colors = [
                "red",
                "blue",
                "green",
                "yellow",
                "purple",
                "orange",
                "pink",
                "brown",
                "black",
                "gray",
                "cyan",
                "magenta",
                "purple",
                "lime",
                "teal",
                "indigo",
                "maroon",
                "navy",
                "olive",
                "silver",
                "aqua",
                "fuchsia",
                "white",
            ];

            let totalPoints = 0;
            relPermRealizationsDataQuery.data.relperm_curve_data.forEach((realizationData) => {
                totalPoints += realizationData.curve_values.length;
            });

            const useGl: boolean = totalPoints > 1000;
            const curveNames = new Set(
                relPermRealizationsDataQuery.data.relperm_curve_data.map((data) => data.curve_name)
            );

            relPermRealizationsDataQuery.data.relperm_curve_data.forEach((realizationData) => {
                plotData.push(
                    createRelPermRealizationTrace(
                        realizationData.realization_id,
                        relPermRealizationsDataQuery.data.saturation_axis_data.curve_values,
                        realizationData.curve_values,
                        colors[Array.from(curveNames).indexOf(realizationData.curve_name)],
                        useGl
                    )
                );
            });
        }
    }

    if (visualizationType === VisualizationType.STATISTICAL_FANCHART) {
        if (relPermStatisticalDataQuery.data) {
            console.log("hello");
            const curveNames = Array.from(
                new Set(relPermStatisticalDataQuery.data.relperm_curve_data.map((data) => data.curve_name))
            );
            console.log(curveNames);
            for (let i = 0; i < curveNames.length; i++) {
                const curve = curveNames[i];
                const test = createRelPermFanchartTraces({
                    relPermStatisticsData: relPermStatisticalDataQuery.data,
                    curveName: curve,
                    hexColor: "blue",
                    legendGroup: "RelPerm",
                });
                console.log(test);
                plotData.push(
                    ...createRelPermFanchartTraces({
                        relPermStatisticsData: relPermStatisticalDataQuery.data,
                        curveName: curve,
                        hexColor: "blue",
                        legendGroup: "RelPerm",
                    })
                );
            }
        }
    }
    console.log("plotData", plotData);

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

function createRelPermRealizationTrace(
    realization: number,
    saturationValues: number[],
    curveValues: number[],
    color: string,
    useGl: boolean
): Partial<PlotData> {
    const trace: Partial<PlotData> = {
        x: saturationValues,
        y: curveValues,

        type: useGl ? "scatter" : "scatter",
        mode: "lines+markers",
        showlegend: false,
        line: {
            color: color,
            width: 1,
        },
        marker: {
            color: "blue",
            size: 5,
        },
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

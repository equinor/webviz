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

import { PlotData } from "plotly.js";

import { Interfaces } from "./interfaces";

export const View = ({ viewContext }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const relPermDataQuery = viewContext.useSettingsToViewInterfaceValue("relPermDataQuery");
    //     const realizationNums = viewContext.useSettingsToViewInterfaceValue("realizationNums");
    //     const responseName = viewContext.useSettingsToViewInterfaceValue("responseName");
    //     const wellName = viewContext.useSettingsToViewInterfaceValue("wellName");
    //     const timeStampUtcMs = viewContext.useSettingsToViewInterfaceValue("timeStampsUtcMs");

    const statusWriter = useViewStatusWriter(viewContext);
    const statusError = usePropagateApiErrorToStatusWriter(relPermDataQuery, statusWriter);

    let content = null;

    if (relPermDataQuery.isFetching) {
        content = (
            <ContentMessage type={ContentMessageType.INFO}>
                <CircularProgress />
            </ContentMessage>
        );
    } else if (statusError !== null) {
        content = <div className="w-full h-full flex justify-center items-center">{statusError}</div>;
    } else if (relPermDataQuery.isError || relPermDataQuery.data === undefined) {
        content = <div className="w-full h-full flex justify-center items-center">Could not load RFT data</div>;
    } else {
        //         const filteredRftData = rftDataQuery.data.filter((realizationData) =>
        //             realizationNums?.includes(realizationData.realization)
        //         );
        //         const [minValue, maxValue] = getResponseValueRange(filteredRftData);
        const plotData: Partial<PlotData>[] = [];
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
        relPermDataQuery.data.forEach((realizationData) => {
            realizationData.satnum_data.forEach((satNumData) => {
                satNumData.relperm_curves_data.forEach((curveData) => {
                    totalPoints += curveData.length;
                });
            });
        });
        const useGl: boolean = totalPoints > 1000;
        relPermDataQuery.data.forEach((realizationData) => {
            realizationData.satnum_data.forEach((satNumData, idx) => {
                satNumData.relperm_curves_data.forEach((curveData) => {
                    plotData.push(
                        createRelPermRealizationTrace(
                            realizationData.realization,
                            realizationData.saturation_axis_data,
                            curveData,
                            colors[idx],
                            useGl
                        )
                    );
                });
            });
        });
        //         const title = `RFT for ${wellName}, ${timeStampUtcMs && timestampUtcMsToCompactIsoString(timeStampUtcMs)}`;
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
    }
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

        type: useGl ? "scattergl" : "scatter",
        mode: "lines",
        showlegend: false,
        line: {
            color: color,
            width: 2,
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

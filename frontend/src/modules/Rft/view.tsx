import React from "react";
import Plot from "react-plotly.js";

import { RftRealizationData_api } from "@api";
import { ModuleViewProps } from "@framework/Module";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { useElementSize } from "@lib/hooks/useElementSize";

import { PlotData } from "plotly.js";

import { Interfaces } from "./interfaces";
import { useRftRealizationData } from "./queryHooks";

export const View = ({ viewContext }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const rftWellAddress = viewContext.useSettingsToViewInterfaceValue("rftWellAddress");
    const rftRealizationDataQuery = useRftRealizationData(
        rftWellAddress?.caseUuid,
        rftWellAddress?.ensembleName,
        rftWellAddress?.wellName,
        rftWellAddress?.responseName,
        undefined,
        rftWellAddress?.realizationNums
    );
    const timePoint = rftWellAddress?.timePoint;

    const realizationDataForTimePoint: RftRealizationData_api[] = [];
    if (rftRealizationDataQuery.data && timePoint) {
        rftRealizationDataQuery.data.forEach((realizationData) => {
            if (realizationData.timestamp_utc_ms === timePoint) {
                realizationDataForTimePoint.push(realizationData);
            }
        });
    }
    const [minValue, maxValue] = getResponseValueRange(rftRealizationDataQuery.data ?? null);
    const plotData: Partial<PlotData>[] = [];
    realizationDataForTimePoint.forEach((realizationData) => {
        plotData.push(createRftRealizationTrace(realizationData));
    });
    const title =
        rftWellAddress && timePoint
            ? `RFT for ${rftWellAddress.wellName}, ${timestampUtcMsToCompactIsoString(timePoint)}`
            : "";
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot
                key={plotData.length} // Note: Temporary to trigger re-render and remove legends when plotData is empty
                data={plotData}
                layout={{
                    title,
                    height: wrapperDivSize.height,
                    width: wrapperDivSize.width,
                    xaxis: { range: [minValue, maxValue], title: "Pressure" },
                    yaxis: { autorange: "reversed", title: "Depth" },
                }}
                config={{ scrollZoom: true }}
            />
        </div>
    );
};

function createRftRealizationTrace(rftRealizationData: RftRealizationData_api): Partial<PlotData> {
    const trace: Partial<PlotData> = {
        x: rftRealizationData.value_arr,
        y: rftRealizationData.depth_arr,

        type: "scatter",
        mode: "lines",
        hovertemplate:
            "<br><b>Pressure</b>: %{x}" +
            "<br><b>Depth</b>: %{y}" +
            `<br><b>Realization</b>: ${rftRealizationData.realization}` +
            "<extra></extra>",
        showlegend: false,
        line: {
            color: "red",
            width: 2,
        },
    };
    return trace;
}

function getResponseValueRange(rftRealizationData: RftRealizationData_api[] | null): [number, number] {
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    if (rftRealizationData !== null && rftRealizationData.length) {
        rftRealizationData.forEach((realizationData) => {
            realizationData.value_arr.forEach((value) => {
                if (value < minValue) {
                    minValue = value;
                }
                if (value > maxValue) {
                    maxValue = value;
                }
            });
        });
    }
    return [minValue, maxValue];
}

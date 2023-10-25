import React from "react";
import Plot from "react-plotly.js";

import { RftWellRealizationData_api } from "@api";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { PlotData } from "plotly.js";

import { useRftRealizationData } from "./queryHooks";
import State from "./state";

export const view = ({ moduleContext, workbenchSession, workbenchSettings }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const rftWellAddress = moduleContext.useStoreValue("rftWellAddress");
    const rftRealizationDataQuery = useRftRealizationData(
        rftWellAddress?.caseUuid,
        rftWellAddress?.ensembleName,
        rftWellAddress?.wellName,
        rftWellAddress?.responseName,
        undefined,
        rftWellAddress?.realizationNums
    );
    const timePoint = rftWellAddress?.timePoint;

    const realizationDataForTimePoint: RftWellRealizationData_api[] = [];
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
    const title = rftWellAddress && timePoint ? `RFT for ${rftWellAddress.wellName}, ${timestampUtcMsToCompactIsoString(timePoint)}` : "";
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

function createRftRealizationTrace(rftRealizationData: RftWellRealizationData_api): Partial<PlotData> {
    const trace: Partial<PlotData> = {
        x: rftRealizationData.value_arr,
        y: rftRealizationData.depth_arr,

        type: "scatter",
        mode: "lines",
        hovertemplate:
            '<br><b>Pressure</b>: %{x}' +
            '<br><b>Depth</b>: %{y}' +
            `<br><b>Realization</b>: ${rftRealizationData.realization}` +
            '<extra></extra>',
        showlegend: false,
        line: {
            color: "red",
            width: 2,
        },
    };
    return trace;
}

function getResponseValueRange(rftRealizationData: RftWellRealizationData_api[] | null): [number, number] {
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

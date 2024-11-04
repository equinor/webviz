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

    const rftDataQuery = viewContext.useSettingsToViewInterfaceValue("rftDataQuery");
    const realizationNums = viewContext.useSettingsToViewInterfaceValue("realizationNums");
    const responseName = viewContext.useSettingsToViewInterfaceValue("responseName");
    const wellName = viewContext.useSettingsToViewInterfaceValue("wellName");
    const timeStampUtcMs = viewContext.useSettingsToViewInterfaceValue("timeStampsUtcMs");

    const statusWriter = useViewStatusWriter(viewContext);
    const statusError = usePropagateApiErrorToStatusWriter(rftDataQuery, statusWriter);

    let content = null;

    if (rftDataQuery.isFetching) {
        content = (
            <ContentMessage type={ContentMessageType.INFO}>
                <CircularProgress />
            </ContentMessage>
        );
    } else if (statusError !== null) {
        content = <div className="w-full h-full flex justify-center items-center">{statusError}</div>;
    } else if (rftDataQuery.isError || rftDataQuery.data === undefined) {
        content = <div className="w-full h-full flex justify-center items-center">Could not load RFT data</div>;
    } else {
        const filteredRftData = rftDataQuery.data.filter((realizationData) =>
            realizationNums?.includes(realizationData.realization)
        );
        const [minValue, maxValue] = getResponseValueRange(filteredRftData);
        const plotData: Partial<PlotData>[] = [];
        filteredRftData.forEach((realizationData) => {
            plotData.push(createRftRealizationTrace(realizationData));
        });
        const title = `RFT for ${wellName}, ${timeStampUtcMs && timestampUtcMsToCompactIsoString(timeStampUtcMs)}`;
        content = (
            <Plot
                key={plotData.length} // Note: Temporary to trigger re-render and remove legends when plotData is empty
                data={plotData}
                layout={{
                    title,
                    height: wrapperDivSize.height,
                    width: wrapperDivSize.width,
                    xaxis: { range: [minValue, maxValue], title: responseName ?? "" },
                    yaxis: { autorange: "reversed", title: "Depth" },
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

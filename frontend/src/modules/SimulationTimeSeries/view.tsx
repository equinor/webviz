import React from "react";
import { useQuery } from "react-query";
import { apiService } from "@framework/ApiService";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { VectorRealizationData } from "@api";
import { PlotlyLineChart } from "@lib/components/PlotlyLineChart";
import { State } from "./state";

import Plotly from "plotly.js-basic-dist";


const realizationDataToTraces = (data: VectorRealizationData[], highlightedTrace: number | undefined): any => { //Fails ts with Plotly.Data[], but works.
    return data.map((real: VectorRealizationData) => {
        return {
            x: real.timestamps,
            y: real.values,
            customdata: real.realization, //Fails ts with Plotly.Data, but works.
            type: 'scatter',
            mode: 'lines',
            marker: { color: 'red', },
            line: { color: (real.realization === highlightedTrace) ? "rgba(0,0,0,1)" : "rgba(185,185,185,0.1)" },
        }
    })
}

const plotLayout = (xaxisRange: [number, number] | undefined): Partial<Plotly.Layout> => {
    if (xaxisRange) {
        return {
            "xaxis": {
                "range": xaxisRange
            }
        }
    }
    return {}
}
const getTraceNumberFromHoverData = (hoverData: Plotly.PlotMouseEvent): any => {
    if (hoverData.points && hoverData.points.length > 0) {
        return hoverData.points[0].data.customdata
    }
    return undefined
}
const getXaxisRangeFromLayoutChange = (onRelayout: Plotly.PlotRelayoutEvent): [number | undefined, number | undefined] | undefined => {
    if (onRelayout) {
        return [onRelayout["xaxis.range[0]"], onRelayout["xaxis.range[1]"]]
    }
}
export const view = (props: ModuleFCProps<State>) => {
    const sumoCaseId: any = useSubscribedValue("navigator.caseId", props.workbenchServices);
    const sumoIterationId: string = "0"
    const selectedVector = props.moduleContext.useStoreValue("selectedVector");
    const selectedVector2 = props.moduleContext.useStoreValue("selectedVector2");

    const highlightedTrace = props.moduleContext.useStoreValue("highlightedTrace");
    const setHighlightedTrace = props.moduleContext.useSetStoreValue("highlightedTrace");
    const xAxisRange = props.moduleContext.useStoreValue("xAxisRange");
    const setxAxisRange = props.moduleContext.useSetStoreValue("xAxisRange");

    const queryVector = (vector: string) => useQuery([sumoCaseId, sumoIterationId, vector], async (): Promise<VectorRealizationData[]> => {
        return apiService.timeseries.getRealizationsVectorData(sumoCaseId, sumoIterationId, vector)
    })
    const vectorData = queryVector(selectedVector)
    const vectorData2 = queryVector(selectedVector2)

    return (
        <>
            <PlotlyLineChart
                data={(vectorData?.data) ? realizationDataToTraces(vectorData.data, highlightedTrace) : []}
                layout={{ autosize: true, title: selectedVector, ...plotLayout(xAxisRange) }}
                onHover={(data: any) => { setHighlightedTrace(getTraceNumberFromHoverData(data)) }}
                onRelayout={(data: any) => { setxAxisRange(getXaxisRangeFromLayoutChange(data)) }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}

            />
            <PlotlyLineChart
                data={(vectorData2?.data) ? realizationDataToTraces(vectorData2.data, highlightedTrace) : []}
                layout={{ autosize: true, title: selectedVector, ...plotLayout(xAxisRange) }}
                onHover={(data: any) => { setHighlightedTrace(getTraceNumberFromHoverData(data)) }}
                onRelayout={(data: any) => { setxAxisRange(getXaxisRangeFromLayoutChange(data)) }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}

            />
        </>
    )

}
import React from 'react';
import Plot from 'react-plotly.js';

import { VectorRealizationData } from "@api"
import { Layout, PlotData, PlotHoverEvent, PlotMouseEvent, PlotRelayoutEvent } from "plotly.js";


export interface PlotlyTimeSeriesProps {
    vectorRealizationsData: VectorRealizationData[];
    onClickData?: (data: any) => void;
    onHoverData?: (data: any) => void;
    highlightedRealization?: number;
    height?: number | 100
    width?: number | 100
}
interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;

    // Did they forget to expose this one
    legendrank?: number;
}
const PlotlyTimeSeries: React.FC<PlotlyTimeSeriesProps> = ({
    vectorRealizationsData,
    onClickData,
    onHoverData,
    highlightedRealization,
    height,
    width
}) => {
    const tracesDataArr: TraceData[] = [];
    let highLightedTrace: TraceData | null = null
    for (let i = 0; i < vectorRealizationsData.length; i++) {
        const vec = vectorRealizationsData[i]
        const lineShape = vec.is_rate ? "vh" : "linear";
        const isHighlighted = (highlightedRealization && i == highlightedRealization) ? true : false
        const trace: TraceData = (
            {
                x: vec.timestamps,
                y: vec.values,
                name: `real-${vec.realization}`,
                realizationNumber: vec.realization,
                legendrank: vec.realization,
                type: "scatter",
                mode: "lines",
                line: { color: isHighlighted ? "red" : "blue", width: isHighlighted ? 3 : 1, shape: lineShape },
            });
        isHighlighted ? highLightedTrace = trace : tracesDataArr.push(trace)
    };
    highLightedTrace && tracesDataArr.push(highLightedTrace)

    const handleClick = (e: PlotMouseEvent) => {
        if (onClickData) {
            if (e.points.length > 0 && typeof e.points[0]) {
                onClickData(e.points[0].x as number)
            }
        }

    };

    const handleHover = (e: PlotHoverEvent) => {
        if (onHoverData) {
            if (e.points.length > 0 && typeof e.points[0]) {
                const traceData: TraceData = e.points[0].data
                onHoverData(traceData.realizationNumber)
            }
        }
    };
    const layout: Partial<Layout> = {
        width: width,
        height: height,

    };
    return (
        <Plot
            data={tracesDataArr}
            layout={layout}
            onClick={handleClick}
            onHover={handleHover}
        />
    );
};

export default PlotlyTimeSeries;
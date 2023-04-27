import React from 'react';
import Plot from 'react-plotly.js';


import { Layout, PlotData, PlotHoverEvent } from "plotly.js";


export interface PlotlyScatterProps {
    x: number[];
    y: number[];
    realizations: number[];
    onClickData?: (data: any) => void;
    onHoverData?: (data: any) => void;
    highlightedRealization?: number;
    height?: number | 100
    width?: number | 100
}
interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

const PlotlyScatter: React.FC<PlotlyScatterProps> = ({
    x,
    y,
    realizations,
    onClickData,
    onHoverData,
    highlightedRealization,
    height,
    width
}) => {
    const colors = realizations.map(real => {
        return real == highlightedRealization ? "red" : "blue"
    })
    const tracesDataArr: TraceData[] = [{
        "y": y,
        "x": x,
        "customdata": realizations,
        "orientation": "h",
        "type": "scatter",
        "mode": "markers",
        "marker": { "color": colors, "size": 20 }
    }];

    const handleClick = (data: any) => {
        if (onClickData) {
            onClickData(data);
        }
    };

    const handleHover = (e: PlotHoverEvent) => {
        if (onHoverData) {
            if (e.points.length > 0 && typeof e.points[0]) {
                onHoverData(e.points[0].customdata)
            }
        }
    };
    const layout: Partial<Layout> = {
        width: width,
        height: height,
        xaxis: { zeroline: false },
        yaxis: { zeroline: false }

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

export default PlotlyScatter;

import React from 'react';
import Plot from 'react-plotly.js';

import { EnsembleCorrelations } from "@api"
import { Layout, PlotData } from "plotly.js";


export interface PlotlyCorrelationProps {
    ensembleCorrelations: EnsembleCorrelations;
    selectedParameterName?: string,
    onClickData?: (data: any) => void;
    onHoverData?: (data: any) => void;
    height?: number | 100
    width?: number | 100
}


const PlotlyCorrelation: React.FC<PlotlyCorrelationProps> = ({
    ensembleCorrelations,
    onClickData,
    onHoverData,
    selectedParameterName,
    height,
    width
}) => {
    const colors = ensembleCorrelations.names.map(parameterName => {
        return parameterName === selectedParameterName ? "red" : "blue"
    })
    const tracesDataArr: Partial<PlotData>[] = [{
        "y": ensembleCorrelations.names,
        "x": ensembleCorrelations.values,
        "orientation": "h",
        "type": "bar",
        "marker": { "color": colors },
    }];

    const handleClick = (data: any) => {
        if (onClickData && data.points) {
            onClickData([data.points[0].x, data.points[0].y]);
        }
    };

    const handleHover = (data: any) => {
        if (onHoverData) {
            onHoverData(data);
        }
    };
    const layout: Partial<Layout> = {
        width: width,
        height: height,
        margin: { l: 500 }

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

export default PlotlyCorrelation;
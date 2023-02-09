import React from "react";

import Plotly from "plotly.js-basic-dist";
import createPlotlyComponent from "react-plotly.js/factory";
import { PlotParams } from "react-plotly.js";
const Plot = createPlotlyComponent(Plotly);



export const PlotlyLineChart: React.FC<PlotParams> = (props) => {
    return (
        <Plot {...props} />
    )
}

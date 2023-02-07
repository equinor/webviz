import React from "react";

import Plotly from "plotly.js/dist/plotly";

export interface ChartProps {
    data?: Plotly.Data[];
    layout: Partial<Plotly.Layout>;
    frames?: Plotly.Frame[];
    config?: Partial<Plotly.Config>;

    // react-specific
    style?: React.CSSProperties;
}



export const PlotlyLineChart: React.FC<ChartProps> = ({ style = {}, data, ...props }) => {
    const ref = React.useRef<Plotly.Chart>(null);

    React.useEffect(() => {
        if (!Object.prototype.hasOwnProperty.call(ref?.current, "data")) {
            console.log("new plot")
            Plotly.newPlot(ref.current, { data, ...props });
        } else {
            console.log("update plot")
            console.log(data)
            Plotly.react(
                ref.current,
                { data, ...props },
                {
                    transition: {
                        duration: 500,
                        easing: "cubic-in-out",
                    },
                    frame: {
                        duration: 100,
                    },
                }
            );
        }
    }, [props, data]);
    return <div ref={ref} style={style} />;
};


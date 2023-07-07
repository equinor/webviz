import React from "react";
import PlotlyPlot, { Figure, PlotParams } from "react-plotly.js";

import { isEqual } from "lodash";

export const Plot: React.FC<PlotParams> = (props) => {
    const { data, layout, frames, ...rest } = props;
    const [state, setState] = React.useState<Figure>({
        data,
        layout,
        frames: frames || null,
    });

    const [prevLayout, setPrevLayout] = React.useState<Partial<Figure["layout"]>>(layout);

    React.useEffect(() => {
        setState((prev) => ({ ...prev, data }));
    }, [data]);

    React.useEffect(() => {
        if (isEqual(layout, prevLayout)) return;

        setState((prev) => ({ ...prev, layout }));
        setPrevLayout(layout);
    }, [layout, prevLayout]);

    React.useEffect(() => {
        setState((prev) => ({ ...prev, frames: frames || null }));
    }, [frames]);

    const handleInitialized = (figure: Figure) => {
        setState(figure);
    };

    const handleUpdate = (figure: Figure) => {
        setState(figure);
    };

    return (
        <PlotlyPlot
            {...rest}
            data={state.data}
            layout={state.layout}
            frames={state.frames || undefined}
            onInitialized={handleInitialized}
            onUpdate={handleUpdate}
        />
    );
};

Plot.displayName = "Plot";

import React from "react";
import PlotlyPlot, { Figure, PlotParams } from "react-plotly.js";

import { isEqual } from "lodash";

export const Plot: React.FC<PlotParams> = (props) => {
    const { data: propsData, layout: propsLayout, frames: propsFrames, ...rest } = props;

    const [data, setData] = React.useState<Plotly.Data[]>(propsData);
    const [layout, setLayout] = React.useState<Partial<Plotly.Layout>>(propsLayout);
    const [frames, setFrames] = React.useState<Plotly.Frame[] | null>(propsFrames || null);

    React.useEffect(() => {
        setData((prev) => {
            if (isEqual(prev, propsData)) return prev;

            console.debug("Plot: propsData changed, setting data");
            return propsData;
        });
    }, [propsData]);

    React.useEffect(() => {
        setLayout((prev) => {
            if (isEqual(prev, propsLayout)) return prev;

            console.debug("Plot: propsLayout changed, setting layout");
            return propsLayout;
        });
    }, [propsLayout]);

    React.useEffect(() => {
        setFrames((prev) => {
            if (isEqual(prev, propsFrames)) return prev;

            console.debug("Plot: propsData changed, setting data");
            return propsFrames || null;
        });
    }, [propsFrames]);

    const handleInitialized = (figure: Figure) => {
        console.debug("Plot: handleInitialized", figure);
        setLayout(figure.layout);
        setData(figure.data);
        setFrames(figure.frames || null);
    };

    const handleUpdate = (figure: Figure) => {
        console.debug("Plot: handleUpdate", figure);
        if (!isEqual(layout, figure.layout)) {
            setLayout(figure.layout);
        }

        if (!isEqual(data, figure.data)) {
            setData(figure.data);
        }

        if (!isEqual(frames, figure.frames)) {
            setFrames(figure.frames || null);
        }
    };

    return (
        <PlotlyPlot
            {...rest}
            data={data}
            layout={layout}
            frames={frames || undefined}
            onInitialized={handleInitialized}
            onUpdate={handleUpdate}
        />
    );
};

Plot.displayName = "Plot";

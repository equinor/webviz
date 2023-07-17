import React from "react";
import PlotlyPlot, { Figure, PlotParams } from "react-plotly.js";

import { cloneDeep, isEqual } from "lodash";
import Plotly from "plotly.js";

export const Plot: React.FC<PlotParams> = (props) => {
    const { data: propsData, layout: propsLayout, frames: propsFrames, onHover: propsOnHover, ...rest } = props;

    const hoverTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const [data, setData] = React.useState<Plotly.Data[]>(propsData);
    const [layout, setLayout] = React.useState<Partial<Plotly.Layout>>(propsLayout);
    const [frames, setFrames] = React.useState<Plotly.Frame[] | null>(propsFrames || null);
    const [prevData, setPrevData] = React.useState<Plotly.Data[]>(propsData);
    const [prevLayout, setPrevLayout] = React.useState<Partial<Plotly.Layout>>(propsLayout);
    const [prevFrames, setPrevFrames] = React.useState<Plotly.Frame[] | null>(propsFrames || null);

    React.useEffect(() => {
        return () => {
            if (hoverTimeout.current) {
                clearTimeout(hoverTimeout.current);
            }
        };
    }, []);

    if (!isEqual(propsData, prevData)) {
        setData(cloneDeep(propsData));
        setPrevData(cloneDeep(propsData));
    }

    if (!isEqual(prevLayout, propsLayout)) {
        setLayout({ ...layout, ...cloneDeep(propsLayout) });
        setPrevLayout(cloneDeep(propsLayout));
    }

    if (!isEqual(prevFrames, propsFrames || null)) {
        setFrames(cloneDeep(propsFrames || null));
        setPrevFrames(cloneDeep(propsFrames || null));
    }

    function handleInitialized(figure: Figure) {
        setLayout(figure.layout);
        setData(figure.data);
        setFrames(figure.frames || null);
    }

    function handleUpdate(figure: Figure) {
        if (!isEqual(layout, figure.layout)) {
            setLayout(figure.layout);
        }
        if (!isEqual(data, figure.data)) {
            setData(figure.data);
        }
        if (!isEqual(frames, figure.frames)) {
            setFrames(figure.frames || null);
        }
    }

    function handleRelayout(e: Plotly.PlotRelayoutEvent) {
        setLayout({
            ...layout,
            xaxis: {
                ...layout.xaxis,
                range: [e["xaxis.range[0]"], e["xaxis.range[1]"]],
                autorange: e["xaxis.autorange"],
            },
            yaxis: {
                ...layout.yaxis,
                range: [e["yaxis.range[0]"], e["yaxis.range[1]"]],
                autorange: e["yaxis.autorange"],
            },
        });
    }

    function handleHover(event: Readonly<Plotly.PlotHoverEvent>) {
        if (propsOnHover) {
            if (hoverTimeout.current) {
                clearTimeout(hoverTimeout.current);
            }
            hoverTimeout.current = setTimeout(() => {
                if (propsOnHover) {
                    propsOnHover(event);
                }
            }, 180);
        }
    }

    return (
        <PlotlyPlot
            {...rest}
            config={{
                modeBarButtons: [["pan2d", "autoScale2d", "zoomIn2d", "zoomOut2d", "toImage"]],
                displaylogo: false,
                ...props.config,
            }}
            data={data}
            layout={layout}
            frames={frames || undefined}
            onInitialized={handleInitialized}
            onUpdate={handleUpdate}
            onRelayout={handleRelayout}
            onHover={handleHover}
        />
    );
};

Plot.displayName = "Plot";

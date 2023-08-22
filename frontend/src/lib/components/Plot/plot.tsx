import React from "react";
import PlotlyPlot, { Figure, PlotParams } from "react-plotly.js";

import { cloneDeep, isEqual } from "lodash";
import Plotly from "plotly.js";
import { v4 } from "uuid";

export const Plot: React.FC<PlotParams> = (props) => {
    const { data: propsData, layout: propsLayout, frames: propsFrames, onHover: propsOnHover, ...rest } = props;

    const [data, setData] = React.useState<Plotly.Data[]>(propsData);
    const [layout, setLayout] = React.useState<Partial<Plotly.Layout>>(propsLayout);
    const [frames, setFrames] = React.useState<Plotly.Frame[] | null>(propsFrames || null);
    const [prevData, setPrevData] = React.useState<Plotly.Data[]>(propsData);
    const [prevLayout, setPrevLayout] = React.useState<Partial<Plotly.Layout>>(propsLayout);
    const [prevFrames, setPrevFrames] = React.useState<Plotly.Frame[] | null>(propsFrames || null);
    const id = React.useRef<string>(`plot-${v4()}`);

    const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const eventsDisabled = React.useRef(false);

    React.useEffect(() => {
        function handleWheel() {
            console.debug("wheel");
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
            eventsDisabled.current = true;
            timeout.current = setTimeout(() => {
                eventsDisabled.current = false;
            }, 500);
        }

        const element = document.getElementById(id.current);
        if (element) {
            element.addEventListener("wheel", handleWheel);
        }

        return () => {
            if (element) {
                element.removeEventListener("wheel", handleWheel);
            }

            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        };
    }, []);

    if (!isEqual(propsData, prevData)) {
        setData(cloneDeep(propsData));
        setPrevData(cloneDeep(propsData));
    }

    if (!isEqual(prevLayout, propsLayout)) {
        const clone = cloneDeep(propsLayout);
        setLayout({
            ...layout,
            ...clone,
        });
        setPrevLayout(cloneDeep(propsLayout));
        console.debug("layout changed");
    }

    if (!isEqual(prevFrames, propsFrames || null)) {
        setFrames(cloneDeep(propsFrames || null));
        setPrevFrames(cloneDeep(propsFrames || null));
    }

    const handleInitialized = React.useCallback(function handleInitialized(figure: Figure) {
        console.debug("initialized");
        setLayout(figure.layout);
        setData(figure.data);
        setFrames(figure.frames || null);
    }, []);

    // The problem that occurs is that handleRelayout is only called when the zoom ends, not during the zoom.
    // When hovering a trace and the data/layout gets updated on the outside, the ranges have not been stored yet and, hence, the plot jumps back to the original range.

    // Possible solutions:

    const handleRelayout = React.useCallback(function handleRelayout(e: Plotly.PlotRelayoutEvent) {
        console.debug("relayout");
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
    }, []);

    function handleHover(event: Readonly<Plotly.PlotHoverEvent>) {
        if (propsOnHover && !eventsDisabled.current) {
            propsOnHover(event);
        }
    }

    function handleRedraw() {
        console.debug("redraw");
    }

    function handleRestyle() {
        console.debug("restyle");
    }

    return (
        <PlotlyPlot
            {...rest}
            divId={id.current}
            config={{
                modeBarButtons: [["pan2d", "autoScale2d", "zoomIn2d", "zoomOut2d", "toImage"]],
                displaylogo: false,
                ...props.config,
            }}
            data={data}
            layout={layout}
            frames={frames || undefined}
            onInitialized={handleInitialized}
            onRelayout={handleRelayout}
            onHover={handleHover}
            onRedraw={handleRedraw}
            onRestyle={handleRestyle}
        />
    );
};

Plot.displayName = "Plot";

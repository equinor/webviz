import React from "react";
import PlotlyPlot, { Figure, PlotParams } from "react-plotly.js";

import { cloneDeep, isEqual } from "lodash";
import Plotly from "plotly.js";
import { v4 } from "uuid";

export const Plot: React.FC<PlotParams> = (props) => {
    const {
        data: propsData,
        layout: propsLayout,
        frames: propsFrames,
        onHover: propsOnHover,
        onUnhover: propsOnUnhover,
        ...rest
    } = props;

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
        // When zooming in, the relayout function is only called once there hasn't been a wheel event in a certain time.
        // However, the hover event would still be sent and might update the data, causing a layout change and, hence,
        // a jump in the plot's zoom. To prevent this, we disable the hover event for a certain time after a wheel event.
        function handleWheel() {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
            eventsDisabled.current = true;
            timeout.current = setTimeout(() => {
                eventsDisabled.current = false;
            }, 500);
        }

        function handleTouchZoom(e: TouchEvent) {
            if (e.touches.length === 2) {
                handleWheel();
            }
        }

        const element = document.getElementById(id.current);
        if (element) {
            element.addEventListener("wheel", handleWheel);
            element.addEventListener("touchmove", handleTouchZoom);
        }

        return () => {
            if (element) {
                element.removeEventListener("wheel", handleWheel);
                element.removeEventListener("touchmove", handleTouchZoom);
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

    const handleRelayout = React.useCallback(function handleRelayout(e: Plotly.PlotRelayoutEvent) {
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
        return;
    }

    function handleUnhover(event: Readonly<Plotly.PlotMouseEvent>) {
        if (propsOnUnhover && !eventsDisabled.current) {
            propsOnUnhover(event);
        }
        return;
    }

    function handleUpdate(figure: Readonly<Figure>, graphDiv: Readonly<HTMLElement>) {
        console.debug("update");
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
            onUnhover={handleUnhover}
            onUpdate={handleUpdate}
        />
    );
};

Plot.displayName = "Plot";

import React from "react";
import PlotlyPlot, { Figure, PlotParams } from "react-plotly.js";

import { cloneDeep, differenceWith, isEqual, toPairs } from "lodash";
import Plotly from "plotly.js";

function applyChanges(old: any, changes: any) {
    if (typeof old === "object") {
        if (Array.isArray(old)) {
            applyChangesToArray(old, changes);
        } else {
            applyChangesToObject(old, changes);
        }
    } else {
        old = changes;
    }
}

function applyChangesToArray(array: Array<any>, changes: Array<any>) {
    for (const change of changes) {
        const index = array.findIndex((item) => isEqual(item, change));
        if (index === -1) {
            array.push(change);
        } else {
            const value = change;
            applyChanges(array[index], value);
        }
    }
}

function applyChangesToObject(obj: Record<string, any>, changes: Record<string, any>) {
    for (const key in changes) {
        if (!(key in obj)) {
            obj[key] = changes[key];
        } else {
            const value = changes[key];
            applyChanges(obj[key], value);
        }
    }
}

export const Plot: React.FC<PlotParams> = (props) => {
    const { data: propsData, layout: propsLayout, frames: propsFrames, ...rest } = props;

    const [data, setData] = React.useState<Plotly.Data[]>(propsData);
    const [layout, setLayout] = React.useState<Partial<Plotly.Layout>>(propsLayout);
    const [frames, setFrames] = React.useState<Plotly.Frame[] | null>(propsFrames || null);

    const [ranges, setRanges] = React.useState<{
        xMin?: Plotly.Datum;
        xMax?: Plotly.Datum;
        yMin?: Plotly.Datum;
        yMax?: Plotly.Datum;
    }>({
        xMin: 0,
        xMax: 0,
        yMin: 0,
        yMax: 0,
    });

    const [prevData, setPrevData] = React.useState<Plotly.Data[]>(propsData);
    const [prevLayout, setPrevLayout] = React.useState<Partial<Plotly.Layout>>(propsLayout);
    const [prevFrames, setPrevFrames] = React.useState<Plotly.Frame[] | null>(propsFrames || null);

    React.useEffect(() => {
        if (isEqual(prevData, propsData)) return;
        console.info("Plot: data changed");
        console.info(differenceWith(propsData, prevData, isEqual));
        setData(cloneDeep(propsData));
        setPrevData(cloneDeep(propsData));
    }, [propsData, prevData]);

    React.useEffect(() => {
        if (isEqual(prevLayout, propsLayout)) return;
        setLayout(cloneDeep(propsLayout));
        setPrevLayout(cloneDeep(propsLayout));
    }, [propsLayout, prevLayout]);

    React.useEffect(() => {
        if (isEqual(prevFrames, propsFrames)) return;
        console.info("Plot: frames changed");
        setFrames(cloneDeep(propsFrames || null));
        setPrevFrames(cloneDeep(propsFrames || null));
    }, [propsFrames, prevFrames]);

    const handleInitialized = (figure: Figure) => {
        setLayout(figure.layout);
        setData(figure.data);
        setFrames(figure.frames || null);
    };

    const handleUpdate = (figure: Figure) => {
        if (!isEqual(layout, figure.layout)) {
            setLayout(figure.layout);
            console.info("Plot: layout updated");
        }
        if (!isEqual(data, figure.data)) {
            setData(figure.data);
            console.info("Plot: data updated");
        }
        if (!isEqual(frames, figure.frames)) {
            setFrames(figure.frames || null);
            console.info("Plot: frames updated");
        }
    };

    const handleRelayout = (e: Plotly.PlotRelayoutEvent) => {
        setRanges({
            xMin: e["xaxis.range[0]"],
            xMax: e["xaxis.range[1]"],
            yMin: e["yaxis.range[0]"],
            yMax: e["yaxis.range[1]"],
        });
    };

    return (
        <PlotlyPlot
            {...rest}
            data={data}
            layout={{ ...layout, ...ranges }}
            frames={frames || undefined}
            onInitialized={handleInitialized}
            onUpdate={handleUpdate}
            onRelayout={handleRelayout}
        />
    );
};

Plot.displayName = "Plot";

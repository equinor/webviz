import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useSize } from "@lib/hooks/useSize";

import { Data, Layout, PlotHoverEvent } from "plotly.js";

import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const exponent = props.moduleContext.useStoreValue("exponent");
    const ref = React.useRef<HTMLDivElement>(null);
    const size = useSize(ref);
    const x = [];
    const y = [];

    const timestamp = new Date().getTime();
    for (let i = 0; i < 100; i++) {
        x.push(new Date(timestamp + i * 24 * 60 * 60 * 1000));
        y.push(i ** exponent);
    }

    const plotlyHover = useSubscribedValue("global.timestamp", props.workbenchServices);

    const handleHover = (e: PlotHoverEvent) => {
        if (e.xvals.length > 0 && typeof e.xvals[0]) {
            props.workbenchServices.publishGlobalData("global.timestamp", { timestamp: e.xvals[0] as number });
        }
    };

    const data: Data[] = [{ x, y, type: "scatter", mode: "lines+markers", marker: { color: "red" } }];
    const layout: Partial<Layout> = { width: size.width, height: size.height, title: "Simulation Time Series" };
    if (plotlyHover) {
        layout["shapes"] = [
            {
                type: "line",
                xref: "x",
                yref: "paper",
                x0: new Date(plotlyHover.timestamp),
                y0: 0,
                x1: new Date(plotlyHover.timestamp),
                y1: 1,
                line: {
                    color: "#ccc",
                    width: 1,
                },
            },
        ];
    }

    return (
        <div className="w-full h-full" ref={ref}>
            <Plot data={data} layout={layout} onHover={handleHover} />
        </div>
    );
};

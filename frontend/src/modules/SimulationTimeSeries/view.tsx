import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { Dropdown } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Table, TableLayoutDirection } from "@lib/components/Table";
import { useSize } from "@lib/hooks/useSize";

import { Data, Layout, PlotHoverEvent } from "plotly.js";

import { State } from "./state";

const timestamp = new Date().getTime();

export const view = (props: ModuleFCProps<State>) => {
    const exponent = props.moduleContext.useStoreValue("exponent");
    const [view, setView] = React.useState<"table" | "plot" | "both">("table");
    const ref = React.useRef<HTMLDivElement>(null);
    const size = useSize(ref);
    const series = React.useMemo(() => {
        const series = [];
        for (let i = 0; i < 50000; i++) {
            series.push({ datetime: timestamp + i * 24 * 60 * 60 * 1000, b: i ** exponent, c: i ** exponent });
        }
        return series;
    }, [exponent]);

    const x = React.useMemo(() => series.map((el) => new Date(el.datetime)), [series]);
    const y = React.useMemo(() => series.map((el) => el.b), [series]);

    const plotlyHover = useSubscribedValue("global.timestamp", props.workbenchServices);

    const handleHover = (e: PlotHoverEvent) => {
        if (e.xvals.length > 0 && typeof e.xvals[0]) {
            props.workbenchServices.publishGlobalData("global.timestamp", { timestamp: e.xvals[0] as number });
        }
    };

    const data: Data[] = [{ x, y, type: "scatter", mode: "lines+markers", marker: { color: "red" } }];
    const layout: Partial<Layout> = {
        width: size.width,
        height: view === "both" ? size.height / 2 : size.height,
        title: "Simulation Time Series",
    };

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
        <div className="w-full h-full flex flex-col">
            <div>
                <RadioGroup
                    options={[
                        { label: "Plot", value: "plot" },
                        { label: "Table", value: "table" },
                        { label: "Both", value: "both" },
                    ]}
                    value={view}
                    onChange={(_, value) => setView(value as "plot" | "table" | "both")}
                    direction="horizontal"
                />
                <Dropdown />
            </div>
            <div className="flex-grow h-0" ref={ref}>
                {view !== "table" && <Plot data={data} layout={layout} onHover={handleHover} />}
                {view !== "plot" && (
                    <Table
                        width={size.width}
                        height={view === "both" ? size.height / 2 : size.height}
                        layoutDirection={TableLayoutDirection.Vertical}
                        headings={{
                            datetime: {
                                label: "Datetime",
                                sizeInPercent: 50,
                                format: (value) => new Date(value).toLocaleDateString(),
                            },
                            b: { label: "B", sizeInPercent: 25 },
                            c: { label: "C", sizeInPercent: 25 },
                        }}
                        series={series}
                        onHover={(series) => {
                            props.workbenchServices.publishGlobalData("global.timestamp", {
                                timestamp: series.datetime as number,
                            });
                        }}
                        highlightFilter={(series) => series.datetime === plotlyHover?.timestamp}
                    />
                )}
            </div>
        </div>
    );
};

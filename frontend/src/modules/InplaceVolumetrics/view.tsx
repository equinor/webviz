import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

import { BroadcastChannelNames, broadcastChannelsDef } from "./broadcastChannel";
import { useRealizationsResponseQuery } from "./queryHooks";
import { VolumetricResponseAbbreviations } from "./settings";
import { State } from "./state";

import { Body_get_realizations_response } from "../../api/models/Body_get_realizations_response";

export const view = (props: ModuleFCProps<State, typeof broadcastChannelsDef>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const ensemble = props.moduleContext.useStoreValue("ensemble");
    const tableName = props.moduleContext.useStoreValue("tableName");
    const responseName = props.moduleContext.useStoreValue("responseName");
    const categoryFilter = props.moduleContext.useStoreValue("categoricalFilter");
    const responseBody: Body_get_realizations_response = { categorical_filter: categoryFilter || undefined };
    const realizationsResponseQuery = useRealizationsResponseQuery(
        ensemble?.caseUuid ?? "",
        ensemble?.ensembleName ?? "",
        tableName,
        responseName,
        responseBody,
        true
    );
    const subscribedPlotlyRealization = useSubscribedValue("global.hoverRealization", props.workbenchServices);
    const tracesDataArr: Partial<PlotData>[] = [];
    if (realizationsResponseQuery.data && realizationsResponseQuery.data.realizations.length > 0) {
        const x: number[] = [];
        const y: number[] = [];
        const color: string[] = [];
        for (let i = 0; i < realizationsResponseQuery.data.realizations.length; i++) {
            const realization = realizationsResponseQuery.data.realizations[i];
            const curveColor = realization === subscribedPlotlyRealization?.realization ? "red" : "green";
            x.push(realization);
            y.push(realizationsResponseQuery.data.values[i]);
            color.push(curveColor);
        }
        const trace: Partial<PlotData> = {
            x: x,
            y: y,
            type: "bar",
            marker: {
                color: color,
            },
        };
        tracesDataArr.push(trace);
    }
    const handleHover = (e: PlotHoverEvent) => {
        const realization = e.points[0].x;
        if (typeof realization === "number") {
            props.workbenchServices.publishGlobalData("global.hoverRealization", {
                realization: realization,
            });
        }
    };

    function handleUnHover() {
        props.workbenchServices.publishGlobalData("global.hoverRealization", { realization: -1 });
    }

    React.useEffect(
        function broadcast() {
            const data: { realization: number; value: number }[] = [];
            if (realizationsResponseQuery.data) {
                realizationsResponseQuery.data.realizations.forEach((realization, index) => {
                    data.push({
                        realization: realization,
                        value: realizationsResponseQuery.data.values[index],
                    });
                });
            }
            props.moduleContext.getChannel(BroadcastChannelNames.Response).broadcast(data);
        },
        [realizationsResponseQuery.data]
    );

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        title: VolumetricResponseAbbreviations[responseName as keyof typeof VolumetricResponseAbbreviations] || "",
        xaxis: { title: "Realization" },
    };
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <ApiStateWrapper
                apiResult={realizationsResponseQuery}
                loadingComponent={<CircularProgress />}
                errorComponent={"feil"}
            >
                <Plot
                    data={tracesDataArr}
                    layout={layout}
                    config={{ scrollZoom: true }}
                    onHover={handleHover}
                    onUnhover={handleUnHover}
                />
            </ApiStateWrapper>
        </div>
    );
};

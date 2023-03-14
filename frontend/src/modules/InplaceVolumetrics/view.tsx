import React from "react";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useRealizationsResponseQuery } from "./queryHooks";
import { State } from "./state";
import Plot from "react-plotly.js";
import { Body_get_realizations_response } from "../../api/models/Body_get_realizations_response";
import { Layout, PlotHoverEvent, PlotData, PlotMouseEvent, PlotRelayoutEvent } from "plotly.js";
import { CircularProgress } from "@lib/components/CircularProgress";
import { VolumetricResponseAbbreviations } from "./settings";


export const view = (props: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const caseUuid = useSubscribedValue("navigator.caseId", props.workbenchServices);
    const ensembleName = props.moduleContext.useStoreValue("ensembleName");
    const tableName = props.moduleContext.useStoreValue("tableName");
    const responseName = props.moduleContext.useStoreValue("responseName");
    const categoryFilter = props.moduleContext.useStoreValue("categoricalFilter");
    const responseBody: Body_get_realizations_response = { categorical_filter: categoryFilter || undefined }
    const realizationsResponseQuery = useRealizationsResponseQuery(caseUuid, ensembleName, tableName, responseName, responseBody, true);
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
            type: "bar", marker: {
                color: color
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
    }

    function handleUnHover(e: PlotMouseEvent) {
        props.workbenchServices.publishGlobalData("global.hoverRealization", { realization: -1 });
    }

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        title: VolumetricResponseAbbreviations[responseName as keyof typeof VolumetricResponseAbbreviations] || "",
        xaxis: { title: "Realization" }

    };
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <ApiStateWrapper apiResult={realizationsResponseQuery} loadingComponent={<CircularProgress />} errorComponent={"feil"} >
                <Plot data={tracesDataArr} layout={layout} config={{ "scrollZoom": true }} onHover={handleHover} onUnhover={handleUnHover} />
            </ApiStateWrapper>
        </div>
    );
};

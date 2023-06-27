import React from "react";
import Plot from "react-plotly.js";

import { Body_get_realizations_response_api } from "@api";
import { BroadcastChannelMeta } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

import { BroadcastChannelNames } from "./channelDefs";
import { useRealizationsResponseQuery } from "./queryHooks";
import { VolumetricResponseAbbreviations } from "./settings";
import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const ensembleIdent = props.moduleContext.useStoreValue("ensembleIdent");
    const tableName = props.moduleContext.useStoreValue("tableName");
    const responseName = props.moduleContext.useStoreValue("responseName");
    const categoryFilter = props.moduleContext.useStoreValue("categoricalFilter");
    const responseBody: Body_get_realizations_response_api = { categorical_filter: categoryFilter || undefined };
    const realizationsResponseQuery = useRealizationsResponseQuery(
        ensembleIdent?.getCaseUuid() ?? "",
        ensembleIdent?.getEnsembleName() ?? "",
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

        props.moduleContext.setInstanceTitle(
            VolumetricResponseAbbreviations[responseName as keyof typeof VolumetricResponseAbbreviations] || ""
        );
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

    const ensemble = ensembleIdent ? props.workbenchSession.getEnsembleSet().findEnsemble(ensembleIdent) : null;

    React.useEffect(
        function broadcast() {
            if (!ensemble) {
                return;
            }

            const dataGenerator = (): { key: number; value: number }[] => {
                const data: { key: number; value: number }[] = [];
                if (realizationsResponseQuery.data) {
                    realizationsResponseQuery.data.realizations.forEach((realization, index) => {
                        data.push({
                            key: realization,
                            value: realizationsResponseQuery.data.values[index],
                        });
                    });
                }
                return data;
            };

            const channelMeta: BroadcastChannelMeta = {
                ensembleIdent: ensemble.getIdent(),
                description: `${ensemble.getDisplayName()} ${tableName ?? ""} ${responseName ?? ""}`,
                unit: "",
            };

            props.moduleContext.getChannel(BroadcastChannelNames.Response).broadcast(channelMeta, dataGenerator);
        },
        [realizationsResponseQuery.data, ensemble, tableName, responseName]
    );

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        margin: { t: 0, r: 0, l: 40, b: 40 },
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

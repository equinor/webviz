import React from "react";
import Plot from "react-plotly.js";

import { Body_get_realizations_response_api } from "@api";
import { DataElement, KeyType } from "@framework/DataChannelTypes";
import { ModuleViewProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { CircularProgress } from "@lib/components/CircularProgress";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

import { ChannelIds } from "./channelDefs";
import { Interfaces } from "./interfaces";
import { useRealizationsResponseQuery } from "./queryHooks";
import { VolumetricResponseAbbreviations } from "./settings/settings";

export const View = (props: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const ensembleIdent = props.viewContext.useSettingsToViewInterfaceValue("ensembleIdent");
    const tableName = props.viewContext.useSettingsToViewInterfaceValue("tableName");
    const responseName = props.viewContext.useSettingsToViewInterfaceValue("responseName");
    const categoryFilter = props.viewContext.useSettingsToViewInterfaceValue("categoricalFilter");
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
    }

    React.useEffect(() => {
        props.viewContext.setInstanceTitle(
            VolumetricResponseAbbreviations[responseName as keyof typeof VolumetricResponseAbbreviations] || ""
        );
    }, [props.viewContext, responseName]);

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

    function dataGenerator() {
        const data: DataElement<KeyType.NUMBER>[] = [];
        if (realizationsResponseQuery.data) {
            realizationsResponseQuery.data.realizations.forEach((realization, index) => {
                data.push({
                    key: realization,
                    value: realizationsResponseQuery.data.values[index],
                });
            });
        }
        return { data: data, metaData: { ensembleIdentString: ensembleIdent?.toString() ?? "" } };
    }

    props.viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE,
        dependencies: [realizationsResponseQuery.data, ensemble, tableName, responseName],
        contents: [{ contentIdString: responseName || "", displayName: responseName || "", dataGenerator }],
    });

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        margin: { t: 0, r: 0, l: 40, b: 40 },
        xaxis: { title: "Realization" },
    };
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <QueryStateWrapper
                queryResult={realizationsResponseQuery}
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
            </QueryStateWrapper>
        </div>
    );
};

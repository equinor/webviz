import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { Warning } from "@mui/icons-material";
import { WellCompletionsPlot } from "@webviz/well-completions-plot";

import { Interfaces } from "./interfaces";
import { DataLoadingStatus } from "./typesAndEnums";

export const View = ({ viewContext }: ModuleViewProps<Interfaces>) => {
    const wellCompletionsPlotId = React.useId();
    const statusWriter = useViewStatusWriter(viewContext);

    const disclaimerDivRef = React.useRef<HTMLDivElement>(null);
    const disclaimerDivRefHeight = useElementSize(disclaimerDivRef).height;

    const plotData = viewContext.useSettingsToViewInterfaceValue("plotData");
    const sortedCompletionDates = viewContext.useSettingsToViewInterfaceValue("sortedCompletionDates");
    const dataLoadingStatus = viewContext.useSettingsToViewInterfaceValue("dataLoadingStatus");

    statusWriter.setLoading(dataLoadingStatus === DataLoadingStatus.LOADING);

    return (
        <div className="h-full w-full">
            <div
                ref={disclaimerDivRef}
                className="flex items-center gap-2 p-2 justify-center bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700"
                title="The module awaits relevant metadata in SUMO"
            >
                <Warning />
                <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                    Zones/Layers are out of order in visualization while waiting for relevant metadata in SUMO
                </p>
            </div>
            <div style={{ height: `calc(100% - ${disclaimerDivRefHeight}px)` }}>
                {!plotData ? (
                    dataLoadingStatus === DataLoadingStatus.ERROR ? (
                        <ContentError>Error loading well completions data</ContentError>
                    ) : dataLoadingStatus === DataLoadingStatus.LOADING ? (
                        <ContentInfo>
                            <CircularProgress />
                        </ContentInfo>
                    ) : (
                        <></>
                    )
                ) : (
                    <WellCompletionsPlot
                        id={wellCompletionsPlotId}
                        sortedCompletionDates={sortedCompletionDates || []}
                        plotData={plotData}
                    />
                )}
            </div>
        </div>
    );
};

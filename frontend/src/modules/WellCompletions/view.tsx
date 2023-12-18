import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { WellCompletionsPlot } from "@webviz/well-completions-plot";

import { DataLoadingStatus, State } from "./state";

export const View = ({ moduleContext }: ModuleFCProps<State>) => {
    const wellCompletionsPlotId = React.useId();
    const statusWriter = useViewStatusWriter(moduleContext);

    const plotData = moduleContext.useStoreValue("plotData");
    const availableTimeSteps = moduleContext.useStoreValue("availableTimeSteps");
    const dataLoadingStatus = moduleContext.useStoreValue("dataLoadingStatus");

    statusWriter.setLoading(dataLoadingStatus === DataLoadingStatus.Loading);

    return (
        <div className="w-full h-full">
            {!plotData ? (
                dataLoadingStatus === DataLoadingStatus.Error ? (
                    <ContentError>Error loading well completions data</ContentError>
                ) : dataLoadingStatus === DataLoadingStatus.Loading ? (
                    <ContentInfo>
                        <CircularProgress />
                    </ContentInfo>
                ) : (
                    <></>
                )
            ) : (
                <WellCompletionsPlot
                    id={wellCompletionsPlotId}
                    timeSteps={availableTimeSteps || []}
                    plotData={plotData}
                />
            )}
        </div>
    );
};

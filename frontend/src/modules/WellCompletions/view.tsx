import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { WellCompletionsPlot } from "@webviz/well-completions-plot";

import { Interfaces } from "./interfaces";
import { DataLoadingStatus } from "./typesAndEnums";

export const View = ({ viewContext }: ModuleViewProps<Interfaces>) => {
    const wellCompletionsPlotId = React.useId();
    const statusWriter = useViewStatusWriter(viewContext);

    const plotData = viewContext.useSettingsToViewInterfaceValue("plotData");
    const sortedCompletionDates = viewContext.useSettingsToViewInterfaceValue("sortedCompletionDates");
    const dataLoadingStatus = viewContext.useSettingsToViewInterfaceValue("dataLoadingStatus");

    statusWriter.setLoading(dataLoadingStatus === DataLoadingStatus.LOADING);

    return (
        <div className="w-full h-full">
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
    );
};

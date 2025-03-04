import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DisclaimerWrapper } from "@lib/components/DisclaimerWrapper";
import { ContentError , ContentInfo } from "@modules/_shared/components/ContentMessage";
import { WellCompletionsPlot } from "@webviz/well-completions-plot";

import type { Interfaces } from "./interfaces";
import { DataLoadingStatus } from "./typesAndEnums";

export const View = ({ viewContext }: ModuleViewProps<Interfaces>) => {
    const wellCompletionsPlotId = React.useId();
    const statusWriter = useViewStatusWriter(viewContext);

    const plotData = viewContext.useSettingsToViewInterfaceValue("plotData");
    const sortedCompletionDates = viewContext.useSettingsToViewInterfaceValue("sortedCompletionDates");
    const dataLoadingStatus = viewContext.useSettingsToViewInterfaceValue("dataLoadingStatus");

    statusWriter.setLoading(dataLoadingStatus === DataLoadingStatus.LOADING);

    return (
        <DisclaimerWrapper
            disclaimerText="Zones/Layers are out of order in visualization while waiting for relevant metadata in SUMO"
            hoverText="The module awaits relevant metadata in SUMO"
        >
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
        </DisclaimerWrapper>
    );
};

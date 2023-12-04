import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { WellCompletionsPlot } from "@webviz/well-completions-plot";

import { DataLoadingStatus, State } from "./state";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
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
                    <ContentError>
                        <CircularProgress />
                    </ContentError>
                ) : (
                    <></>
                )
            ) : (
                <WellCompletionsPlot id="test_id" timeSteps={availableTimeSteps || []} plotData={plotData} />
            )}
        </div>
    );
};

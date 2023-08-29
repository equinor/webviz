import { ModuleFCProps } from "@framework/Module";
import { CircularProgress } from "@lib/components/CircularProgress";
import { WellCompletionsPlot } from "@webviz/well-completions-plot";

import { State } from "./state";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const plotData = moduleContext.useStoreValue("plotData");
    const availableTimeSteps = moduleContext.useStoreValue("availableTimeSteps");
    const dataLoadingStatus = moduleContext.useStoreValue("dataLoadingStatus");

    return (
        <div className="w-full h-full">
            {!plotData ? (
                dataLoadingStatus === "error" ? (
                    <div className="w-full h-full flex justify-center items-center text-red-500">
                        Error loading well completion data for selected Ensemble and realization
                    </div>
                ) : dataLoadingStatus === "loading" ? (
                    <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                        <CircularProgress />
                    </div>
                ) : (
                    <></>
                )
            ) : (
                <WellCompletionsPlot id="test_id" timeSteps={availableTimeSteps || []} plotData={plotData} />
            )}
        </div>
    );
};

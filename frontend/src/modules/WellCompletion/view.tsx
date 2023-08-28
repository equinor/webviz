import { ModuleFCProps } from "@framework/Module";
import { WellCompletionsPlot } from "@webviz/well-completions-plot";

import { State } from "./state";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const plotData = moduleContext.useStoreValue("plotData");
    const availableTimeSteps = moduleContext.useStoreValue("availableTimeSteps");

    return (
        <div className="w-full h-full">
            {/* NOTE: Use ApiStateWrapper or similar to have "loading" state?
             Note that the query is not handled here in the view, but in settings. Thus the loading state perhaps has to be set in the state? */}
            {!plotData ? (
                <div className="w-full h-full flex justify-center items-center">No data for selected ensemble</div>
            ) : (
                <WellCompletionsPlot id="test_id" timeSteps={availableTimeSteps || []} plotData={plotData} />
            )}
        </div>
    );
};

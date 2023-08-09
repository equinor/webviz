import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { WellCompletionsPlot } from "@webviz/well-completions-plot";

// TODO: Export this from the well-completions-plot package?
import { State } from "./state";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const plotData = moduleContext.useStoreValue("plotData");
    const availableTimeSteps = moduleContext.useStoreValue("availableTimeSteps");

    const ref = React.useRef<HTMLDivElement>(null);
    const moduleSize = useElementSize(ref);

    // NOTE: Move this to settings and set "filtered" plotData to state and use here!

    return (
        <div className="w-full h-full">
            {/* <ApiStateWrapper
                apiResult={wellCompletionQuery}
                errorComponent={<div className="text-red-500">Error loading well completions data</div>}
                loadingComponent={<CircularProgress />}
            >
                {plotData && (
                    <WellCompletionsPlot id="test_id" timeSteps={availableTimeSteps || []} plotData={plotData} />
                )}
            </ApiStateWrapper> */}
            {plotData && <WellCompletionsPlot id="test_id" timeSteps={availableTimeSteps || []} plotData={plotData} />}
        </div>
    );
};

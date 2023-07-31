import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
// import { WellCompletions } from "@webviz/subsurface-components";
import { WellCompletionsPlot } from "@webviz/well-completions-plot";
import { PlotData, Units, WellPlotData, Zone } from "@webviz/well-completions-plot/src/types/dataTypes";

// TODO: Export this from the well-completions-plot package?
import { useWellCompletionQuery } from "./queryHooks";
import { State } from "./state";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const ensembleIdent = moduleContext.useStoreValue("ensembleIdent");
    const realizationNumber = moduleContext.useStoreValue("realizationToInclude");

    const wellCompletionQuery = useWellCompletionQuery(
        ensembleIdent?.getCaseUuid(),
        ensembleIdent?.getEnsembleName(),
        realizationNumber
    );

    const wellCompletionQueryData = wellCompletionQuery.data?.json_data || null;

    // Filter well completions query data based on settings and provide to WellCompletionsPlot
    // Add settings to store

    // return (
    //     <div className="w-full h-full">
    //         <ApiStateWrapper
    //             apiResult={wellCompletionQuery}
    //             errorComponent={<div className="text-red-500">Error loading ensembles</div>}
    //             loadingComponent={<CircularProgress />}
    //         >
    //             {wellCompletionQueryData && <WellCompletions id="test_id" data={wellCompletionQueryData} />}
    //         </ApiStateWrapper>
    //     </div>
    // );
    const plotData: PlotData = {
        stratigraphy: [],
        wells: [],
        units: { kh: { unit: "mDm", decimalPlaces: 2 } },
    };

    return (
        <div className="w-full h-full">
            <ApiStateWrapper
                apiResult={wellCompletionQuery}
                errorComponent={<div className="text-red-500">Error loading ensembles</div>}
                loadingComponent={<CircularProgress />}
            >
                {wellCompletionQueryData && <WellCompletionsPlot id="test_id" timeSteps={[]} plotData={plotData} />}
            </ApiStateWrapper>
        </div>
    );
};

import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { WellCompletions } from "@webviz/subsurface-components";

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

    return (
        <div className="w-full h-full">
            <ApiStateWrapper
                apiResult={wellCompletionQuery}
                errorComponent={<div className="text-red-500">Error loading ensembles</div>}
                loadingComponent={<CircularProgress />}
            >
                {wellCompletionQueryData && <WellCompletions id="test_id" data={wellCompletionQueryData} />}
            </ApiStateWrapper>
        </div>
    );
};

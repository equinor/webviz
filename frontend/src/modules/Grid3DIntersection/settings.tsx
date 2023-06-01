import React, { useEffect } from "react";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { useGridModelNames, useGridParameterNames, useRealizations } from "./queryHooks";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import state from "./state";
//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices }: ModuleFCProps<state>) {
    // From Workbench
    const selectedEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const selectedEnsemble = selectedEnsembles?.[0] ?? { caseUuid: null, ensembleName: null };
    // State
    const [gridName, setGridName] = moduleContext.useStoreState("gridName");
    const [parameterName, setParameterName] = moduleContext.useStoreState("parameterName");
    const [realizations, setRealizations] = moduleContext.useStoreState("realizations");
    const [useStatistics, setUseStatistics] = moduleContext.useStoreState("useStatistics");

    // Queries
    const gridNamesQuery = useGridModelNames(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName);
    const parameterNamesQuery = useGridParameterNames(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, gridName);
    const realizationsQuery = useRealizations(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName);

    // Handle Linked query
    useEffect(() => {
        if (parameterNamesQuery.data) {
            if (gridName && parameterNamesQuery.data.find(name => name === parameterName)) {
                // New grid has same parameter
            } else {
                // New grid has different parameter. Set to first
                setParameterName(parameterNamesQuery.data[0])
            }
        }
    }, [parameterNamesQuery.data, parameterName])

    // If no grid names, stop here
    if (!gridNamesQuery.data) { return (<div>Select case: upscaled_grids_realistic_no_unc</div>) }

    const parameterNames = parameterNamesQuery.data ? parameterNamesQuery.data : []
    const allRealizations: string[] = realizationsQuery.data ? realizationsQuery.data.map(real => JSON.stringify(real)) : []


    return (
        <div>
            <ApiStateWrapper
                apiResult={gridNamesQuery}
                errorComponent={"Error loading vector names"}
                loadingComponent={<CircularProgress />}
            >
                <Label
                    text="Grid model"
                >
                    <Select
                        options={stringToOptions(gridNamesQuery.data)}
                        value={[gridName || gridNamesQuery.data[0]]}
                        onChange={(gridnames) => setGridName(gridnames[0])}
                        filter={true}
                        size={5}
                    />
                </Label>

                <Label
                    text="Grid parameter"
                >
                    <Select
                        options={stringToOptions(parameterNames || [])}
                        value={[parameterName || parameterNames[0]]}
                        onChange={(pnames) => setParameterName(pnames[0])}
                        filter={true}
                        size={5}

                    />
                </Label>

                <Label
                    text="Realizations"
                >
                    <Select
                        options={stringToOptions(allRealizations as any || [])}
                        value={realizations ? realizations : [allRealizations[0]]}
                        onChange={(reals) => setRealizations(reals)}
                        filter={true}
                        size={5}
                        multiple={useStatistics}
                    />
                </Label>
                <Checkbox label="Show mean parameter" checked={useStatistics} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUseStatistics(event.target.checked)} />
                {"(Select multiple realizations)"}

            </ApiStateWrapper>
        </div>
    );
}

const stringToOptions = (strings: string[]): SelectOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
}
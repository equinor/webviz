import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select, SelectOption } from "@lib/components/Select";

import { useGridModelNames, useGridParameterNames } from "./queryHooks";
import state from "./state";

//-----------------------------------------------------------------------------------------------------------
export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<state>) {
    // From Workbench
    const firstEnsemble = useFirstEnsembleInEnsembleSet(workbenchSession);

    // State
    const [gridName, setGridName] = settingsContext.useStoreState("gridName");
    const [parameterName, setParameterName] = settingsContext.useStoreState("parameterName");
    const [realizations, setRealizations] = settingsContext.useStoreState("realizations");
    const [useStatistics, setUseStatistics] = settingsContext.useStoreState("useStatistics");

    // Queries
    const firstCaseUuid = firstEnsemble?.getCaseUuid() ?? null;
    const firstEnsembleName = firstEnsemble?.getEnsembleName() ?? null;
    const gridNamesQuery = useGridModelNames(firstCaseUuid, firstEnsembleName);
    const parameterNamesQuery = useGridParameterNames(firstCaseUuid, firstEnsembleName, gridName);

    // Handle Linked query
    React.useEffect(() => {
        if (parameterNamesQuery.data) {
            if (gridName && parameterNamesQuery.data.find((name) => name === parameterName)) {
                // New grid has same parameter
            } else {
                // New grid has different parameter. Set to first
                setParameterName(parameterNamesQuery.data[0]);
            }
        }
    }, [parameterNamesQuery.data, parameterName, gridName, setParameterName]);

    // If no grid names, stop here
    if (!gridNamesQuery.data) {
        return <div>Select case: upscaled_grids_realistic_no_unc</div>;
    }

    const parameterNames = parameterNamesQuery.data ? parameterNamesQuery.data : [];
    const allRealizations: string[] = firstEnsemble
        ? firstEnsemble.getRealizations().map((real) => JSON.stringify(real))
        : [];

    return (
        <div>
            <QueryStateWrapper
                queryResult={gridNamesQuery}
                errorComponent={"Error loading vector names"}
                loadingComponent={<CircularProgress />}
            >
                <Label text="Grid model">
                    <Select
                        options={stringToOptions(gridNamesQuery.data)}
                        value={[gridName || gridNamesQuery.data[0]]}
                        onChange={(gridnames) => setGridName(gridnames[0])}
                        filter={true}
                        size={5}
                    />
                </Label>

                <Label text="Grid parameter">
                    <Select
                        options={stringToOptions(parameterNames)}
                        value={[parameterName || parameterNames[0]]}
                        onChange={(pnames) => setParameterName(pnames[0])}
                        filter={true}
                        size={5}
                    />
                </Label>

                <Label text="Realizations">
                    <Select
                        options={stringToOptions(allRealizations)}
                        value={realizations ? realizations : [allRealizations[0]]}
                        onChange={(reals) => setRealizations(reals)}
                        filter={true}
                        size={5}
                        multiple={useStatistics}
                    />
                </Label>
                <Checkbox
                    label="Show mean parameter"
                    checked={useStatistics}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUseStatistics(event.target.checked)}
                />
                {"(Select multiple realizations)"}
            </QueryStateWrapper>
        </div>
    );
}

const stringToOptions = (strings: string[]): SelectOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
};

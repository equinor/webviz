import React from "react";

import { EnsembleParameterDescription, VectorDescription } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";


import { useVectorsQuery, useGetParameterNamesQuery, useTimeStepsQuery } from "./queryHooks";
import { State } from "./state";


//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {

    const ensembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const [selectedVectorName, setSelectedVectorName] = React.useState<string>("");
    const [timeStep, setTimeStep] = moduleContext.useStoreState("timeStep");
    const [parameterName, setParameterName] = moduleContext.useStoreState("parameterName");
    const firstEnsemble = ensembles?.at(0) ?? null;
    const vectorsQuery = useVectorsQuery(firstEnsemble?.caseUuid, firstEnsemble?.ensembleName);
    const timeStepsQuery = useTimeStepsQuery(firstEnsemble?.caseUuid, firstEnsemble?.ensembleName);
    const parameterNamesQuery = useGetParameterNamesQuery(firstEnsemble?.caseUuid, firstEnsemble?.ensembleName)
    const computedVectorName = fixupVectorName(selectedVectorName, vectorsQuery.data);

    if (computedVectorName && computedVectorName !== selectedVectorName) {
        setSelectedVectorName(computedVectorName);
    }

    React.useEffect(
        function propagateVectorSpecToView() {
            if (firstEnsemble && computedVectorName) {
                moduleContext.getStateStore().setValue("vectorSpec", {
                    caseUuid: firstEnsemble.caseUuid,
                    caseName: firstEnsemble.caseName,
                    ensembleName: firstEnsemble.ensembleName,
                    vectorName: computedVectorName,
                });
            } else {
                moduleContext.getStateStore().setValue("vectorSpec", null);
            }
        },
        [firstEnsemble, computedVectorName]
    );

    function handleVectorSelectionChange(selectedVecNames: string[]) {
        console.log("handleVectorSelectionChange()");
        const newName = selectedVecNames[0] ?? "";
        setSelectedVectorName(newName);
    }


    return (
        <>
            <ApiStateWrapper
                apiResult={vectorsQuery}
                errorComponent={"Error loading vector names"}
                loadingComponent={<CircularProgress />}
            >
                <Label text="Vector">
                    <Select
                        options={makeVectorOptionItems(vectorsQuery.data)}
                        value={computedVectorName ? [computedVectorName] : []}
                        onChange={handleVectorSelectionChange}
                        filter={true}
                        size={5}
                    />
                </Label>
            </ApiStateWrapper>
            <ApiStateWrapper
                apiResult={timeStepsQuery}
                errorComponent={"Error loading vector names"}
                loadingComponent={<CircularProgress />}
            >
                <Label text="Timestep">
                    <Dropdown
                        options={makeTimeStepsOptions(timeStepsQuery.data)}
                        value={timeStep ? timeStep : undefined}
                        onChange={setTimeStep}

                    />
                </Label>
            </ApiStateWrapper>
            <ApiStateWrapper
                apiResult={parameterNamesQuery}
                errorComponent={"Error loading parameter names"}
                loadingComponent={<CircularProgress />}
            >
                <Label text="Parameter">
                    <Dropdown
                        options={makeParameterNamesOptionItems(parameterNamesQuery.data)}
                        value={parameterName ? parameterName : undefined}
                        onChange={setParameterName}
                    />
                </Label>
            </ApiStateWrapper>
        </>
    );
}

//-----------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------

function fixupVectorName(currVectorName: string, vectorDescriptionsArr: VectorDescription[] | undefined): string {
    if (!vectorDescriptionsArr || vectorDescriptionsArr.length === 0) {
        return "";
    }

    if (vectorDescriptionsArr.find((item) => item.name === currVectorName)) {
        return currVectorName;
    }

    return vectorDescriptionsArr[0].name;
}

function makeVectorOptionItems(vectorDescriptionsArr: VectorDescription[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (vectorDescriptionsArr) {
        for (const vec of vectorDescriptionsArr) {
            itemArr.push({ value: vec.name, label: vec.descriptive_name });
        }
    }
    return itemArr;
}

function makeParameterNamesOptionItems(parameters: EnsembleParameterDescription[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (parameters) {
        for (const parameter of parameters) {
            itemArr.push({ value: parameter.name, label: parameter.name });
        }
    }
    return itemArr;
}

function makeTimeStepsOptions(timesteps: string[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (timesteps) {
        for (const timestep of timesteps) {
            itemArr.push({ value: timestep, label: timestep });
        }
    }
    return itemArr;
}
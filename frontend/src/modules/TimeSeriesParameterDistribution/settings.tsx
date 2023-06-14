import React from "react";

import { EnsembleParameterDescription_api, VectorDescription_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { Ensemble } from "@shared-types/ensemble";

import { useGetParameterNamesQuery, useTimeStepsQuery, useVectorsQuery } from "./queryHooks";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    const availableEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const [selectedEnsemble, setSelectedEnsemble] = React.useState<Ensemble | null>(null);

    const [selectedVectorName, setSelectedVectorName] = React.useState<string>("");
    const [timeStep, setTimeStep] = moduleContext.useStoreState("timeStep");
    const [parameterName, setParameterName] = moduleContext.useStoreState("parameterName");

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSummaryVector = syncHelper.useValue(SyncSettingKey.TIME_SERIES, "global.syncValue.timeSeries");

    let candidateEnsemble = selectedEnsemble;
    if (syncedValueEnsembles?.length) {
        candidateEnsemble = syncedValueEnsembles[0];
    }
    const computedEnsemble = fixupEnsemble(candidateEnsemble, availableEnsembles);

    const vectorsQuery = useVectorsQuery(computedEnsemble?.caseUuid, computedEnsemble?.ensembleName);
    const timeStepsQuery = useTimeStepsQuery(computedEnsemble?.caseUuid, computedEnsemble?.ensembleName);
    const parameterNamesQuery = useGetParameterNamesQuery(computedEnsemble?.caseUuid, computedEnsemble?.ensembleName);

    let computedVectorName = fixupVectorName(selectedVectorName, vectorsQuery.data);
    if (syncedValueSummaryVector && isValidVectorName(syncedValueSummaryVector.vectorName, vectorsQuery.data)) {
        computedVectorName = syncedValueSummaryVector.vectorName;
    }

    if (computedEnsemble && computedEnsemble !== selectedEnsemble) {
        setSelectedEnsemble(computedEnsemble);
    }
    if (computedVectorName && computedVectorName !== selectedVectorName) {
        setSelectedVectorName(computedVectorName);
    }

    React.useEffect(
        function propagateVectorSpecToView() {
            if (computedEnsemble && computedVectorName) {
                moduleContext.getStateStore().setValue("vectorSpec", {
                    caseUuid: computedEnsemble.caseUuid,
                    caseName: computedEnsemble.caseName,
                    ensembleName: computedEnsemble.ensembleName,
                    vectorName: computedVectorName,
                });
            } else {
                moduleContext.getStateStore().setValue("vectorSpec", null);
            }
        },
        [computedEnsemble, computedVectorName]
    );

    function handleEnsembleSelectionChange(selectedEnsembleIdStr: string) {
        console.debug("handleEnsembleSelectionChange()");
        const newEnsemble = availableEnsembles?.find((item) => encodeEnsembleAsIdStr(item) === selectedEnsembleIdStr);
        setSelectedEnsemble(newEnsemble ?? null);
        if (newEnsemble) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsemble]);
        }
    }

    function handleVectorSelectionChange(selectedVecNames: string[]) {
        console.debug("handleVectorSelectionChange()");
        const newName = selectedVecNames[0] ?? "";
        setSelectedVectorName(newName);
        if (newName) {
            syncHelper.publishValue(SyncSettingKey.TIME_SERIES, "global.syncValue.timeSeries", { vectorName: newName });
        }
    }

    return (
        <>
            <Label
                text="Ensemble:"
                labelClassName={syncHelper.isSynced(SyncSettingKey.ENSEMBLE) ? "bg-indigo-700 text-white" : ""}
            >
                <Dropdown
                    options={makeEnsembleOptionItems(availableEnsembles)}
                    value={computedEnsemble ? encodeEnsembleAsIdStr(computedEnsemble) : undefined}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <ApiStateWrapper
                apiResult={vectorsQuery}
                errorComponent={"Error loading vector names"}
                loadingComponent={<CircularProgress />}
            >
                <Label
                    text="Vector"
                    labelClassName={syncHelper.isSynced(SyncSettingKey.TIME_SERIES) ? "bg-indigo-700 text-white" : ""}
                >
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

function fixupEnsemble(currEnsemble: Ensemble | null, availableEnsemblesArr: Ensemble[] | null): Ensemble | null {
    if (!availableEnsemblesArr || availableEnsemblesArr.length === 0) {
        return null;
    }

    if (currEnsemble) {
        const foundItem = availableEnsemblesArr.find(
            (item) => item.caseUuid === currEnsemble.caseUuid && item.ensembleName == currEnsemble.ensembleName
        );
        if (foundItem) {
            return foundItem;
        }
    }

    return availableEnsemblesArr[0];
}

function encodeEnsembleAsIdStr(ensemble: Ensemble): string {
    return `${ensemble.caseUuid}::${ensemble.ensembleName}`;
}

function makeEnsembleOptionItems(ensemblesArr: Ensemble[] | null): DropdownOption[] {
    const itemArr: DropdownOption[] = [];
    if (ensemblesArr) {
        for (const ens of ensemblesArr) {
            itemArr.push({ value: encodeEnsembleAsIdStr(ens), label: `${ens.ensembleName} (${ens.caseName})` });
        }
    }
    return itemArr;
}

function isValidVectorName(vectorName: string, vectorDescriptionsArr: VectorDescription_api[] | undefined): boolean {
    if (!vectorName || !vectorDescriptionsArr || vectorDescriptionsArr.length === 0) {
        return false;
    }

    if (vectorDescriptionsArr.find((item) => item.name === vectorName)) {
        return true;
    }

    return false;
}

function fixupVectorName(currVectorName: string, vectorDescriptionsArr: VectorDescription_api[] | undefined): string {
    if (!vectorDescriptionsArr || vectorDescriptionsArr.length === 0) {
        return "";
    }

    if (isValidVectorName(currVectorName, vectorDescriptionsArr)) {
        return currVectorName;
    }

    return vectorDescriptionsArr[0].name;
}

function makeVectorOptionItems(vectorDescriptionsArr: VectorDescription_api[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (vectorDescriptionsArr) {
        for (const vec of vectorDescriptionsArr) {
            itemArr.push({ value: vec.name, label: vec.descriptive_name });
        }
    }
    return itemArr;
}

function makeParameterNamesOptionItems(parameters: EnsembleParameterDescription_api[] | undefined): SelectOption[] {
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

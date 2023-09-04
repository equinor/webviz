import React from "react";

import { EnsembleParameterDescription_api, VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { useGetParameterNamesQuery, useTimestampsListQuery, useVectorsQuery } from "./queryHooks";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsemble, setSelectedEnsemble] = React.useState<EnsembleIdent | null>(null);

    const [selectedVectorName, setSelectedVectorName] = React.useState<string>("");
    const [timestampUctMs, setTimestampUtcMs] = moduleContext.useStoreState("timestampUtcMs");
    const [parameterName, setParameterName] = moduleContext.useStoreState("parameterName");

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSummaryVector = syncHelper.useValue(SyncSettingKey.TIME_SERIES, "global.syncValue.timeSeries");

    const candidateEnsemble = maybeAssignFirstSyncedEnsemble(selectedEnsemble, syncedValueEnsembles);
    const computedEnsemble = fixupEnsembleIdent(candidateEnsemble, ensembleSet);

    const vectorsQuery = useVectorsQuery(computedEnsemble?.getCaseUuid(), computedEnsemble?.getEnsembleName());
    const timestampsQuery = useTimestampsListQuery(computedEnsemble?.getCaseUuid(), computedEnsemble?.getEnsembleName());
    const parameterNamesQuery = useGetParameterNamesQuery(
        computedEnsemble?.getCaseUuid(),
        computedEnsemble?.getEnsembleName()
    );

    let computedVectorName = fixupVectorName(selectedVectorName, vectorsQuery.data);
    if (syncedValueSummaryVector && isValidVectorName(syncedValueSummaryVector.vectorName, vectorsQuery.data)) {
        computedVectorName = syncedValueSummaryVector.vectorName;
    }

    if (computedEnsemble && !computedEnsemble.equals(selectedEnsemble)) {
        setSelectedEnsemble(computedEnsemble);
    }
    if (computedVectorName && computedVectorName !== selectedVectorName) {
        setSelectedVectorName(computedVectorName);
    }

    React.useEffect(
        function propagateVectorSpecToView() {
            if (computedEnsemble && computedVectorName) {
                moduleContext.getStateStore().setValue("vectorSpec", {
                    caseUuid: computedEnsemble.getCaseUuid(),
                    caseName: ensembleSet.findCaseName(computedEnsemble),
                    ensembleName: computedEnsemble.getEnsembleName(),
                    vectorName: computedVectorName,
                });
            } else {
                moduleContext.getStateStore().setValue("vectorSpec", null);
            }
        },
        [computedEnsemble, computedVectorName]
    );

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        console.debug("handleEnsembleSelectionChange()");
        setSelectedEnsemble(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
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
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsemble}
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
                apiResult={timestampsQuery}
                errorComponent={"Error loading timestamps"}
                loadingComponent={<CircularProgress />}
            >
                <Label text="Timestep">
                    <Dropdown
                        options={makeTimeStepsOptions(timestampsQuery.data)}
                        value={timestampUctMs?.toString()}
                        onChange={(tsValAsString) => setTimestampUtcMs(Number(tsValAsString))}
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

function makeTimeStepsOptions(timestampsUtcMs: number[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (timestampsUtcMs) {
        for (const ts of timestampsUtcMs) {
            itemArr.push({ value: `${ts}`, label: timestampUtcMsToCompactIsoString(ts) });
        }
    }
    return itemArr;
}

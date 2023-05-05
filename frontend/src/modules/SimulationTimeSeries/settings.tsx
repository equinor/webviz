import React from "react";

import { Frequency, VectorDescription } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingsHelper, SyncSettingKey } from "@framework/SyncSettings";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { Ensemble } from "@shared-types/ensemble";

import { sortBy, sortedUniq } from "lodash";

import { useVectorsQuery } from "./queryHooks";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.log(`${myInstanceIdStr} -- render SimulationTimeSeries settings`);

    const availableEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const [selectedEnsemble, setSelectedEnsemble] = React.useState<Ensemble | null>(null);
    const [selectedVectorName, setSelectedVectorName] = React.useState<string>("");
    const [resampleFrequency, setResamplingFrequency] = moduleContext.useStoreState("resamplingFrequency");
    const [showStatistics, setShowStatistics] = moduleContext.useStoreState("showStatistics");

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSummaryVector = syncHelper.useValue(SyncSettingKey.TIME_SERIES, "global.syncValue.timeSeries");
    console.log(`${myInstanceIdStr} -- synced keys ${JSON.stringify(syncedSettingKeys)}`);
    console.log(`${myInstanceIdStr} -- syncedValueEnsembles=${JSON.stringify(syncedValueEnsembles)}`);
    console.log(`${myInstanceIdStr} -- syncedValueSummaryVector=${JSON.stringify(syncedValueSummaryVector)}`);

    let candidateEnsemble = selectedEnsemble;
    if (syncedValueEnsembles?.length) {
        console.log(`${myInstanceIdStr} -- syncing ensemble to ${syncedValueEnsembles[0].ensembleName}`);
        candidateEnsemble = syncedValueEnsembles[0];
    }
    const computedEnsemble = fixupEnsemble(candidateEnsemble, availableEnsembles);

    const vectorsQuery = useVectorsQuery(computedEnsemble?.caseUuid, computedEnsemble?.ensembleName);

    let candidateVectorName = selectedVectorName;
    if (syncedValueSummaryVector?.vectorName) {
        console.log(`${myInstanceIdStr} -- syncing timeSeries to ${syncedValueSummaryVector.vectorName}`);
        candidateVectorName = syncedValueSummaryVector.vectorName;
    }
    const computedVectorName = fixupVectorName(candidateVectorName, vectorsQuery.data);

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

    function handleEnsembleSelectionChange(selectedEnsembleIdStrArr: string[]) {
        console.log("handleEnsembleSelectionChange()");
        const newIdStr = selectedEnsembleIdStrArr[0] ?? "";
        const newEnsemble = availableEnsembles?.find((item) => encodeEnsembleAsIdStr(item) === newIdStr);
        setSelectedEnsemble(newEnsemble ?? null);
        if (newEnsemble) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsemble]);
        }
    }

    function handleVectorSelectionChange(selectedVecNames: string[]) {
        console.log("handleVectorSelectionChange()");
        const newName = selectedVecNames[0] ?? "";
        setSelectedVectorName(newName);
        if (newName) {
            syncHelper.publishValue(SyncSettingKey.TIME_SERIES, "global.syncValue.timeSeries", { vectorName: newName });
        }
    }

    function handleFrequencySelectionChange(newFreqStr: string) {
        console.log(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}`);
        let newFreq: Frequency | null = null;
        if (newFreqStr !== "RAW") {
            newFreq = newFreqStr as Frequency;
        }
        console.log(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}  newFreq=${newFreq}`);
        setResamplingFrequency(newFreq);
    }

    function handleShowStatisticsCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
        console.log("handleShowStatisticsCheckboxChange() " + event.target.checked);
        setShowStatistics(event.target.checked);
    }

    function handleRealizationRangeTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        console.log("handleRealizationRangeTextChanged() " + event.target.value);
        const rangeArr = parseRealizationRangeString(event.target.value, 200);
        console.log(rangeArr);
        moduleContext.getStateStore().setValue("realizationsToInclude", rangeArr.length > 0 ? rangeArr : null);
    }

    return (
        <>
            <Label
                text="Ensemble"
                labelClassName={syncHelper.isSynced(SyncSettingKey.ENSEMBLE) ? "bg-indigo-700 text-white" : ""}
            >
                <Select
                    options={makeEnsembleOptionItems(availableEnsembles)}
                    value={computedEnsemble ? [encodeEnsembleAsIdStr(computedEnsemble)] : []}
                    onChange={handleEnsembleSelectionChange}
                    size={5}
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
            <Label text="Frequency">
                <Dropdown
                    options={makeFrequencyOptionItems()}
                    value={resampleFrequency ?? "RAW"}
                    onChange={handleFrequencySelectionChange}
                />
            </Label>
            <Checkbox label="Show statistics" checked={showStatistics} onChange={handleShowStatisticsCheckboxChange} />
            <Label text="Realizations">
                <Input onChange={handleRealizationRangeTextChanged} />
            </Label>
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

function fixupVectorName(currVectorName: string, vectorDescriptionsArr: VectorDescription[] | undefined): string {
    if (!vectorDescriptionsArr || vectorDescriptionsArr.length === 0) {
        return "";
    }

    if (vectorDescriptionsArr.find((item) => item.name === currVectorName)) {
        return currVectorName;
    }

    return vectorDescriptionsArr[0].name;
}

function encodeEnsembleAsIdStr(ensemble: Ensemble): string {
    return `${ensemble.caseUuid}::${ensemble.ensembleName}`;
}

function makeEnsembleOptionItems(ensemblesArr: Ensemble[] | null): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (ensemblesArr) {
        for (const ens of ensemblesArr) {
            itemArr.push({ value: encodeEnsembleAsIdStr(ens), label: `${ens.ensembleName} (${ens.caseName})` });
        }
    }
    return itemArr;
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

function makeFrequencyOptionItems(): DropdownOption[] {
    const itemArr: DropdownOption[] = [
        { value: Frequency.DAILY, label: "Daily" },
        { value: Frequency.MONTHLY, label: "Monthly" },
        { value: Frequency.QUARTERLY, label: "Quarterly" },
        { value: Frequency.YEARLY, label: "Yearly" },
        { value: "RAW", label: "None (raw)" },
    ];
    return itemArr;
}

// Parse page ranges into array of numbers
function parseRealizationRangeString(realRangeStr: string, maxLegalReal: number): number[] {
    const realArr: number[] = [];

    const rangeArr = realRangeStr.split(",");
    for (const aRange of rangeArr) {
        const rangeParts = aRange.split("-");
        if (rangeParts.length === 1) {
            const real = parseInt(rangeParts[0], 10);
            if (real >= 0 && real <= maxLegalReal) {
                realArr.push(real);
            }
        } else if (rangeParts.length === 2) {
            const startReal = parseInt(rangeParts[0], 10);
            const endReal = parseInt(rangeParts[1], 10);
            if (startReal >= 0 && startReal <= maxLegalReal && endReal >= startReal) {
                for (let i = startReal; i <= Math.min(endReal, maxLegalReal); i++) {
                    realArr.push(i);
                }
            }
        }
    }

    // Sort and remove duplicates
    return sortedUniq(sortBy(realArr));
}

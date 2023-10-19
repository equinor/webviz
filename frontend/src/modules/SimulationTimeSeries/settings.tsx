import React from "react";

import { Frequency_api, VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { sortBy, sortedUniq } from "lodash";

import { useVectorListQuery } from "./queryHooks";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render SimulationTimeSeries settings`);

    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [selectedVectorName, setSelectedVectorName] = React.useState<string>("");
    const [resampleFrequency, setResamplingFrequency] = moduleContext.useStoreState("resamplingFrequency");
    const [showStatistics, setShowStatistics] = moduleContext.useStoreState("showStatistics");
    const [showRealizations, setShowRealizations] = moduleContext.useStoreState("showRealizations");
    const [showHistorical, setShowHistorical] = moduleContext.useStoreState("showHistorical");

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSummaryVector = syncHelper.useValue(SyncSettingKey.TIME_SERIES, "global.syncValue.timeSeries");
    console.debug(`${myInstanceIdStr} -- synced keys ${JSON.stringify(syncedSettingKeys)}`);
    console.debug(`${myInstanceIdStr} -- syncedValueEnsembles=${JSON.stringify(syncedValueEnsembles)}`);
    console.debug(`${myInstanceIdStr} -- syncedValueSummaryVector=${JSON.stringify(syncedValueSummaryVector)}`);

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);

    const vectorListQuery = useVectorListQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );

    let candidateVectorName = selectedVectorName;
    if (syncedValueSummaryVector?.vectorName) {
        console.debug(`${myInstanceIdStr} -- syncing timeSeries to ${syncedValueSummaryVector.vectorName}`);
        candidateVectorName = syncedValueSummaryVector.vectorName;
    }
    const computedVectorName = fixupVectorName(candidateVectorName, vectorListQuery.data);

    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    if (computedVectorName && computedVectorName !== selectedVectorName) {
        setSelectedVectorName(computedVectorName);
    }

    const computedVectorNameHasHistoricalData = hasHistoricalVector(computedVectorName, vectorListQuery.data);

    React.useEffect(
        function propagateVectorSpecToView() {
            if (computedEnsembleIdent && computedVectorName) {
                moduleContext.getStateStore().setValue("vectorSpec", {
                    ensembleIdent: computedEnsembleIdent,
                    vectorName: computedVectorName,
                    hasHistoricalVector: computedVectorNameHasHistoricalData,
                });
            } else {
                moduleContext.getStateStore().setValue("vectorSpec", null);
            }
        },
        [computedEnsembleIdent, computedVectorName, computedVectorNameHasHistoricalData]
    );

    const computedEnsemble = computedEnsembleIdent ? ensembleSet.findEnsemble(computedEnsembleIdent) : null;

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        console.debug("handleEnsembleSelectionChange()", newEnsembleIdent);
        setSelectedEnsembleIdent(newEnsembleIdent);
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

    function handleFrequencySelectionChange(newFreqStr: string) {
        console.debug(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}`);
        let newFreq: Frequency_api | null = null;
        if (newFreqStr !== "RAW") {
            newFreq = newFreqStr as Frequency_api;
        }
        console.debug(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}  newFreq=${newFreq}`);
        setResamplingFrequency(newFreq);
    }

    function handleShowStatisticsCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
        setShowStatistics(event.target.checked);
    }

    function handleShowRealizations(event: React.ChangeEvent<HTMLInputElement>) {
        setShowRealizations(event.target.checked);
    }

    function handleShowHistorical(event: React.ChangeEvent<HTMLInputElement>) {
        setShowHistorical(event.target.checked);
    }

    function handleRealizationRangeTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const realRangeStr = event.target.value;
        console.debug("handleRealizationRangeTextChanged() " + realRangeStr);
        let rangeArr: number[] | null = null;
        if (realRangeStr) {
            rangeArr = parseRealizationRangeString(realRangeStr, computedEnsemble?.getMaxRealizationNumber() ?? -1);
        }
        console.debug(rangeArr);
        moduleContext.getStateStore().setValue("realizationsToInclude", rangeArr);
    }

    return (
        <>
            <Label
                text="Ensemble"
                labelClassName={syncHelper.isSynced(SyncSettingKey.ENSEMBLE) ? "bg-indigo-700 text-white" : ""}
            >
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <ApiStateWrapper
                apiResult={vectorListQuery}
                errorComponent={"Error loading vector names"}
                loadingComponent={<CircularProgress />}
            >
                <Label
                    text="Vector"
                    labelClassName={syncHelper.isSynced(SyncSettingKey.TIME_SERIES) ? "bg-indigo-700 text-white" : ""}
                >
                    <Select
                        options={makeVectorOptionItems(vectorListQuery.data)}
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
            <Checkbox label="Show realizations" checked={showRealizations} onChange={handleShowRealizations} />
            <Checkbox
                label="Show historical"
                checked={showHistorical}
                disabled={!computedVectorNameHasHistoricalData}
                onChange={handleShowHistorical}
            />
            <Label text={`Realizations (maxReal=${computedEnsemble?.getMaxRealizationNumber() ?? -1})`}>
                <Input onChange={handleRealizationRangeTextChanged} />
            </Label>
        </>
    );
}

//-----------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------

function fixupVectorName(currVectorName: string, vectorDescriptionsArr: VectorDescription_api[] | undefined): string {
    if (!vectorDescriptionsArr || vectorDescriptionsArr.length === 0) {
        return "";
    }

    if (vectorDescriptionsArr.find((item) => item.name === currVectorName)) {
        return currVectorName;
    }

    return vectorDescriptionsArr[0].name;
}

function hasHistoricalVector(
    nonHistoricalVectorName: string,
    vectorDescriptionsArr: VectorDescription_api[] | undefined
): boolean {
    if (!vectorDescriptionsArr || vectorDescriptionsArr.length === 0) {
        return false;
    }

    const foundItem = vectorDescriptionsArr.find((item) => item.name === nonHistoricalVectorName);
    if (foundItem) {
        return foundItem.has_historical;
    }

    return false;
}

function makeVectorOptionItems(vectorDescriptionsArr: VectorDescription_api[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (vectorDescriptionsArr) {
        for (const vec of vectorDescriptionsArr) {
            itemArr.push({ value: vec.name, label: vec.descriptive_name });
            //itemArr.push({ value: vec.name, label: vec.descriptive_name + (vec.has_historical ? " (hasHist)" : "") });
        }
    }
    return itemArr;
}

function makeFrequencyOptionItems(): DropdownOption[] {
    const itemArr: DropdownOption[] = [
        { value: Frequency_api.DAILY, label: "Daily" },
        { value: Frequency_api.MONTHLY, label: "Monthly" },
        { value: Frequency_api.QUARTERLY, label: "Quarterly" },
        { value: Frequency_api.YEARLY, label: "Yearly" },
        { value: "RAW", label: "None (raw)" },
    ];
    return itemArr;
}

// Parse realization ranges into array of numbers
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

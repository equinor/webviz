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
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { useVectorsQuery } from "./queryHooks";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render SimulationTimeSeries settings`);

    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [selectedVectorName, setSelectedVectorName] = React.useState<string>("");
    const [selectedSensitivity, setSelectedSensitivity] = moduleContext.useStoreState("selectedSensitivity");
    const [resampleFrequency, setResamplingFrequency] = moduleContext.useStoreState("resamplingFrequency");
    const [showStatistics, setShowStatistics] = moduleContext.useStoreState("showStatistics");
    const [showRealizations, setShowRealizations] = moduleContext.useStoreState("showRealizations");

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSummaryVector = syncHelper.useValue(SyncSettingKey.TIME_SERIES, "global.syncValue.timeSeries");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);

    const vectorsQuery = useVectorsQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );

    let candidateVectorName = selectedVectorName;
    if (syncedValueSummaryVector?.vectorName) {
        console.debug(`${myInstanceIdStr} -- syncing timeSeries to ${syncedValueSummaryVector.vectorName}`);
        candidateVectorName = syncedValueSummaryVector.vectorName;
    }
    const computedVectorName = fixupVectorName(candidateVectorName, vectorsQuery.data);

    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    if (computedVectorName && computedVectorName !== selectedVectorName) {
        setSelectedVectorName(computedVectorName);
    }
    const computedEnsemble = computedEnsembleIdent ? ensembleSet.findEnsemble(computedEnsembleIdent) : null;
    const sensitivities = computedEnsemble?.getSensitivities();

    React.useEffect(() => {
        const sensitivityNames = computedEnsemble?.getSensitivities()?.getSensitivityNames();
        if (sensitivityNames && sensitivityNames.length > 0) {
            if (!selectedSensitivity || !sensitivityNames.includes(selectedSensitivity)) {
                setSelectedSensitivity(sensitivityNames[0]);
            }
        }
    }, [computedEnsemble]);

    React.useEffect(
        function propagateVectorSpecToView() {
            if (computedEnsembleIdent && computedVectorName) {
                moduleContext.getStateStore().setValue("vectorSpec", {
                    ensembleIdent: computedEnsembleIdent,
                    vectorName: computedVectorName,
                });
            } else {
                moduleContext.getStateStore().setValue("vectorSpec", null);
            }
        },
        [computedEnsembleIdent, computedVectorName]
    );

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
    if (!sensitivities?.getSensitivityArr()) {
        return <div>This is not a sensitivity ensemble</div>;
    }

    return (
        <>
            <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
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
            <Label text="Frequency">
                <Dropdown
                    options={makeFrequencyOptionItems()}
                    value={resampleFrequency ?? "RAW"}
                    onChange={handleFrequencySelectionChange}
                />
            </Label>

            <Label
                text="Sensitivity"
                labelClassName={syncHelper.isSynced(SyncSettingKey.TIME_SERIES) ? "bg-indigo-700 text-white" : ""}
            >
                <Select
                    options={sensitivities.getSensitivityNames().map((name) => ({ value: name, label: name }))}
                    value={[selectedSensitivity || ""]}
                    onChange={(sensarr) => setSelectedSensitivity(sensarr[0])}
                    filter={true}
                    size={10}
                />
            </Label>

            <Checkbox
                label="Show statistics"
                checked={showStatistics}
                onChange={(e) => setShowStatistics(e.target.checked)}
            />
            <Checkbox
                label="Show realizations"
                checked={showRealizations}
                onChange={(e) => setShowRealizations(e.target.checked)}
            />
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

function makeVectorOptionItems(vectorDescriptionsArr: VectorDescription_api[] | undefined): SelectOption[] {
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
        { value: Frequency_api.DAILY, label: "Daily" },
        { value: Frequency_api.MONTHLY, label: "Monthly" },
        { value: Frequency_api.QUARTERLY, label: "Quarterly" },
        { value: Frequency_api.YEARLY, label: "Yearly" },
        { value: "RAW", label: "None (raw)" },
    ];
    return itemArr;
}

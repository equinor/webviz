import React from "react";

import { Frequency_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { VectorSelector, createVectorSelectorDataFromVectors } from "@framework/components/VectorSelector";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { SmartNodeSelectorSelection, TreeDataNode } from "@lib/components/SmartNodeSelector";

import { useAtom, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import {
    resamplingFrequencyAtom,
    selectedSensitivitiesAtom,
    showHistoricalAtom,
    showRealizationsAtom,
    showStatisticsAtom,
    vectorSpecAtom,
} from "./atoms/baseAtoms";
import { useVectorListQuery } from "./hooks/queryHooks";

import { Interfaces } from "../interfaces";

//-----------------------------------------------------------------------------------------------------------

export function Settings({ settingsContext, workbenchSession, workbenchServices }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [selectedVectorName, setSelectedVectorName] = React.useState<string | null>(null);
    const [selectedVectorTag, setSelectedVectorTag] = React.useState<string | null>(null);
    const [vectorSelectorData, setVectorSelectorData] = React.useState<TreeDataNode[]>([]);
    const [selectInitialVector, setSelectInitialVector] = React.useState<boolean>(true);

    const [selectedSensitivities, setSelectedSensitivities] = useAtom(selectedSensitivitiesAtom);
    const [resampleFrequency, setResamplingFrequency] = useAtom(resamplingFrequencyAtom);
    const [showStatistics, setShowStatistics] = useAtom(showStatisticsAtom);
    const [showRealizations, setShowRealizations] = useAtom(showRealizationsAtom);
    const [showHistorical, setShowHistorical] = useAtom(showHistoricalAtom);
    const setVectorSpec = useSetAtom(vectorSpecAtom);
    const syncedSettingKeys = settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSummaryVector = syncHelper.useValue(SyncSettingKey.TIME_SERIES, "global.syncValue.timeSeries");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);

    const vectorsListQuery = useVectorListQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );

    const hasQueryData = vectorsListQuery.data !== undefined;
    const vectorNames = vectorsListQuery.data?.map((vec) => vec.name) ?? [];

    // Get vector selector data
    let candidateVectorSelectorData = vectorSelectorData;
    let candidateVectorName = selectedVectorName;
    let candidateVectorTag = selectedVectorTag;
    if (hasQueryData) {
        candidateVectorSelectorData = createVectorSelectorDataFromVectors(vectorNames);
        if (!isEqual(vectorSelectorData, candidateVectorSelectorData)) {
            setVectorSelectorData(candidateVectorSelectorData);

            if (selectInitialVector) {
                setSelectInitialVector(false);
                const fixedUpVectorName = fixupVectorName(selectedVectorName, vectorNames);
                if (fixedUpVectorName !== selectedVectorName) {
                    setSelectedVectorName(fixedUpVectorName);
                    setSelectedVectorTag(fixedUpVectorName);
                    candidateVectorName = fixedUpVectorName;
                    candidateVectorTag = fixedUpVectorName;
                }
            }
        }
    }
    // Override candidates if synced
    if (syncedValueSummaryVector?.vectorName) {
        candidateVectorName = syncedValueSummaryVector.vectorName;
        candidateVectorTag = syncedValueSummaryVector.vectorName;
    }
    const computedVectorSelectorData = candidateVectorSelectorData;
    const computedVectorName = candidateVectorName;
    const computedVectorTag = candidateVectorTag;

    const computedEnsemble = computedEnsembleIdent ? ensembleSet.findEnsemble(computedEnsembleIdent) : null;
    const sensitivityNames = React.useMemo(
        () => computedEnsemble?.getSensitivities()?.getSensitivityNames() ?? [],
        [computedEnsemble]
    );

    React.useEffect(
        function setSensitivitiesOnEnsembleChange() {
            if (!isEqual(selectedSensitivities, sensitivityNames)) {
                setSelectedSensitivities(sensitivityNames);
            }
        },
        [computedEnsemble, sensitivityNames, selectedSensitivities, setSelectedSensitivities]
    );
    const sensitivityOptions: SelectOption[] = sensitivityNames.map((name) => ({
        value: name,
        label: name,
    }));

    const hasComputedVectorName = vectorsListQuery.data?.some((vec) => vec.name === computedVectorName) ?? false;
    const hasHistoricalVector =
        vectorsListQuery.data?.some((vec) => vec.name === computedVectorName && vec.has_historical) ?? false;
    React.useEffect(
        function propagateVectorSpecToView() {
            if (hasComputedVectorName && computedEnsembleIdent && computedVectorName) {
                setVectorSpec({
                    ensembleIdent: computedEnsembleIdent,
                    vectorName: computedVectorName,
                    hasHistorical: hasHistoricalVector,
                });
            } else {
                setVectorSpec(null);
            }
        },
        [computedEnsembleIdent, computedVectorName, hasComputedVectorName, hasHistoricalVector, setVectorSpec]
    );

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleFrequencySelectionChange(newFreqStr: string) {
        let newFreq: Frequency_api | null = null;
        if (newFreqStr !== "RAW") {
            newFreq = newFreqStr as Frequency_api;
        }
        setResamplingFrequency(newFreq);
    }
    function handleVectorSelectChange(selection: SmartNodeSelectorSelection) {
        setSelectedVectorName(selection.selectedNodes[0] ?? null);
        setSelectedVectorTag(selection.selectedTags[0] ?? null);
    }
    function handleShowHistorical(event: React.ChangeEvent<HTMLInputElement>) {
        setShowHistorical(event.target.checked);
    }

    return (
        <>
            <CollapsibleGroup expanded={true} title="Ensemble">
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </CollapsibleGroup>
            <QueryStateWrapper
                queryResult={vectorsListQuery}
                loadingComponent={<CircularProgress />}
                errorComponent={"Could not load the vectors for selected ensembles"}
            >
                <CollapsibleGroup expanded={true} title="Time Series">
                    <Label text="Vector">
                        <VectorSelector
                            data={computedVectorSelectorData}
                            selectedTags={computedVectorTag ? [computedVectorTag] : []}
                            placeholder="Add new vector..."
                            maxNumSelectedNodes={1}
                            numSecondsUntilSuggestionsAreShown={0.5}
                            lineBreakAfterTag={true}
                            onChange={handleVectorSelectChange}
                        />
                    </Label>
                    <Label text="Frequency">
                        <div className="ml-4">
                            <Dropdown
                                width="50%"
                                options={makeFrequencyOptionItems()}
                                value={resampleFrequency ?? "RAW"}
                                onChange={handleFrequencySelectionChange}
                            />
                        </div>
                    </Label>
                </CollapsibleGroup>
            </QueryStateWrapper>
            <CollapsibleGroup expanded={false} title="Visualization">
                <Checkbox
                    label="Mean over realizations"
                    checked={showStatistics}
                    onChange={(e) => setShowStatistics(e.target.checked)}
                />
                <Checkbox
                    label="Individual realizations"
                    checked={showRealizations}
                    onChange={(e) => setShowRealizations(e.target.checked)}
                />{" "}
                <Checkbox label="Show historical" checked={showHistorical} onChange={handleShowHistorical} />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Sensitivity filter">
                <Select
                    options={sensitivityOptions}
                    value={selectedSensitivities ?? []}
                    onChange={setSelectedSensitivities}
                    filter={true}
                    size={10}
                    multiple={true}
                />
            </CollapsibleGroup>
        </>
    );
}

//-----------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------

function fixupVectorName(currVectorName: string | null, availableVectorNames: string[] | undefined): string {
    if (!availableVectorNames || availableVectorNames.length === 0) {
        return "";
    }

    if (availableVectorNames.find((name) => name === currVectorName) && currVectorName) {
        return currVectorName;
    }

    return availableVectorNames[0];
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

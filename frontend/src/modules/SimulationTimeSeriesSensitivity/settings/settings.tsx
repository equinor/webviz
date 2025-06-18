import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import { Frequency_api } from "@api";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select } from "@lib/components/Select";
import type { SmartNodeSelectorSelection } from "@lib/components/SmartNodeSelector";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { VectorSelector } from "@modules/_shared/components/VectorSelector";

import type { Interfaces } from "../interfaces";
import { FrequencyEnumToStringMapping } from "../typesAndEnums";

import {
    resamplingFrequencyAtom,
    showHistoricalAtom,
    showRealizationsAtom,
    showStatisticsAtom,
    syncedRegularEnsembleIdentsAtom,
    syncedVectorNameAtom,
    userSelectedRegularEnsembleIdentAtom,
    userSelectedSensitivityNamesAtom,
    userSelectedVectorNameAndTagAtom,
} from "./atoms/baseAtoms";
import {
    availableSensitivityNamesAtom,
    selectedRegularEnsembleIdentAtom,
    selectedSensitivityNamesAtom,
    selectedVectorTagAtom,
    vectorSelectorDataAtom,
} from "./atoms/derivedAtoms";
import { vectorListQueryAtom } from "./atoms/queryAtoms";

//-----------------------------------------------------------------------------------------------------------

export function Settings({ settingsContext, workbenchSession, workbenchServices }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.EnsembleSet);

    const setSyncedRegularEnsembleIdents = useSetAtom(syncedRegularEnsembleIdentsAtom);
    const setSyncedVectorName = useSetAtom(syncedVectorNameAtom);
    const setUserSelectedRegularEnsembleIdent = useSetAtom(userSelectedRegularEnsembleIdentAtom);
    const setUserSelectedVectorNameAndTag = useSetAtom(userSelectedVectorNameAndTagAtom);
    const setUserSelectedSensitivityNamesAtom = useSetAtom(userSelectedSensitivityNamesAtom);
    const selectedRegularEnsembleIdent = useAtomValue(selectedRegularEnsembleIdentAtom);
    const vectorsListQuery = useAtomValue(vectorListQueryAtom);
    const availableSensitivityNames = useAtomValue(availableSensitivityNamesAtom);
    const selectedSensitivityNames = useAtomValue(selectedSensitivityNamesAtom);
    const vectorSelectorData = useAtomValue(vectorSelectorDataAtom);
    const selectedVectorTag = useAtomValue(selectedVectorTagAtom);

    const [resampleFrequency, setResamplingFrequency] = useAtom(resamplingFrequencyAtom);
    const [showStatistics, setShowStatistics] = useAtom(showStatisticsAtom);
    const [showRealizations, setShowRealizations] = useAtom(showRealizationsAtom);
    const [showHistorical, setShowHistorical] = useAtom(showHistoricalAtom);

    const syncedSettingKeys = settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSummaryVector = syncHelper.useValue(SyncSettingKey.TIME_SERIES, "global.syncValue.timeSeries");
    const [prevSyncedEnsembleIdents, setPrevSyncedEnsembleIdents] = React.useState<RegularEnsembleIdent[] | null>(null);
    const [prevSyncedSummaryVector, setPrevSyncedSummaryVector] = React.useState<{ vectorName: string } | null>(null);

    if (!isEqual(syncedValueEnsembles, prevSyncedEnsembleIdents)) {
        setPrevSyncedEnsembleIdents(syncedValueEnsembles);
        if (syncedValueEnsembles) {
            setSyncedRegularEnsembleIdents(syncedValueEnsembles);
        }
    }
    if (!isEqual(syncedValueSummaryVector, prevSyncedSummaryVector)) {
        setPrevSyncedSummaryVector(syncedValueSummaryVector);
        if (syncedValueSummaryVector) {
            setSyncedVectorName(syncedValueSummaryVector.vectorName);
        }
    }

    function handleEnsembleSelectionChange(newEnsembleIdent: RegularEnsembleIdent | null) {
        setUserSelectedRegularEnsembleIdent(newEnsembleIdent);
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
        const userSelectedVectorName = selection.selectedNodes[0] ?? null;
        const userSelectedVectorTag = selection.selectedTags[0]?.text ?? null;
        setUserSelectedVectorNameAndTag({ name: userSelectedVectorName, tag: userSelectedVectorTag });
    }
    function handleShowHistorical(event: React.ChangeEvent<HTMLInputElement>) {
        setShowHistorical(event.target.checked);
    }

    function handleSensitivityNamesSelectionChange(newSensitivities: string[]) {
        setUserSelectedSensitivityNamesAtom(newSensitivities);
    }

    return (
        <>
            <CollapsibleGroup expanded={true} title="Ensemble">
                <EnsembleDropdown
                    ensembles={ensembleSet.getRegularEnsembleArray()}
                    value={selectedRegularEnsembleIdent}
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
                            data={vectorSelectorData}
                            selectedTags={selectedVectorTag ? [selectedVectorTag] : []}
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
                                options={[
                                    { value: "RAW", label: "None (raw)" },
                                    ...Object.values(Frequency_api).map((val: Frequency_api) => {
                                        return { value: val, label: FrequencyEnumToStringMapping[val] };
                                    }),
                                ]}
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
                    options={availableSensitivityNames.map((name) => ({
                        value: name,
                        label: name,
                    }))}
                    value={selectedSensitivityNames ?? []}
                    onChange={handleSensitivityNamesSelectionChange}
                    filter={true}
                    size={10}
                    multiple={true}
                />
            </CollapsibleGroup>
        </>
    );
}

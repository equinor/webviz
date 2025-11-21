import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import { Frequency_api } from "@api";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import type { SmartNodeSelectorSelection } from "@lib/components/SmartNodeSelector";
import { VectorSelector } from "@modules/_shared/components/VectorSelector";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateQueryErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { FrequencyEnumToStringMapping } from "../typesAndEnums";

import {
    resamplingFrequencyAtom,
    showHistoricalAtom,
    showRealizationsAtom,
    showStatisticsAtom,
    syncedRegularEnsembleIdentsAtom,
    syncedVectorNameAtom,
} from "./atoms/baseAtoms";
import { availableSensitivityNamesAtom, vectorSelectorDataAtom } from "./atoms/derivedAtoms";
import {
    selectedRegularEnsembleIdentAtom,
    selectedSensitivityNamesAtom,
    selectedVectorNameAndTagAtom,
} from "./atoms/persistableFixableAtoms";
import { vectorListQueryAtom } from "./atoms/queryAtoms";

export function Settings({ settingsContext, workbenchSession, workbenchServices }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const statusWriter = useSettingsStatusWriter(settingsContext);

    const setSyncedRegularEnsembleIdents = useSetAtom(syncedRegularEnsembleIdentsAtom);
    const setSyncedVectorName = useSetAtom(syncedVectorNameAtom);

    const [selectedRegularEnsembleIdent, setSelectedRegularEnsembleIdent] = useAtom(selectedRegularEnsembleIdentAtom);
    const [selectedSensitivityNames, setSelectedSensitivityNamesAtom] = useAtom(selectedSensitivityNamesAtom);
    const [selectedVectorNameAndTag, setSelectedVectorNameAndTag] = useAtom(selectedVectorNameAndTagAtom);

    const vectorListQuery = useAtomValue(vectorListQueryAtom);
    const availableSensitivityNames = useAtomValue(availableSensitivityNamesAtom);
    const vectorSelectorData = useAtomValue(vectorSelectorDataAtom);

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

    usePropagateQueryErrorToStatusWriter(vectorListQuery, statusWriter);

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
        setSelectedRegularEnsembleIdent(newEnsembleIdent);
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
        setSelectedVectorNameAndTag({ name: userSelectedVectorName, tag: userSelectedVectorTag });
    }
    function handleShowHistorical(event: React.ChangeEvent<HTMLInputElement>) {
        setShowHistorical(event.target.checked);
    }

    function handleSensitivityNamesSelectionChange(newSensitivities: string[]) {
        setSelectedSensitivityNamesAtom(newSensitivities);
    }

    const selectedRegularEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(
        selectedRegularEnsembleIdentAtom,
    );
    const selectedVectorNameAndTagAnnotations = useMakePersistableFixableAtomAnnotations(selectedVectorNameAndTagAtom);
    const selectedSensitivityNamesAnnotations = useMakePersistableFixableAtomAnnotations(selectedSensitivityNamesAtom);

    return (
        <>
            <CollapsibleGroup expanded={true} title="Ensemble">
                <SettingWrapper annotations={selectedRegularEnsembleIdentAnnotations}>
                    <EnsembleDropdown
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedRegularEnsembleIdent.value}
                        ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(workbenchSession)}
                        onChange={handleEnsembleSelectionChange}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Time Series" hasError={selectedVectorNameAndTag.depsHaveError}>
                <SettingWrapper
                    label="Vector"
                    annotations={selectedVectorNameAndTagAnnotations}
                    loadingOverlay={selectedVectorNameAndTag.isLoading}
                    errorOverlay={
                        selectedVectorNameAndTag.depsHaveError
                            ? "Error loading available vectors. See details in log."
                            : undefined
                    }
                >
                    <VectorSelector
                        data={vectorSelectorData}
                        selectedTags={selectedVectorNameAndTag.value.tag ? [selectedVectorNameAndTag.value.tag] : []}
                        placeholder="Add new vector..."
                        maxNumSelectedNodes={1}
                        numSecondsUntilSuggestionsAreShown={0.5}
                        lineBreakAfterTag={true}
                        onChange={handleVectorSelectChange}
                    />
                </SettingWrapper>
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
            <CollapsibleGroup expanded={true} title="Visualization">
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
                <SettingWrapper annotations={selectedSensitivityNamesAnnotations}>
                    <Select
                        options={availableSensitivityNames.map((name) => ({
                            value: name,
                            label: name,
                        }))}
                        value={selectedSensitivityNames.value ?? []}
                        onChange={handleSensitivityNamesSelectionChange}
                        filter={true}
                        size={10}
                        multiple={true}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
        </>
    );
}

import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import { Frequency_api } from "@api";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { CheckboxCompositions } from "@lib/newComponents/Checkbox/compositions";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { Combobox } from "@lib/newComponents/Combobox/combobox";
import { Select } from "@lib/newComponents/Select";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
import type { SmartNodeSelectorSelection } from "@lib/newComponents/SmartNodeSelector";
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

export function Settings(props: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const statusWriter = useSettingsStatusWriter(props.settingsContext);

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

    const syncHelper = useRefStableSyncSettingsHelper({
        workbenchServices: props.workbenchServices,
        moduleContext: props.settingsContext,
    });
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

    const handleVectorSelectChange = React.useCallback(
        function handleVectorSelectChange(selection: SmartNodeSelectorSelection) {
            // vectorSelectorData is null when still loading
            if (!vectorSelectorData) {
                return;
            }
            const userSelectedVectorName = selection.selectedNodes[0] ?? null;
            const userSelectedVectorTag = selection.selectedTags[0]?.text ?? null;
            setSelectedVectorNameAndTag({ name: userSelectedVectorName, tag: userSelectedVectorTag });
        },
        [vectorSelectorData, setSelectedVectorNameAndTag],
    );

    const selectedRegularEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(
        selectedRegularEnsembleIdentAtom,
    );
    const selectedVectorNameAndTagAnnotations = useMakePersistableFixableAtomAnnotations(selectedVectorNameAndTagAtom);
    const selectedSensitivityNamesAnnotations = useMakePersistableFixableAtomAnnotations(selectedSensitivityNamesAtom);

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Data" defaultOpen>
                    <SettingWrapper label="Ensemble" annotations={selectedRegularEnsembleIdentAnnotations}>
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={selectedRegularEnsembleIdent.value}
                            ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(props.workbenchSession)}
                            onValueChange={handleEnsembleSelectionChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Vector"
                        annotations={selectedVectorNameAndTagAnnotations}
                        loadingOverlay={vectorListQuery.isFetching}
                        errorOverlay={
                            vectorListQuery.isError ? "Error loading available vectors. See details in log." : undefined
                        }
                    >
                        <VectorSelector
                            data={vectorSelectorData ?? []}
                            selectedTags={
                                selectedVectorNameAndTag.value?.tag ? [selectedVectorNameAndTag.value.tag] : []
                            }
                            placeholder="Add new vector..."
                            maxNumSelectedNodes={1}
                            numSecondsUntilSuggestionsAreShown={0.5}
                            lineBreakAfterTag={true}
                            onValueChange={handleVectorSelectChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Frequency">
                        <Combobox
                            value={resampleFrequency}
                            onValueChange={setResamplingFrequency}
                            items={[
                                { value: null, label: "None (raw)" },
                                ...Object.values(Frequency_api).map((val: Frequency_api) => {
                                    return { value: val, label: FrequencyEnumToStringMapping[val] };
                                }),
                            ]}
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Plot" defaultOpen>
                    <SettingWrapper label="Visualization" stacked>
                        <CheckboxCompositions.WithLabel
                            label="Mean over realizations"
                            checked={showStatistics}
                            onCheckedChange={setShowStatistics}
                        />
                        <CheckboxCompositions.WithLabel
                            label="Individual realizations"
                            checked={showRealizations}
                            onCheckedChange={setShowRealizations}
                        />
                        <CheckboxCompositions.WithLabel
                            label="Show historical"
                            checked={showHistorical}
                            onCheckedChange={setShowHistorical}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Sensitivity filter"
                        annotations={selectedSensitivityNamesAnnotations}
                        stacked
                    >
                        <Select
                            value={selectedSensitivityNames.value ?? []}
                            onValueChange={setSelectedSensitivityNamesAtom}
                            options={availableSensitivityNames.map((name) => ({
                                value: name,
                                label: name,
                            }))}
                            filter
                            size={10}
                            multiple
                            showQuickSelectButtons
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}

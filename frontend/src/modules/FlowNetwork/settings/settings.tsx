import React from "react";

import { useAtom, useAtomValue } from "jotai";

import { Frequency_api, NodeType_api } from "@api";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { DiscreteSlider } from "@lib/components/DiscreteSlider";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateQueryErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { FrequencyEnumToStringMapping, NodeTypeEnumToStringMapping } from "../types";

import { selectedNodeTypesAtom, selectedResamplingFrequencyAtom } from "./atoms/baseAtoms";
import {
    availableDateTimesAtom,
    availableRealizationsAtom,
    availableTreeTypesAtom,
    edgeMetadataListAtom,
    nodeMetadataListAtom,
} from "./atoms/derivedAtoms";
import {
    selectedDateTimeAtom,
    selectedEdgeKeyAtom,
    selectedEnsembleIdentAtom,
    selectedNodeKeyAtom,
    selectedRealizationAtom,
    selectedTreeTypeAtom,
} from "./atoms/persistableFixableAtoms";
import { realizationFlowNetworkQueryAtom } from "./atoms/queryAtoms";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const availableRealizations = useAtomValue(availableRealizationsAtom);
    const availableTreeTypes = useAtomValue(availableTreeTypesAtom);
    const availableDateTimes = useAtomValue(availableDateTimesAtom);
    const edgeMetadataList = useAtomValue(edgeMetadataListAtom);
    const nodeMetadataList = useAtomValue(nodeMetadataListAtom);

    const [selectedResamplingFrequency, setSelectedResamplingFrequency] = useAtom(selectedResamplingFrequencyAtom);
    const [selectedNodeTypes, setSelectedNodeTypes] = useAtom(selectedNodeTypesAtom);
    const [selectedTreeType, setSelectedTreeType] = useAtom(selectedTreeTypeAtom);

    const [selectedEdgeKey, setSelectedEdgeKey] = useAtom(selectedEdgeKeyAtom);
    const [selectedNodeKey, setSelectedNodeKey] = useAtom(selectedNodeKeyAtom);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const [selectedRealization, setSelectedRealization] = useAtom(selectedRealizationAtom);
    const [selectedDateTime, setSelectedDateTime] = useAtom(selectedDateTimeAtom);

    const flowNetworkQuery = useAtomValue(realizationFlowNetworkQueryAtom);

    usePropagateQueryErrorToStatusWriter(flowNetworkQuery, statusWriter);

    const timeStepSliderDebounceTimeMs = 10;
    const timeStepSliderDebounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (timeStepSliderDebounceTimerRef.current) {
            clearTimeout(timeStepSliderDebounceTimerRef.current);
        }
    });

    function handleSelectedNodeKeyChange(value: string) {
        setSelectedNodeKey(value);
    }

    function handleSelectedEdgeKeyChange(value: string) {
        setSelectedEdgeKey(value);
    }

    function handleEnsembleSelectionChange(ensembleIdent: RegularEnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
    }

    function handleFrequencySelectionChange(newFrequencyStr: string) {
        const newFreq = newFrequencyStr as Frequency_api;
        setSelectedResamplingFrequency(newFreq);
    }

    function handleRealizationNumberChange(value: string) {
        const realizationNumber = parseInt(value);
        setSelectedRealization(realizationNumber);
    }

    function handleSelectedTimeStepIndexChange(value: number | number[]) {
        const singleValue = typeof value === "number" ? value : value.length > 0 ? value[0] : 0;
        const validIndex = singleValue >= 0 && singleValue < availableDateTimes.length ? singleValue : null;
        const newDateTime = validIndex !== null ? availableDateTimes[validIndex] : null;

        if (timeStepSliderDebounceTimerRef.current) {
            clearTimeout(timeStepSliderDebounceTimerRef.current);
        }

        timeStepSliderDebounceTimerRef.current = setTimeout(() => {
            setSelectedDateTime(newDateTime);
        }, timeStepSliderDebounceTimeMs);
    }

    function handleSelectedNodeTypesChange(values: string[]) {
        const newNodeTypes = new Set(values.map((val) => val as NodeType_api));
        setSelectedNodeTypes(newNodeTypes);
    }

    const createValueLabelFormat = React.useCallback(
        function createValueLabelFormat(value: number): string {
            if (!availableDateTimes || availableDateTimes.length === 0 || value >= availableDateTimes.length) return "";

            return availableDateTimes[value];
        },
        [availableDateTimes],
    );

    const selectedDateTimeIndex = selectedDateTime.value ? availableDateTimes.indexOf(selectedDateTime.value) : -1;

    const selectedEnsembleIdentAnnotation = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);
    const selectedTreeTypeAnnotation = useMakePersistableFixableAtomAnnotations(selectedTreeTypeAtom);
    const selectedRealizationAnnotation = useMakePersistableFixableAtomAnnotations(selectedRealizationAtom);
    const selectedEdgeKeyAnnotation = useMakePersistableFixableAtomAnnotations(selectedEdgeKeyAtom);
    const selectedNodeKeyAnnotation = useMakePersistableFixableAtomAnnotations(selectedNodeKeyAtom);
    const selectedDateTimeAnnotation = useMakePersistableFixableAtomAnnotations(selectedDateTimeAtom);

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Ensemble">
                <SettingWrapper annotations={selectedEnsembleIdentAnnotation}>
                    <EnsembleDropdown
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedEnsembleIdent.value}
                        onChange={handleEnsembleSelectionChange}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Frequency">
                <Dropdown
                    options={Object.values(Frequency_api).map((val: Frequency_api) => {
                        return { value: val, label: FrequencyEnumToStringMapping[val] };
                    })}
                    value={selectedResamplingFrequency}
                    onChange={handleFrequencySelectionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Data Fetching Options">
                <div className="flex flex-col gap-2">
                    <SettingWrapper label="Realization Number" annotations={selectedRealizationAnnotation}>
                        <Dropdown
                            options={
                                availableRealizations?.map((real) => {
                                    return { value: real.toString(), label: real.toString() };
                                }) ?? []
                            }
                            value={selectedRealization.value?.toString() ?? undefined}
                            onChange={handleRealizationNumberChange}
                        />
                    </SettingWrapper>
                    <Label text="Node Types">
                        <Select
                            options={Object.values(NodeType_api).map((val: NodeType_api) => {
                                return { value: val, label: NodeTypeEnumToStringMapping[val] };
                            })}
                            multiple={true}
                            value={Array.from(selectedNodeTypes).map((val: string) => val)}
                            onChange={handleSelectedNodeTypesChange}
                            size={3}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup
                expanded={true}
                title="Network selections"
                hasError={
                    selectedDateTime.depsHaveError || selectedEdgeKey.depsHaveError || selectedNodeKey.depsHaveError
                }
            >
                <div className="flex flex-col gap-2">
                    <SettingWrapper
                        label="Tree Type"
                        loadingOverlay={selectedTreeType.isLoading}
                        errorOverlay={selectedTreeType.depsHaveError ? "Could not load tree types." : undefined}
                        annotations={selectedTreeTypeAnnotation}
                    >
                        <Dropdown
                            options={availableTreeTypes.map((type) => {
                                return { value: type, label: type };
                            })}
                            value={selectedTreeType.value}
                            onChange={setSelectedTreeType}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Edge options"
                        annotations={selectedEdgeKeyAnnotation}
                        loadingOverlay={selectedEdgeKey.isLoading}
                        errorOverlay={selectedEdgeKey.depsHaveError ? "Could not load edges." : undefined}
                    >
                        <Dropdown
                            placeholder={!edgeMetadataList.length ? "No edge data available" : ""}
                            disabled={!edgeMetadataList.length}
                            options={edgeMetadataList.map((item) => {
                                return { label: item.label, value: item.key };
                            })}
                            value={selectedEdgeKey.value ?? ""}
                            onChange={handleSelectedEdgeKeyChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Node options"
                        annotations={selectedNodeKeyAnnotation}
                        loadingOverlay={selectedNodeKey.isLoading}
                        errorOverlay={selectedNodeKey.depsHaveError ? "Could not load nodes." : undefined}
                    >
                        <Dropdown
                            options={nodeMetadataList.map((item) => {
                                return { label: item.label, value: item.key };
                            })}
                            value={selectedNodeKey.value ?? ""}
                            onChange={handleSelectedNodeKeyChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Time steps"
                        loadingOverlay={selectedDateTime.isLoading}
                        annotations={selectedDateTimeAnnotation}
                        errorOverlay={selectedDateTime.depsHaveError ? "Could not load time steps." : undefined}
                    >
                        <DiscreteSlider
                            valueLabelDisplay="auto"
                            value={selectedDateTimeIndex !== -1 ? selectedDateTimeIndex : undefined}
                            values={availableDateTimes.map((_, index) => {
                                return index;
                            })}
                            valueLabelFormat={createValueLabelFormat}
                            onChange={(_, value) => handleSelectedTimeStepIndexChange(value)}
                        />
                    </SettingWrapper>
                </div>
            </CollapsibleGroup>
        </div>
    );
}

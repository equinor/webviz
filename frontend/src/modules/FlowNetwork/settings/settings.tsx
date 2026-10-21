import React from "react";

import { useAtom, useAtomValue } from "jotai";

import { NodeType_api, Frequency_api } from "@api";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Combobox } from "@lib/components/Combobox";
import { Select } from "@lib/components/Select";
import { Setting } from "@lib/components/Setting";
import type { SettingAnnotation } from "@lib/components/Setting";
import { Slider } from "@lib/components/Slider";
import { TextInput } from "@lib/components/TextInput";
import { useAddActionRequiredToStatusWriter } from "@modules/_shared/hooks/useAddStatusWriterMessages";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { propagateQueryErrorToStatusWriter } from "@modules/_shared/utils/propagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { FrequencyEnumToStringMapping, NodeTypeEnumToStringMapping } from "../types";

import { selectedNodeTypesAtom, selectedResamplingFrequencyAtom } from "./atoms/baseAtoms";
import {
    areQuerySelectionsValidAtom,
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
    const addActionRequiredToStatusWriter = useAddActionRequiredToStatusWriter(statusWriter);

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
    const areQuerySelectionsValid = useAtomValue(areQuerySelectionsValidAtom);

    // A disabled query keeps its cached error, which must not be reported for an invalid selection
    if (areQuerySelectionsValid) {
        propagateQueryErrorToStatusWriter(flowNetworkQuery, statusWriter);
    }

    const ensembleRealizationFilterFunction = useEnsembleRealizationFilterFunc(workbenchSession);
    const timeStepSliderDebounceTimeMs = 10;
    const timeStepSliderDebounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (timeStepSliderDebounceTimerRef.current) {
            clearTimeout(timeStepSliderDebounceTimerRef.current);
        }
    });

    function handleEnsembleSelectionChange(ensembleIdent: RegularEnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
    }

    function handleSelectedTimeStepIndexChange(value: number | readonly number[], eventDetails: { reason: string }) {
        // Bounds changes make the slider emit a clamped value; ignore it so a retained invalid time step stays until the
        // user edits it
        if (eventDetails.reason === "clamp-value") return;

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

    const createValueLabelFormat = React.useCallback(
        function createValueLabelFormat(value: number): string {
            if (!availableDateTimes || value < 0 || value >= availableDateTimes.length) return "";

            return availableDateTimes[value];
        },
        [availableDateTimes],
    );

    const selectedDateTimeIndex = selectedDateTime.value ? availableDateTimes.indexOf(selectedDateTime.value) : -1;

    const selectedEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);
    const selectedTreeTypeAnnotations = useMakePersistableFixableAtomAnnotations(selectedTreeTypeAtom);
    const selectedRealizationAnnotations = useMakePersistableFixableAtomAnnotations(selectedRealizationAtom);
    const selectedEdgeKeyAnnotations = useMakePersistableFixableAtomAnnotations(selectedEdgeKeyAtom);
    const selectedNodeKeyAnnotations = useMakePersistableFixableAtomAnnotations(selectedNodeKeyAtom);
    const selectedDateTimeAnnotations = useMakePersistableFixableAtomAnnotations(selectedDateTimeAtom);

    const handleSettingsAnnotationsChange = React.useCallback(
        function handleSettingsAnnotationsChange(annotations: SettingAnnotation[]) {
            const invalidFieldValueMessages = annotations.filter((a) => a.type === "error").map((a) => a.message);
            addActionRequiredToStatusWriter(invalidFieldValueMessages);
        },
        [addActionRequiredToStatusWriter],
    );

    return (
        <Setting.ScrollArea>
            <Setting.Panel onAnnotationsChange={handleSettingsAnnotationsChange}>
                <Setting.Section title="Data" defaultOpen>
                    <Setting.Field label="Ensemble" annotations={selectedEnsembleIdentAnnotations}>
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={selectedEnsembleIdent.value}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                            onValueChange={handleEnsembleSelectionChange}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Realization"
                        annotations={
                            // Without a realization to choose (e.g. all excluded by the realization filter), the
                            // network settings are blocked - so point at the cause
                            selectedEnsembleIdent.isValidInContext && availableRealizations.length === 0
                                ? [
                                      ...selectedRealizationAnnotations,
                                      {
                                          type: "warning",
                                          message: "No realizations available. Check the realization filter.",
                                      },
                                  ]
                                : selectedRealizationAnnotations
                        }
                    >
                        <Combobox
                            items={availableRealizations.map((real) => {
                                return { value: real, label: real.toString() };
                            })}
                            value={selectedRealization.value}
                            onValueChange={setSelectedRealization}
                        />
                    </Setting.Field>
                    <Setting.Field label="Frequency">
                        <Combobox
                            items={Object.values(Frequency_api).map((val: Frequency_api) => {
                                return { value: val, label: FrequencyEnumToStringMapping[val] };
                            })}
                            value={selectedResamplingFrequency}
                            onValueChange={(v) => v && setSelectedResamplingFrequency(v)}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Node Types"
                        annotations={
                            // No data is loaded without a node type, which blocks the network settings below
                            selectedNodeTypes.size === 0
                                ? [{ type: "error", message: "Select at least one node type." }]
                                : []
                        }
                    >
                        <Select
                            options={Object.values(NodeType_api).map((val: NodeType_api) => {
                                return { value: val, label: NodeTypeEnumToStringMapping[val] };
                            })}
                            value={Array.from(selectedNodeTypes)}
                            onValueChange={(v) => setSelectedNodeTypes(new Set(v))}
                            size={3}
                            multiple
                        />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Network" defaultOpen>
                    <Setting.Field
                        label="Tree Type"
                        help={{
                            content:
                                'Which network definition from the reservoir simulator to display. "Standard Network" is the simulator\'s GRUPTREE group hierarchy (producers + injectors); "Extended Network" is the BRANPROP production-network topology, shown only when the model defines it.',
                        }}
                        loadingOverlay={selectedTreeType.isLoading}
                        errorOverlay={selectedTreeType.depsHaveError ? "Could not load tree types." : undefined}
                        annotations={selectedTreeTypeAnnotations}
                    >
                        <Combobox
                            items={availableTreeTypes.map((type) => {
                                return { value: type, label: type };
                            })}
                            value={selectedTreeType.value ?? null}
                            onValueChange={(v) => v && setSelectedTreeType(v)}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Edge options"
                        annotations={selectedEdgeKeyAnnotations}
                        loadingOverlay={selectedEdgeKey.isLoading}
                        errorOverlay={selectedEdgeKey.depsHaveError ? "Could not load edges." : undefined}
                    >
                        <Combobox
                            placeholder={!edgeMetadataList.length ? "No edge data available" : ""}
                            disabled={!edgeMetadataList.length}
                            items={edgeMetadataList.map((item) => {
                                return { label: item.label, value: item.key };
                            })}
                            value={selectedEdgeKey.value ?? null}
                            onValueChange={(v) => v && setSelectedEdgeKey(v)}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Node options"
                        annotations={selectedNodeKeyAnnotations}
                        loadingOverlay={selectedNodeKey.isLoading}
                        errorOverlay={selectedNodeKey.depsHaveError ? "Could not load nodes." : undefined}
                    >
                        <Combobox
                            placeholder={!nodeMetadataList.length ? "No node data available" : ""}
                            disabled={!nodeMetadataList.length}
                            items={nodeMetadataList.map((item) => {
                                return { label: item.label, value: item.key };
                            })}
                            value={selectedNodeKey.value ?? null}
                            onValueChange={(v) => v && setSelectedNodeKey(v)}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Time step"
                        loadingOverlay={selectedDateTime.isLoading}
                        annotations={selectedDateTimeAnnotations}
                        errorOverlay={selectedDateTime.depsHaveError ? "Could not load time steps." : undefined}
                    >
                        <div className="gap-sm flex">
                            <Slider
                                layoutClassName="grow w-full"
                                valueLabelDisplay="auto"
                                disabled={!availableDateTimes.length}
                                min={0}
                                max={availableDateTimes.length ? availableDateTimes.length - 1 : 0}
                                markers={availableDateTimes.map((_, index) => index)}
                                markerLabels={(v, i) => {
                                    if (i === 0 || i === availableDateTimes.length - 1) {
                                        return createValueLabelFormat(v);
                                    }
                                }}
                                // -1 for an invalid time step: the slider shows it at the start, but still treats
                                // a click there as a change - so the first time step can be picked
                                value={selectedDateTimeIndex}
                                valueLabelFormat={createValueLabelFormat}
                                onValueChange={handleSelectedTimeStepIndexChange}
                            />
                            <div className="relative flex shrink">
                                <span className="px-sm pointer-events-none invisible whitespace-nowrap">
                                    {selectedDateTime.value ?? "No time step selected"}
                                </span>
                                <TextInput
                                    layoutClassName="absolute! inset-0"
                                    value={selectedDateTime.value ?? ""}
                                    placeholder="No time step selected"
                                    size="small"
                                    readOnly
                                />
                            </div>
                        </div>
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}

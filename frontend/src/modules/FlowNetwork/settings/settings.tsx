import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { Frequency_api, NodeType_api } from "@api";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { DiscreteSlider } from "@lib/components/DiscreteSlider";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";


import type { Interfaces } from "../interfaces";
import { FrequencyEnumToStringMapping, NodeTypeEnumToStringMapping } from "../types";

import {
    selectedNodeTypesAtom,
    selectedResamplingFrequencyAtom,
    userSelectedDateTimeAtom,
    userSelectedEdgeKeyAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedNodeKeyAtom,
    userSelectedRealizationNumberAtom,
    validRealizationNumbersAtom,
} from "./atoms/baseAtoms";
import {
    availableDateTimesAtom,
    edgeMetadataListAtom,
    flowNetworkQueryResultAtom,
    nodeMetadataListAtom,
    selectedDateTimeAtom,
    selectedEdgeKeyAtom,
    selectedEnsembleIdentAtom,
    selectedNodeKeyAtom,
    selectedRealizationNumberAtom,
} from "./atoms/derivedAtoms";


export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const availableDateTimes = useAtomValue(availableDateTimesAtom);
    const edgeMetadataList = useAtomValue(edgeMetadataListAtom);
    const nodeMetadataList = useAtomValue(nodeMetadataListAtom);

    const [selectedResamplingFrequency, setSelectedResamplingFrequency] = useAtom(selectedResamplingFrequencyAtom);
    const [selectedNodeTypes, setSelectedNodeTypes] = useAtom(selectedNodeTypesAtom);

    const selectedEdgeKey = useAtomValue(selectedEdgeKeyAtom);
    const setUserSelectedEdgeKey = useSetAtom(userSelectedEdgeKeyAtom);

    const selectedNodeKey = useAtomValue(selectedNodeKeyAtom);
    const setUserSelectedNodeKey = useSetAtom(userSelectedNodeKeyAtom);

    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const setUserSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);

    const selectedRealizationNumber = useAtomValue(selectedRealizationNumberAtom);
    const setUserSelectedRealizationNumber = useSetAtom(userSelectedRealizationNumberAtom);

    const selectedDateTime = useAtomValue(selectedDateTimeAtom);
    const setUserSelectedDateTime = useSetAtom(userSelectedDateTimeAtom);

    const FlowNetworkQueryResult = useAtomValue(flowNetworkQueryResultAtom);

    usePropagateApiErrorToStatusWriter(FlowNetworkQueryResult, statusWriter);

    const setValidRealizationNumbersAtom = useSetAtom(validRealizationNumbersAtom);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);
    const validRealizations = selectedEnsembleIdent ? [...filterEnsembleRealizationsFunc(selectedEnsembleIdent)] : null;
    setValidRealizationNumbersAtom(validRealizations);

    const timeStepSliderDebounceTimeMs = 10;
    const timeStepSliderDebounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (timeStepSliderDebounceTimerRef.current) {
            clearTimeout(timeStepSliderDebounceTimerRef.current);
        }
    });

    function handleSelectedNodeKeyChange(value: string) {
        setUserSelectedNodeKey(value);
    }

    function handleSelectedEdgeKeyChange(value: string) {
        setUserSelectedEdgeKey(value);
    }

    function handleEnsembleSelectionChange(ensembleIdent: RegularEnsembleIdent | null) {
        setUserSelectedEnsembleIdent(ensembleIdent);
    }

    function handleFrequencySelectionChange(newFrequencyStr: string) {
        const newFreq = newFrequencyStr as Frequency_api;
        setSelectedResamplingFrequency(newFreq);
    }

    function handleRealizationNumberChange(value: string) {
        const realizationNumber = parseInt(value);
        setUserSelectedRealizationNumber(realizationNumber);
    }

    function handleSelectedTimeStepIndexChange(value: number | number[]) {
        const singleValue = typeof value === "number" ? value : value.length > 0 ? value[0] : 0;
        const validIndex = singleValue >= 0 && singleValue < availableDateTimes.length ? singleValue : null;
        const newDateTime = validIndex !== null ? availableDateTimes[validIndex] : null;

        if (timeStepSliderDebounceTimerRef.current) {
            clearTimeout(timeStepSliderDebounceTimerRef.current);
        }

        timeStepSliderDebounceTimerRef.current = setTimeout(() => {
            setUserSelectedDateTime(newDateTime);
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

    const selectedDateTimeIndex = selectedDateTime ? availableDateTimes.indexOf(selectedDateTime) : -1;

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Ensemble">
                <EnsembleDropdown
                    ensembles={ensembleSet.getRegularEnsembleArray()}
                    value={selectedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
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
                    <Label text="Realization Number">
                        <Dropdown
                            options={
                                validRealizations?.map((real) => {
                                    return { value: real.toString(), label: real.toString() };
                                }) ?? []
                            }
                            value={selectedRealizationNumber?.toString() ?? undefined}
                            onChange={handleRealizationNumberChange}
                        />
                    </Label>
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
            <CollapsibleGroup expanded={true} title="Edge, node and date selections">
                <QueryStateWrapper
                    queryResult={FlowNetworkQueryResult}
                    loadingComponent={<CircularProgress />}
                    errorComponent={"Could not load flow network data"}
                >
                    <div className="flex flex-col gap-2">
                        <Label text="Edge options">
                            <Dropdown
                                placeholder={!edgeMetadataList.length ? "No edge data available" : ""}
                                disabled={!edgeMetadataList.length}
                                options={edgeMetadataList.map((item) => {
                                    return { label: item.label, value: item.key };
                                })}
                                value={selectedEdgeKey ?? ""}
                                onChange={handleSelectedEdgeKeyChange}
                            />
                        </Label>
                        <Label text="Node options">
                            <Dropdown
                                options={nodeMetadataList.map((item) => {
                                    return { label: item.label, value: item.key };
                                })}
                                value={selectedNodeKey ?? ""}
                                onChange={handleSelectedNodeKeyChange}
                            />
                        </Label>
                        <Label text={"Time Steps"}>
                            <DiscreteSlider
                                valueLabelDisplay="auto"
                                value={selectedDateTimeIndex != -1 ? selectedDateTimeIndex : undefined}
                                values={availableDateTimes.map((_, index) => {
                                    return index;
                                })}
                                valueLabelFormat={createValueLabelFormat}
                                onChange={(_, value) => handleSelectedTimeStepIndexChange(value)}
                            />
                        </Label>
                    </div>
                </QueryStateWrapper>
            </CollapsibleGroup>
        </div>
    );
}

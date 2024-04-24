import { Frequency_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";

import { useAtom, useAtomValue } from "jotai";

import {
    selectedResamplingFrequencyAtom,
    userSelectedEdgeKeyAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedNodeKeyAtom,
    userSelectedRealizationNumberAtom,
} from "./atoms/baseAtoms";
import {
    availableEdgeKeysAtom,
    availableNodeKeysAtom,
    selectedEdgeKeyAtom,
    selectedEnsembleIdentAtom,
    selectedNodeKeyAtom,
    selectedRealizationNumberAtom,
} from "./atoms/derivedAtoms";

import { Interface, State } from "../settingsToViewInterface";
import { FrequencyEnumToStringMapping } from "../types";

export function Settings({ workbenchSession }: ModuleSettingsProps<State, Interface>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const availableEdgeKeys = useAtomValue(availableEdgeKeysAtom);
    const selectedEdgeKey = useAtomValue(selectedEdgeKeyAtom);
    const [, setUserSelectedEdgeKey] = useAtom(userSelectedEdgeKeyAtom);

    const availableNodeKeys = useAtomValue(availableNodeKeysAtom);
    const selectedNodeKey = useAtomValue(selectedNodeKeyAtom);
    const [, setUserSelectedNodeKey] = useAtom(userSelectedNodeKeyAtom);

    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const [, setSelectedEnsembleIdent] = useAtom(userSelectedEnsembleIdentAtom);

    const [selectedResamplingFrequency, setSelectedResamplingFrequency] = useAtom(selectedResamplingFrequencyAtom);

    const selectedRealizationNumber = useAtomValue(selectedRealizationNumberAtom);
    const [, setUserSelectedRealizationNumber] = useAtom(userSelectedRealizationNumberAtom);

    function handleSelectedNodeKeyChange(value: string) {
        setUserSelectedNodeKey(value);
    }

    function handleSelectedEdgeKeyChange(value: string) {
        setUserSelectedEdgeKey(value);
    }

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
    }

    function handleFrequencySelectionChange(newFrequencyStr: string) {
        const newFreq = newFrequencyStr as Frequency_api;
        setSelectedResamplingFrequency(newFreq);
    }

    function handleRealizationNumberChange(value: string) {
        const realizationNumber = parseInt(value);
        setUserSelectedRealizationNumber(realizationNumber);
    }

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Ensemble">
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
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
            <CollapsibleGroup expanded={true} title="Realization Number">
                <Dropdown
                    options={
                        selectedEnsembleIdent
                            ? ensembleSet
                                  .findEnsemble(selectedEnsembleIdent)
                                  ?.getRealizations()
                                  .map((real) => {
                                      return { value: real.toString(), label: real.toString() };
                                  }) ?? []
                            : []
                    }
                    value={selectedRealizationNumber?.toString() ?? undefined}
                    onChange={handleRealizationNumberChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Edge, node and date selections">
                <Label text="Edge options">
                    <Dropdown
                        options={availableEdgeKeys.map((item) => {
                            return { label: item, value: item };
                        })}
                        value={selectedEdgeKey ?? ""}
                        onChange={handleSelectedEdgeKeyChange}
                    />
                </Label>
                <Label text="Node options">
                    <Dropdown
                        options={availableNodeKeys.map((item) => {
                            return { label: item, value: item };
                        })}
                        value={selectedNodeKey ?? ""}
                        onChange={handleSelectedNodeKeyChange}
                    />
                </Label>
                {/* <Label
                    text={
                        selectedTimeStepOptions.timeStepIndex === null || !availableTimeSteps
                            ? "Time Step"
                            : typeof selectedTimeStepOptions.timeStepIndex === "number"
                            ? `Time Step: (${availableTimeSteps[selectedTimeStepOptions.timeStepIndex]})`
                            : `Time Steps: (${availableTimeSteps[selectedTimeStepOptions.timeStepIndex[0]]}, ${
                                  availableTimeSteps[selectedTimeStepOptions.timeStepIndex[1]]
                              })`
                    }
                >
                    <DiscreteSlider
                        valueLabelDisplay="auto"
                        value={uniqueDates !== null ? selectedDate : undefined}
                        values={
                            uniqueDates
                                ? uniqueDates.map((t, index) => {
                                      return index;
                                  })
                                : []
                        }
                        valueLabelFormat={createValueLabelFormat}
                        onChange={handleSelectedTimeStepIndexChange}
                    />
                </Label> */}
            </CollapsibleGroup>
        </div>
    );
}

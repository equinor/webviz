import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtomValue, useSetAtom } from "jotai";

import { Interfaces } from "./interfaces";
import {
    userSelectedEnsembleIdentAtom,
    userSelectedResponseNameAtom,
    userSelectedRftTimestampsUtcMsAtom,
    userSelectedWellNameAtom,
    validRealizationNumbersAtom,
} from "./settings/atoms/baseAtoms";
import {
    availableRftResponseNamesAtom,
    availableRftTimestampsUtcMsAtom,
    availableRftWellNamesAtom,
    selectedEnsembleIdentAtom,
    selectedRftResponseNameAtom,
    selectedRftTimestampsUtcMsAtom,
    selectedRftWellNameAtom,
} from "./settings/atoms/derivedAtoms";
import { rftTableDefinitionAtom } from "./settings/atoms/queryAtoms";

//Helpers to populate dropdowns
const stringToOptions = (strings: string[]): SelectOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
};
const timepointOptions = (timePoints: number[]): SelectOption[] => {
    return timePoints.map((timePoint) => ({
        label: timestampUtcMsToCompactIsoString(timePoint),
        value: timePoint.toString(),
    }));
};

export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const setUserSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const setValidRealizationNumbersAtom = useSetAtom(validRealizationNumbersAtom);
    const validRealizations = selectedEnsembleIdent ? [...filterEnsembleRealizationsFunc(selectedEnsembleIdent)] : null;
    setValidRealizationNumbersAtom(validRealizations);

    const rftTableDefinition = useAtomValue(rftTableDefinitionAtom);

    const availableRftResponseNames = useAtomValue(availableRftResponseNamesAtom);
    const selectedRftResponseName = useAtomValue(selectedRftResponseNameAtom);
    const setUserSelectedRftResponseName = useSetAtom(userSelectedResponseNameAtom);

    const availableRftWellNames = useAtomValue(availableRftWellNamesAtom);
    const selectedRftWellName = useAtomValue(selectedRftWellNameAtom);
    const setUserSelectedRftWellName = useSetAtom(userSelectedWellNameAtom);

    const availableTimeStampsUtcMs = useAtomValue(availableRftTimestampsUtcMsAtom);
    const selectedRftTimestampsUtcMs = useAtomValue(selectedRftTimestampsUtcMsAtom);
    const setUserSelectedRftTimestampsUtcMs = useSetAtom(userSelectedRftTimestampsUtcMsAtom);

    const rftTableDefErrorMessage = usePropagateApiErrorToStatusWriter(rftTableDefinition, statusWriter) ?? "";

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setUserSelectedEnsembleIdent(ensembleIdent);
    }
    function handleResponseNameChange(responseNames: string[]) {
        setUserSelectedRftResponseName(responseNames[0]);
    }
    function handleWellNameChange(wellNames: string[]) {
        setUserSelectedRftWellName(wellNames[0]);
    }
    function handleTimeStampUtcMsChange(timePoints: string[]) {
        setUserSelectedRftTimestampsUtcMs(parseInt(timePoints[0]));
    }

    return (
        <div>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={selectedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </CollapsibleGroup>
            <PendingWrapper isPending={rftTableDefinition.isFetching} errorMessage={rftTableDefErrorMessage}>
                <CollapsibleGroup expanded={true} title="Response">
                    <Select
                        size={4}
                        filter={true}
                        options={stringToOptions(availableRftResponseNames)}
                        value={selectedRftResponseName ? [selectedRftResponseName] : []}
                        onChange={handleResponseNameChange}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Well">
                    <Select
                        size={10}
                        filter={true}
                        options={stringToOptions(availableRftWellNames)}
                        value={selectedRftWellName ? [selectedRftWellName] : []}
                        onChange={handleWellNameChange}
                    />
                    <Select
                        size={10}
                        filter={true}
                        options={timepointOptions(availableTimeStampsUtcMs)}
                        value={selectedRftTimestampsUtcMs ? [selectedRftTimestampsUtcMs.toString()] : []}
                        onChange={handleTimeStampUtcMsChange}
                    />
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
}

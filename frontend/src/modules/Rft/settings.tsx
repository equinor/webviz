import React, { useEffect } from "react";
import { ModuleFCProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";

import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { TimestampSlider } from "@lib/components/TimestampSlider";
import state, { RftWellAddress } from "./state";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";

import { useRftWellList } from "./queryHooks";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Select } from "@lib/components/Select";
import { isEqual } from "lodash";

//Helpers to populate dropdowns
const stringToOptions = (strings: string[]): DropdownOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
}
const numberToOptions = (numbers: number[]): DropdownOption[] => {
    return numbers.map((number) => ({ label: number.toString(), value: number.toString() }));
}

export function settings({ moduleContext, workbenchServices, workbenchSession }: ModuleFCProps<state>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [rftWellAddress, setRftWellAddress] = moduleContext.useStoreState("rftWellAddress")
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [selectedWellName, setSelectedWellName] = React.useState<string | null>(null);
    const [selectedTime, setSelectedTime] = React.useState<number | null>(null)
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    const rftWellListQuery = useRftWellList(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    const wellNames: string[] = [];

    if (rftWellListQuery.data) {
        rftWellListQuery.data.forEach((well) => {
            wellNames.push(well.well_name);

        });
    }
    const computedWellName = fixupSyncedOrSelectedOrFirstStringValue(
        null, selectedWellName, wellNames)
    if (computedWellName !== selectedWellName) {
        setSelectedWellName(computedWellName);
    }
    const availableTimePoints: number[] = [];
    if (rftWellListQuery.data && computedWellName) {
        rftWellListQuery.data.forEach((well) => {
            if (well.well_name === computedWellName) {
                well.timestamps_utc_ms.forEach((timepoint) => {
                    availableTimePoints.push(timepoint);
                });
            }
        });

    }
    const computedTimePoint = fixupSyncedOrSelectedOrFirstNumberValue(
        null, selectedTime, availableTimePoints.map((timepoint) => timepoint)
    );
    React.useEffect(() => {
        if (selectedEnsembleIdent && selectedWellName && computedTimePoint) {
            const addr: RftWellAddress = {
                addressType: "realizations",
                caseUuid: selectedEnsembleIdent.getCaseUuid(),
                ensembleName: selectedEnsembleIdent.getEnsembleName(),
                wellName: selectedWellName,
                timePoint: computedTimePoint,
                responseName: "PRESSURE",
                realizationNums: null
            };
            if (!isEqual(addr, rftWellAddress)) {
                setRftWellAddress(addr)
            }
        }
    }, [computedTimePoint, selectedWellName, selectedEnsembleIdent]);
    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        console.debug("handleEnsembleSelectionChange()");
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }
    function handleWellNameChange(wellNames: string[]) {
        if (wellNames.length !== 0) {
            setSelectedWellName(wellNames[0]);
            return;
        }
        setSelectedWellName(null);
    }
    function handleTimePointChange(event: Event, value: number | number[]) {
        setSelectedTime(value as number);
    }
    return (
        <div>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Well">
                <Select size={5} filter={true} options={stringToOptions(wellNames)} value={computedWellName ? [computedWellName] : []} onChange={handleWellNameChange} />
                <TimestampSlider value={computedTimePoint ?? undefined} onChange={handleTimePointChange} valueLabelDisplay={"off"} values={availableTimePoints} />
            </CollapsibleGroup>
        </div>
    );
}

function fixupSyncedOrSelectedOrFirstStringValue(
    syncedValue: string | null,
    selectedValue: string | null,
    values: string[]
): string | null {
    if (syncedValue && values.includes(syncedValue)) {
        return syncedValue;
    }
    if (selectedValue && values.includes(selectedValue)) {
        return selectedValue;
    }
    if (values.length) {
        return values[0];
    }
    return null;
}

function fixupSyncedOrSelectedOrFirstNumberValue(
    syncedValue: number | null,
    selectedValue: number | null,
    values: number[]
): number | null {
    if (syncedValue && values.includes(syncedValue)) {
        return syncedValue;
    }
    if (selectedValue && values.includes(selectedValue)) {
        return selectedValue;
    }
    if (values.length) {
        return values[0];
    }
    return null;
}

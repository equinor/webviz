import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Select, SelectOption } from "@lib/components/Select";

import { useAtom } from "jotai";
import { isEqual } from "lodash";

import { Interfaces } from "./interfaces";
import { useRftWellList } from "./queryHooks";
import { rftWellAddressAtom } from "./settings/atoms/baseAtoms";
import { RftWellAddress } from "./typesAndEnums";

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

export function Settings({ settingsContext, workbenchServices, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [rftWellAddress, setRftWellAddress] = useAtom(rftWellAddressAtom);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [selectedWellName, setSelectedWellName] = React.useState<string | null>(null);
    const [selectedTimePoint, setSelectedTimePoint] = React.useState<number | null>(null);
    const syncedSettingKeys = settingsContext.useSyncedSettingKeys();
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
    const computedWellName = fixupSyncedOrSelectedOrFirstStringValue(null, selectedWellName, wellNames);
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
    const computedTimePoint = fixupSyncedOrSelectedOrFirstNumberValue(null, selectedTimePoint, availableTimePoints);
    if (computedTimePoint !== selectedTimePoint) {
        setSelectedTimePoint(computedTimePoint);
    }
    React.useEffect(
        function propogateRftAddressToView() {
            if (selectedEnsembleIdent && selectedWellName && computedTimePoint) {
                const addr: RftWellAddress = {
                    addressType: "realizations",
                    caseUuid: selectedEnsembleIdent.getCaseUuid(),
                    ensembleName: selectedEnsembleIdent.getEnsembleName(),
                    wellName: selectedWellName,
                    timePoint: computedTimePoint,
                    responseName: "PRESSURE",
                    realizationNums: null,
                };
                if (!isEqual(addr, rftWellAddress)) {
                    setRftWellAddress(addr);
                }
            }
        },
        [computedTimePoint, selectedWellName, selectedEnsembleIdent, setRftWellAddress, rftWellAddress]
    );
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
    function handleTimePointChange(timePoints: string[]) {
        if (timePoints.length !== 0) {
            setSelectedTimePoint(parseInt(timePoints[0]));
            return;
        }
        setSelectedTimePoint(null);
    }
    return (
        <div>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Well">
                <Select
                    size={10}
                    filter={true}
                    options={stringToOptions(wellNames)}
                    value={computedWellName ? [computedWellName] : []}
                    onChange={handleWellNameChange}
                />
                <Select
                    size={10}
                    filter={true}
                    options={timepointOptions(availableTimePoints)}
                    value={computedTimePoint ? [computedTimePoint.toString()] : []}
                    onChange={handleTimePointChange}
                />
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

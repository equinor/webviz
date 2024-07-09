import React from "react";

import { FluidZone_api, InplaceVolumetricsIdentifierWithValues_api, InplaceVolumetricsIdentifier_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { SettingsContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { Button } from "@lib/components/Button";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";
import { Deselect, SelectAll } from "@mui/icons-material";

import { cloneDeep, isEqual } from "lodash";

export type InplaceVolumetricsFilterComponentProps = {
    ensembleSet: EnsembleSet;
    settingsContext: SettingsContext<any, any, any, any>;
    workbenchServices: WorkbenchServices;
    availableTableNames: string[];
    availableFluidZones: FluidZone_api[];
    availableIdentifiersWithValues: InplaceVolumetricsIdentifierWithValues_api[];
    selectedEnsembleIdents: EnsembleIdent[];
    selectedTableNames: string[];
    selectedFluidZones: FluidZone_api[];
    selectedIdentifiersValues: InplaceVolumetricsIdentifierWithValues_api[];
    onChange: (filter: InplaceVolumetricsFilter) => void;
    isPending?: boolean;
    errorMessage?: string;
};

export function InplaceVolumetricsFilterComponent(props: InplaceVolumetricsFilterComponentProps): React.ReactNode {
    const [ensembleIdents, setEnsembleIdents] = React.useState<EnsembleIdent[]>(props.selectedEnsembleIdents);
    const [tableNames, setTableNames] = React.useState<string[]>(props.selectedTableNames);
    const [fluidZones, setFluidZones] = React.useState<FluidZone_api[]>(props.selectedFluidZones);
    const [identifiersValues, setIdentifiersValues] = React.useState<InplaceVolumetricsIdentifierWithValues_api[]>(
        props.selectedIdentifiersValues
    );

    const [prevEnsembleIdents, setPrevEnsembleIdents] = React.useState<EnsembleIdent[]>(props.selectedEnsembleIdents);
    const [prevTableNames, setPrevTableNames] = React.useState<string[]>(props.selectedTableNames);
    const [prevFluidZones, setPrevFluidZones] = React.useState<string[]>(props.selectedFluidZones);
    const [prevIdentifiersValues, setPrevIdentifiersValues] = React.useState<
        InplaceVolumetricsIdentifierWithValues_api[]
    >(props.selectedIdentifiersValues);

    if (!isEqual(props.selectedEnsembleIdents, prevEnsembleIdents)) {
        setEnsembleIdents(props.selectedEnsembleIdents);
        setPrevEnsembleIdents(props.selectedEnsembleIdents);
    }

    if (!isEqual(props.selectedTableNames, prevTableNames)) {
        setTableNames(props.selectedTableNames);
        setPrevTableNames(props.selectedTableNames);
    }

    if (!isEqual(props.selectedFluidZones, prevFluidZones)) {
        setFluidZones(props.selectedFluidZones);
        setPrevFluidZones(props.selectedFluidZones);
    }

    if (!isEqual(props.selectedIdentifiersValues, prevIdentifiersValues)) {
        setIdentifiersValues(props.selectedIdentifiersValues);
        setPrevIdentifiersValues(props.selectedIdentifiersValues);
    }

    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const syncedFilter = syncHelper.useValue(
        SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
        "global.syncValue.inplaceVolumetricsFilter"
    );

    if (syncedFilter) {
        if (!isEqual(syncedFilter.ensembleIdents, ensembleIdents)) {
            handleEnsembleIdentsChange(syncedFilter.ensembleIdents);
        }

        if (!isEqual(syncedFilter.tableNames, tableNames)) {
            handleTableNamesChange(syncedFilter.tableNames);
        }

        if (!isEqual(syncedFilter.fluidZones, fluidZones)) {
            handleFluidZoneChange(syncedFilter.fluidZones);
        }

        if (!isEqual(syncedFilter.identifiersValues, identifiersValues)) {
            setIdentifiersValues(syncedFilter.identifiersValues);
            for (const identifier of syncedFilter.identifiersValues) {
                handleIdentifierValuesChange(identifier.identifier, identifier.values);
            }
        }
    }

    function handleEnsembleIdentsChange(newEnsembleIdents: EnsembleIdent[]): void {
        setEnsembleIdents(newEnsembleIdents);
        const filter = {
            ensembleIdents: newEnsembleIdents,
            tableNames: tableNames,
            fluidZones,
            identifiersValues: identifiersValues,
        };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    function handleTableNamesChange(newTableNames: string[]): void {
        setTableNames(newTableNames);
        const filter = { ensembleIdents, tableNames: newTableNames, fluidZones, identifiersValues: identifiersValues };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    function handleFluidZoneChange(newFluidZones: FluidZone_api[]): void {
        setFluidZones(newFluidZones);
        const filter = {
            ensembleIdents,
            tableNames: tableNames,
            fluidZones: newFluidZones,
            identifiersValues: identifiersValues,
        };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    function handleIdentifierValuesChange(
        identifier: InplaceVolumetricsIdentifier_api,
        values: (string | number)[]
    ): void {
        const newIdentifiersValues = cloneDeep(identifiersValues);
        const identifierValues = newIdentifiersValues.find((filter) => filter.identifier === identifier);
        if (!identifierValues) {
            newIdentifiersValues.push({ identifier: identifier, values });
        } else {
            identifierValues.values = values;
        }
        setIdentifiersValues(newIdentifiersValues);
        const filter = { ensembleIdents, tableNames: tableNames, fluidZones, identifiersValues: newIdentifiersValues };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    const tableSourceOptions = props.availableTableNames.map((source) => ({ value: source, label: source }));
    const fluidZoneOptions = props.availableFluidZones.map((zone) => ({ value: zone, label: zone }));

    return (
        <>
            <CollapsibleGroup title="Ensembles" expanded>
                <EnsembleSelect
                    ensembleSet={props.ensembleSet}
                    value={ensembleIdents}
                    onChange={handleEnsembleIdentsChange}
                    size={5}
                />
            </CollapsibleGroup>
            <PendingWrapper isPending={props.isPending ?? false} errorMessage={props.errorMessage}>
                <div className="flex flex-col gap-2">
                    <CollapsibleGroup title="Volumetric table names" expanded>
                        <Select
                            options={tableSourceOptions}
                            value={tableNames}
                            onChange={handleTableNamesChange}
                            multiple
                            size={3}
                        />
                    </CollapsibleGroup>
                    <CollapsibleGroup title="Fluid zones" expanded>
                        <Select
                            options={fluidZoneOptions}
                            value={fluidZones}
                            onChange={handleFluidZoneChange}
                            multiple
                            size={3}
                        />
                    </CollapsibleGroup>
                    <CollapsibleGroup title="Identifier filters" expanded>
                        <div className="flex flex-col gap-2">
                            {props.availableIdentifiersWithValues.map((identifier) => (
                                <CollapsibleGroup key={identifier.identifier} title={identifier.identifier} expanded>
                                    <SelectWithQuickSelectButtons
                                        options={identifier.values.map((value) => ({
                                            value: value,
                                            label: value.toString(),
                                        }))}
                                        value={
                                            identifiersValues.find((el) => el.identifier === identifier.identifier)
                                                ?.values ?? []
                                        }
                                        onChange={(value) => handleIdentifierValuesChange(identifier.identifier, value)}
                                        multiple
                                        size={Math.max(Math.min(identifier.values.length, 10), 3)}
                                    />
                                </CollapsibleGroup>
                            ))}
                        </div>
                    </CollapsibleGroup>
                </div>
            </PendingWrapper>
        </>
    );
}

function SelectWithQuickSelectButtons<TValue>(props: SelectProps<TValue>): React.ReactNode {
    function handleSelectAll() {
        if (!props.onChange) {
            return;
        }
        props.onChange(props.options.map((option: SelectOption<TValue>) => option.value));
    }

    function handleUnselectAll() {
        if (!props.onChange) {
            return;
        }
        props.onChange([]);
    }

    return (
        <div className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2 items-center">
                <Button
                    onClick={handleSelectAll}
                    startIcon={<SelectAll fontSize="inherit" />}
                    variant="text"
                    title="Select all"
                    size="small"
                >
                    Select all
                </Button>
                <Button
                    onClick={handleUnselectAll}
                    startIcon={<Deselect fontSize="inherit" />}
                    variant="text"
                    title="Unselect all"
                    size="small"
                >
                    Unselect all
                </Button>
            </div>
            <Select {...props} />
        </div>
    );
}

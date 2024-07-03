import React from "react";

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

import { isEqual } from "lodash";

export type InplaceVolumetricsFilterComponentProps<TIndexFilters> = {
    ensembleSet: EnsembleSet;
    settingsContext: SettingsContext<any, any, any, any>;
    workbenchServices: WorkbenchServices;
    availableTableSources: string[];
    availableFluidZones: string[];
    availableIndexFilters: TIndexFilters;
    selectedEnsembleIdents: EnsembleIdent[];
    selectedTableSources: string[];
    selectedFluidZones: string[];
    selectedIndexFilters: TIndexFilters;
    onChange: (filter: InplaceVolumetricsFilter) => void;
    isPending?: boolean;
    errorMessage?: string;
};

export function InplaceVolumetricsFilterComponent<TIndexFilters extends Record<string, string[]>>(
    props: InplaceVolumetricsFilterComponentProps<TIndexFilters>
): React.ReactNode {
    const [ensembleIdents, setEnsembleIdents] = React.useState<EnsembleIdent[]>(props.selectedEnsembleIdents);
    const [tableSources, setTableSources] = React.useState<string[]>(props.selectedTableSources);
    const [fluidZones, setFluidZones] = React.useState<string[]>(props.selectedFluidZones);
    const [indexFilters, setIndexFilters] = React.useState<TIndexFilters>(props.selectedIndexFilters);

    const [prevEnsembleIdents, setPrevEnsembleIdents] = React.useState<EnsembleIdent[]>(props.selectedEnsembleIdents);
    const [prevTableSources, setPrevTableSources] = React.useState<string[]>(props.selectedTableSources);
    const [prevFluidZones, setPrevFluidZones] = React.useState<string[]>(props.selectedFluidZones);
    const [prevIndexFilters, setPrevIndexFilters] = React.useState<TIndexFilters>(props.selectedIndexFilters);

    if (!isEqual(props.selectedEnsembleIdents, prevEnsembleIdents)) {
        setEnsembleIdents(props.selectedEnsembleIdents);
        setPrevEnsembleIdents(props.selectedEnsembleIdents);
    }

    if (!isEqual(props.selectedTableSources, prevTableSources)) {
        setTableSources(props.selectedTableSources);
        setPrevTableSources(props.selectedTableSources);
    }

    if (!isEqual(props.selectedFluidZones, prevFluidZones)) {
        setFluidZones(props.selectedFluidZones);
        setPrevFluidZones(props.selectedFluidZones);
    }

    if (!isEqual(props.selectedIndexFilters, prevIndexFilters)) {
        setIndexFilters(props.selectedIndexFilters);
        setPrevIndexFilters(props.selectedIndexFilters);
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

        if (!isEqual(syncedFilter.tableSources, tableSources)) {
            handleTableSourcesChange(syncedFilter.tableSources);
        }

        if (!isEqual(syncedFilter.fluidZones, fluidZones)) {
            handleFluidZoneChange(syncedFilter.fluidZones);
        }

        if (!isEqual(syncedFilter.indexFilters, indexFilters)) {
            for (const [index, values] of Object.entries(syncedFilter.indexFilters).filter(
                ([index]) => index in props.availableIndexFilters
            )) {
                if (!isEqual(values, indexFilters[index])) {
                    handleIndexFilterChange(index, values as TIndexFilters[keyof TIndexFilters]);
                }
            }
        }
    }

    function handleEnsembleIdentsChange(newEnsembleIdents: EnsembleIdent[]): void {
        setEnsembleIdents(newEnsembleIdents);
        const filter = { ensembleIdents: newEnsembleIdents, tableSources, fluidZones, indexFilters };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    function handleTableSourcesChange(newTableSources: string[]): void {
        setTableSources(newTableSources);
        const filter = { ensembleIdents, tableSources: newTableSources, fluidZones, indexFilters };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    function handleFluidZoneChange(newFluidZones: string[]): void {
        setFluidZones(newFluidZones);
        const filter = { ensembleIdents, tableSources, fluidZones: newFluidZones, indexFilters };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    function handleIndexFilterChange<TKey extends keyof TIndexFilters>(index: TKey, value: TIndexFilters[TKey]): void {
        const newIndexFilters = { ...indexFilters, [index]: value };
        setIndexFilters(newIndexFilters);
        const filter = { ensembleIdents, tableSources, fluidZones, indexFilters: newIndexFilters };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    const tableSourceOptions = props.availableTableSources.map((source) => ({ value: source, label: source }));
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
                    <CollapsibleGroup title="Volumetric table sources" expanded>
                        <Select
                            options={tableSourceOptions}
                            value={tableSources}
                            onChange={handleTableSourcesChange}
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
                    <CollapsibleGroup title="Index filters" expanded>
                        <div className="flex flex-col gap-2">
                            {Object.entries(props.availableIndexFilters).map(([index, values]) => (
                                <CollapsibleGroup key={index} title={index} expanded>
                                    <SelectWithQuickSelectButtons
                                        options={values.map((value) => ({ value: value, label: value }))}
                                        value={indexFilters[index]}
                                        onChange={(value) =>
                                            handleIndexFilterChange(index, value as TIndexFilters[keyof TIndexFilters])
                                        }
                                        multiple
                                        size={Math.max(Math.min(values.length, 10), 3)}
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

function SelectWithQuickSelectButtons(props: SelectProps): React.ReactNode {
    function handleSelectAll() {
        if (!props.onChange) {
            return;
        }
        props.onChange(props.options.map((option: SelectOption) => option.value));
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

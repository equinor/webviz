import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { SettingsContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Select } from "@lib/components/Select";

import { isEqual } from "lodash";

export type InplaceVolumetricsFilterComponentProps<TIndexFilters> = {
    ensembleSet: EnsembleSet;
    settingsContext: SettingsContext<any, any, any, any>;
    workbenchServices: WorkbenchServices;
    availableTableSources: string[];
    availableIndexFilters: TIndexFilters;
    selectedEnsembleIdents: EnsembleIdent[];
    selectedTableSources: string[];
    selectedIndexFilters: TIndexFilters;
    onChange: (filter: InplaceVolumetricsFilter) => void;
};

export function InplaceVolumetricsFilterComponent<TIndexFilters extends Record<string, string[]>>(
    props: InplaceVolumetricsFilterComponentProps<TIndexFilters>
): React.ReactNode {
    const [ensembleIdents, setEnsembleIdents] = React.useState<EnsembleIdent[]>(props.selectedEnsembleIdents);
    const [tableSources, setTableSources] = React.useState<string[]>(props.selectedTableSources);
    const [indexFilters, setIndexFilters] = React.useState<TIndexFilters>(props.selectedIndexFilters);

    const [prevEnsembleIdents, setPrevEnsembleIdents] = React.useState<EnsembleIdent[]>(props.selectedEnsembleIdents);
    const [prevTableSources, setPrevTableSources] = React.useState<string[]>(props.selectedTableSources);
    const [prevIndexFilters, setPrevIndexFilters] = React.useState<TIndexFilters>(props.selectedIndexFilters);

    if (!isEqual(props.selectedEnsembleIdents, prevEnsembleIdents)) {
        setEnsembleIdents(props.selectedEnsembleIdents);
        setPrevEnsembleIdents(props.selectedEnsembleIdents);
    }

    if (!isEqual(props.selectedTableSources, prevTableSources)) {
        setTableSources(props.selectedTableSources);
        setPrevTableSources(props.selectedTableSources);
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
            setEnsembleIdents(syncedFilter.ensembleIdents);
        }

        if (!isEqual(syncedFilter.tableSources, tableSources)) {
            setTableSources(syncedFilter.tableSources);
        }

        if (!isEqual(syncedFilter.indexFilters, indexFilters)) {
            setIndexFilters(syncedFilter.indexFilters as TIndexFilters);
        }
    }

    function handleEnsembleIdentsChange(newEnsembleIdents: EnsembleIdent[]): void {
        setEnsembleIdents(newEnsembleIdents);
        const filter = { ensembleIdents: newEnsembleIdents, tableSources, indexFilters };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    function handleTableSourcesChange(newTableSources: string[]): void {
        setTableSources(newTableSources);
        const filter = { ensembleIdents, tableSources: newTableSources, indexFilters };
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
        const filter = { ensembleIdents, tableSources, indexFilters: newIndexFilters };
        props.onChange(filter);
        syncHelper.publishValue(
            SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
            "global.syncValue.inplaceVolumetricsFilter",
            filter
        );
    }

    const tableSourcesOptions = props.availableTableSources.map((source) => ({ value: source, label: source }));

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
            <CollapsibleGroup title="Volumetric table sources" expanded>
                <Select
                    options={tableSourcesOptions}
                    value={tableSources}
                    onChange={handleTableSourcesChange}
                    multiple
                    size={3}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="Index filters" expanded>
                {Object.entries(props.availableIndexFilters).map(([index, values]) => (
                    <CollapsibleGroup key={index} title={index} expanded>
                        <Select
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
            </CollapsibleGroup>
        </>
    );
}

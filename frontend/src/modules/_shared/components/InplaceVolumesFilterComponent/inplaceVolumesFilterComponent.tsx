import React from "react";

import { cloneDeep, isEqual } from "lodash";

import type { InplaceVolumesFluid_api, InplaceVolumesIndex_api, InplaceVolumesIndexWithValues_api } from "@api";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { SettingsContext } from "@framework/ModuleContext";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { ErrorWrapper } from "@lib/components/ErrorWrapper";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";

export type InplaceVolumesFilterComponentProps = {
    ensembleSet: EnsembleSet;
    settingsContext: SettingsContext<any>;
    workbenchServices: WorkbenchServices;
    availableTableNames: string[];
    availableFluids: InplaceVolumesFluid_api[];
    availableIndicesWithValues: InplaceVolumesIndexWithValues_api[];
    selectedEnsembleIdents: RegularEnsembleIdent[];
    selectedTableNames: string[];
    selectedFluids: InplaceVolumesFluid_api[];
    selectedIndicesWithValues: InplaceVolumesIndexWithValues_api[];
    selectedAllowIndicesValuesIntersection: boolean;
    onChange: (filter: InplaceVolumesFilterSettings) => void;
    isPending?: boolean;
    errorMessage?: string;
    additionalSettings?: React.ReactNode;
    areCurrentlySelectedTablesComparable?: boolean;
    debounceMs?: number;
};

export function InplaceVolumesFilterComponent(props: InplaceVolumesFilterComponentProps): React.ReactNode {
    const [ensembleIdents, setEnsembleIdents] = React.useState<RegularEnsembleIdent[]>(props.selectedEnsembleIdents);
    const [tableNames, setTableNames] = React.useState<string[]>(props.selectedTableNames);
    const [fluids, setFluids] = React.useState<InplaceVolumesFluid_api[]>(props.selectedFluids);
    const [indicesWithValues, setIndicesWithValues] = React.useState<InplaceVolumesIndexWithValues_api[]>(
        props.selectedIndicesWithValues,
    );

    const [prevEnsembleIdents, setPrevEnsembleIdents] = React.useState<RegularEnsembleIdent[]>(
        props.selectedEnsembleIdents,
    );
    const [prevTableNames, setPrevTableNames] = React.useState<string[]>(props.selectedTableNames);
    const [prevFluids, setPrevFluids] = React.useState<string[]>(props.selectedFluids);
    const [prevIndicesWithValues, setPrevIndicesWithValues] = React.useState<InplaceVolumesIndexWithValues_api[]>(
        props.selectedIndicesWithValues,
    );
    const [prevSyncedFilter, setPrevSyncedFilter] = React.useState<InplaceVolumesFilterSettings | null>(null);

    const debounceTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    if (!isEqual(props.selectedEnsembleIdents, prevEnsembleIdents)) {
        setEnsembleIdents(props.selectedEnsembleIdents);
        setPrevEnsembleIdents(props.selectedEnsembleIdents);
    }

    if (!isEqual(props.selectedTableNames, prevTableNames)) {
        setTableNames(props.selectedTableNames);
        setPrevTableNames(props.selectedTableNames);
    }

    if (!isEqual(props.selectedFluids, prevFluids)) {
        setFluids(props.selectedFluids);
        setPrevFluids(props.selectedFluids);
    }

    if (!isEqual(props.selectedIndicesWithValues, prevIndicesWithValues)) {
        setIndicesWithValues((prev) => {
            const newIndexValues = [...prev];
            for (const [i, indexWithValues] of props.selectedIndicesWithValues.entries()) {
                if (
                    !isEqual(
                        prevIndicesWithValues.find((filter) => filter.indexColumn === indexWithValues.indexColumn)
                            ?.values,
                        indexWithValues.values,
                    )
                ) {
                    newIndexValues[i] = { ...indexWithValues };
                }
            }
            return newIndexValues;
        });
        setPrevIndicesWithValues(props.selectedIndicesWithValues);
    }

    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const syncedFilter = syncHelper.useValue(
        SyncSettingKey.INPLACE_VOLUMES_FILTER,
        "global.syncValue.inplaceVolumesFilterSettings",
    );

    if (!isEqual(syncedFilter, prevSyncedFilter)) {
        if (syncedFilter) {
            const filter = {
                ensembleIdents,
                tableNames,
                fluids,
                indicesWithValues,
                allowIndicesValuesIntersection: props.selectedAllowIndicesValuesIntersection,
            };

            if (!isEqual(syncedFilter.ensembleIdents, ensembleIdents)) {
                filter.ensembleIdents = [...syncedFilter.ensembleIdents];
            }

            if (!isEqual(syncedFilter.tableNames, tableNames)) {
                filter.tableNames = [...syncedFilter.tableNames];
            }

            if (!isEqual(syncedFilter.fluids, fluids)) {
                filter.fluids = [...syncedFilter.fluids];
            }

            if (syncedFilter.allowIndicesValuesIntersection !== props.selectedAllowIndicesValuesIntersection) {
                filter.allowIndicesValuesIntersection = props.selectedAllowIndicesValuesIntersection;
            }

            if (!isEqual(syncedFilter.indicesWithValues, indicesWithValues)) {
                const newIndicesValues = cloneDeep(indicesWithValues);

                for (const index of syncedFilter.indicesWithValues) {
                    const indexValues = newIndicesValues.find((filter) => filter.indexColumn === index.indexColumn);
                    if (!indexValues) {
                        newIndicesValues.push({ ...index });
                    } else {
                        indexValues.values = [...index.values];
                    }
                }
                setIndicesWithValues(newIndicesValues);
                filter.indicesWithValues = newIndicesValues;
            }

            props.onChange(filter);
        }

        setPrevSyncedFilter(syncedFilter);
    }

    React.useEffect(function mountEffect() {
        const currentDebounceTimeoutRef = debounceTimeoutRef.current;
        return function unmountEffect() {
            if (currentDebounceTimeoutRef) {
                clearTimeout(currentDebounceTimeoutRef);
            }
        };
    }, []);

    function callOnChangeAndMaybePublish(filter: InplaceVolumesFilterSettings, publish: boolean): void {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        props.onChange(filter);
        if (publish) {
            syncHelper.publishValue(
                SyncSettingKey.INPLACE_VOLUMES_FILTER,
                "global.syncValue.inplaceVolumesFilterSettings",
                filter,
            );
        }
    }

    function maybeDebounceOnChange(
        filter: InplaceVolumesFilterSettings,
        publish: boolean,
        dropDebounce?: boolean,
    ): void {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        if (!props.debounceMs || dropDebounce) {
            callOnChangeAndMaybePublish(filter, publish);
            return;
        }

        debounceTimeoutRef.current = setTimeout(() => {
            callOnChangeAndMaybePublish(filter, publish);
        }, props.debounceMs);
    }

    function handleEnsembleIdentsChange(newEnsembleIdents: RegularEnsembleIdent[], publish = true): void {
        setEnsembleIdents(newEnsembleIdents);
        const filter = {
            ensembleIdents: newEnsembleIdents,
            tableNames,
            fluids,
            indicesWithValues,
            allowIndicesValuesIntersection: props.selectedAllowIndicesValuesIntersection,
        };
        callOnChangeAndMaybePublish(filter, publish);
    }

    function handleTableNamesChange(newTableNames: string[], publish = true): void {
        setTableNames(newTableNames);
        const filter = {
            ensembleIdents,
            tableNames: newTableNames,
            fluids,
            indicesWithValues,
            allowIndicesValuesIntersection: props.selectedAllowIndicesValuesIntersection,
        };
        callOnChangeAndMaybePublish(filter, publish);
    }

    function handleFluidsChange(newFluids: InplaceVolumesFluid_api[], publish = true): void {
        setFluids(newFluids);
        const filter = {
            ensembleIdents,
            tableNames,
            fluids: newFluids,
            indicesWithValues,
            allowIndicesValuesIntersection: props.selectedAllowIndicesValuesIntersection,
        };
        maybeDebounceOnChange(filter, publish);
    }

    function handleAllowIndexValueIntersectionChange(checked: boolean): void {
        const filter = {
            ensembleIdents,
            tableNames,
            fluids,
            indicesWithValues,
            allowIndicesValuesIntersection: checked,
        };
        const doPublish = true;
        const dropDebounce = true;
        maybeDebounceOnChange(filter, doPublish, dropDebounce);
    }

    function handleIndexValuesChange(
        index: InplaceVolumesIndex_api,
        values: (string | number)[],
        publish = true,
    ): void {
        const newIndicesWithValues = cloneDeep(indicesWithValues);
        const indexValues = newIndicesWithValues.find((filter) => filter.indexColumn === index);
        if (!indexValues) {
            newIndicesWithValues.push({ indexColumn: index, values });
        } else {
            indexValues.values = [...values];
        }
        setIndicesWithValues(newIndicesWithValues);
        const filter = {
            ensembleIdents,
            tableNames,
            fluids,
            indicesWithValues: newIndicesWithValues,
            allowIndicesValuesIntersection: props.selectedAllowIndicesValuesIntersection,
        };
        maybeDebounceOnChange(filter, publish);
    }

    const tableSourceOptions = props.availableTableNames.map((source) => ({ value: source, label: source }));
    const fluidOptions = props.availableFluids.map((fluid) => ({ value: fluid, label: fluid }));

    return (
        <>
            <CollapsibleGroup title="Ensembles" expanded>
                <EnsembleSelect
                    ensembles={props.ensembleSet.getRegularEnsembleArray()}
                    value={ensembleIdents}
                    onChange={handleEnsembleIdentsChange}
                    size={5}
                />
            </CollapsibleGroup>
            <PendingWrapper isPending={props.isPending ?? false} errorMessage={props.errorMessage}>
                <div className="flex flex-col gap-2">{props.additionalSettings}</div>
                <div className="flex flex-col gap-2">
                    <CollapsibleGroup title="Inplace volumes table names" expanded>
                        <ErrorWrapper
                            isError={tableSourceOptions.length === 0 && !props.isPending}
                            message={"No table names"}
                        >
                            <Select
                                options={tableSourceOptions}
                                value={tableNames}
                                onChange={handleTableNamesChange}
                                multiple
                                size={3}
                            />
                        </ErrorWrapper>
                    </CollapsibleGroup>
                    <CollapsibleGroup title="Fluids" expanded>
                        <ErrorWrapper isError={fluidOptions.length === 0 && !props.isPending} message={"No fluids"}>
                            <Select
                                options={fluidOptions}
                                value={fluids}
                                onChange={handleFluidsChange}
                                multiple
                                size={3}
                            />
                        </ErrorWrapper>
                    </CollapsibleGroup>
                    <CollapsibleGroup title="Indices filters" expanded>
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <div className="grow">Allow intersection of values</div>
                                <Checkbox
                                    checked={props.selectedAllowIndicesValuesIntersection}
                                    onChange={(_, checked) => handleAllowIndexValueIntersectionChange(checked)}
                                />
                            </div>
                            <ErrorWrapper
                                isError={!props.areCurrentlySelectedTablesComparable}
                                message={"Selected tables are not comparable due to mismatching index columns"}
                            >
                                {props.availableIndicesWithValues.map((indexWithValues) => (
                                    <CollapsibleGroup
                                        key={indexWithValues.indexColumn}
                                        title={indexWithValues.indexColumn}
                                        expanded
                                    >
                                        <Select
                                            options={indexWithValues.values.map((value) => ({
                                                value: value,
                                                label: value.toString(),
                                            }))}
                                            value={
                                                indicesWithValues.find(
                                                    (el) => el.indexColumn === indexWithValues.indexColumn,
                                                )?.values ?? []
                                            }
                                            onChange={(value) =>
                                                handleIndexValuesChange(indexWithValues.indexColumn, value)
                                            }
                                            multiple
                                            size={Math.max(Math.min(indexWithValues.values.length, 10), 3)}
                                            showQuickSelectButtons={true}
                                        />
                                    </CollapsibleGroup>
                                ))}
                            </ErrorWrapper>
                        </div>
                    </CollapsibleGroup>
                </div>
            </PendingWrapper>
        </>
    );
}

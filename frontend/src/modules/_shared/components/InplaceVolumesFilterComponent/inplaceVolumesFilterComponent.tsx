import React from "react";

import { cloneDeep, isEqual } from "lodash-es";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { SettingsContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import type { SyncSettingsService } from "@framework/SyncSettingsService";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";
import { useEnsembleRealizationFilterFunc, type WorkbenchSession } from "@framework/WorkbenchSession";
import { Banner } from "@lib/components/Banner";
import { Select } from "@lib/components/Select";
import type { SettingAnnotation } from "@lib/components/Setting";
import { Setting } from "@lib/components/Setting";
import { SwitchCompositions } from "@lib/components/Switch/compositions";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import { filterAndOrderSelectedIndexValues } from "@modules/_shared/InplaceVolumes/indexWithValuesUtils";

export type InplaceVolumesFilterComponentProps = {
    ensembleSet: EnsembleSet;
    settingsContext: SettingsContext<any>;
    workbenchSession: WorkbenchSession;
    syncSettingsService: SyncSettingsService;
    availableTableNames: string[];
    availableIndicesWithValues: InplaceVolumesIndexWithValues_api[];
    selectedEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
    selectedTableNames: string[];
    selectedIndicesWithValues: InplaceVolumesIndexWithValues_api[];
    selectedAllowIndicesValuesIntersection: boolean;

    ensembleAnnotations?: SettingAnnotation[];
    tableNamesAnnotations?: SettingAnnotation[];
    selectionAnnotations?: SettingAnnotation[];
    debounceMs?: number;
    allowDeltaEnsembles?: boolean;
    isPending?: boolean;
    areCurrentlySelectedTablesComparable?: boolean;

    additionalSettings?: React.ReactNode;

    onChange: (filter: InplaceVolumesFilterSettings) => void;
};

export function InplaceVolumesFilterComponent(props: InplaceVolumesFilterComponentProps): React.ReactNode {
    const [ensembleIdents, setEnsembleIdents] = React.useState<(RegularEnsembleIdent | DeltaEnsembleIdent)[]>(
        props.selectedEnsembleIdents,
    );
    const [tableNames, setTableNames] = React.useState<string[]>(props.selectedTableNames);
    const [indicesWithValues, setIndicesWithValues] = React.useState<InplaceVolumesIndexWithValues_api[]>(
        props.selectedIndicesWithValues,
    );

    const [prevEnsembleIdents, setPrevEnsembleIdents] = React.useState<(RegularEnsembleIdent | DeltaEnsembleIdent)[]>(
        props.selectedEnsembleIdents,
    );
    const [prevTableNames, setPrevTableNames] = React.useState<string[]>(props.selectedTableNames);
    const [prevIndicesWithValues, setPrevIndicesWithValues] = React.useState<InplaceVolumesIndexWithValues_api[]>(
        props.selectedIndicesWithValues,
    );
    const [prevSyncedFilter, setPrevSyncedFilter] = React.useState<InplaceVolumesFilterSettings | null>(null);

    // const debounceTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    if (!isEqual(props.selectedEnsembleIdents, prevEnsembleIdents)) {
        setEnsembleIdents(props.selectedEnsembleIdents);
        setPrevEnsembleIdents(props.selectedEnsembleIdents);
    }

    if (!isEqual(props.selectedTableNames, prevTableNames)) {
        setTableNames(props.selectedTableNames);
        setPrevTableNames(props.selectedTableNames);
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

    const syncHelper = useRefStableSyncSettingsHelper({
        syncSettingsService: props.syncSettingsService,
        moduleContext: props.settingsContext,
    });

    const syncedFilter = syncHelper.useValue(
        SyncSettingKey.INPLACE_VOLUMES_FILTER,
        "global.syncValue.inplaceVolumesFilterSettings",
    );

    if (!isEqual(syncedFilter, prevSyncedFilter)) {
        if (syncedFilter) {
            const filter = {
                ensembleIdents,
                tableNames,
                indicesWithValues,
                allowIndicesValuesIntersection: props.selectedAllowIndicesValuesIntersection,
            };

            if (!isEqual(syncedFilter.ensembleIdents, ensembleIdents)) {
                filter.ensembleIdents = [...syncedFilter.ensembleIdents];
            }

            if (!isEqual(syncedFilter.tableNames, tableNames)) {
                filter.tableNames = [...syncedFilter.tableNames];
            }

            if (syncedFilter.allowIndicesValuesIntersection !== props.selectedAllowIndicesValuesIntersection) {
                filter.allowIndicesValuesIntersection = props.selectedAllowIndicesValuesIntersection;
            }

            if (!isEqual(syncedFilter.indicesWithValues, indicesWithValues)) {
                const newIndicesValues = cloneDeep(indicesWithValues);

                for (const index of syncedFilter.indicesWithValues) {
                    const availableIndex = props.availableIndicesWithValues.find(
                        (item) => item.indexColumn === index.indexColumn,
                    );
                    const orderedValues = availableIndex
                        ? filterAndOrderSelectedIndexValues(index.values, availableIndex.values)
                        : [...index.values];
                    const indexValues = newIndicesValues.find((filter) => filter.indexColumn === index.indexColumn);
                    if (!indexValues) {
                        newIndicesValues.push({ ...index, values: orderedValues });
                    } else {
                        indexValues.values = orderedValues;
                    }
                }
                setIndicesWithValues(newIndicesValues);
                filter.indicesWithValues = newIndicesValues;
            }

            props.onChange(filter);
        }

        setPrevSyncedFilter(syncedFilter);
    }

    function callOnChangeAndMaybePublish(filter: InplaceVolumesFilterSettings, publish: boolean): void {
        props.onChange(filter);
        if (publish) {
            syncHelper.publishValue(
                SyncSettingKey.INPLACE_VOLUMES_FILTER,
                "global.syncValue.inplaceVolumesFilterSettings",
                filter,
            );
        }
    }

    const debouncedOnChangeAndMaybePublish = useDebouncedFunction(callOnChangeAndMaybePublish, props.debounceMs ?? 0);

    function maybeDebounceOnChange(
        filter: InplaceVolumesFilterSettings,
        publish: boolean,
        dropDebounce?: boolean,
    ): void {
        if (dropDebounce) {
            debouncedOnChangeAndMaybePublish.cancel();
            callOnChangeAndMaybePublish(filter, publish);
        } else {
            debouncedOnChangeAndMaybePublish(filter, publish);
        }
    }

    function handleEnsembleIdentsChange(
        newEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
        publish = true,
    ): void {
        setEnsembleIdents(newEnsembleIdents);
        const filter = {
            ensembleIdents: newEnsembleIdents,
            tableNames,
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
            indicesWithValues,
            allowIndicesValuesIntersection: props.selectedAllowIndicesValuesIntersection,
        };
        callOnChangeAndMaybePublish(filter, publish);
    }

    function handleAllowIndexValueIntersectionChange(checked: boolean): void {
        const filter = {
            ensembleIdents,
            tableNames,
            indicesWithValues,
            allowIndicesValuesIntersection: checked,
        };
        const doPublish = true;
        const dropDebounce = true;
        maybeDebounceOnChange(filter, doPublish, dropDebounce);
    }

    function handleIndexValuesChange(indexColumn: string, values: string[], publish = true): void {
        const availableValues =
            props.availableIndicesWithValues.find((item) => item.indexColumn === indexColumn)?.values ?? [];
        const orderedValues = filterAndOrderSelectedIndexValues(values, availableValues);
        const newIndicesWithValues = cloneDeep(indicesWithValues);
        const indexValues = newIndicesWithValues.find((filter) => filter.indexColumn === indexColumn);
        if (!indexValues) {
            newIndicesWithValues.push({ indexColumn: indexColumn, values: orderedValues });
        } else {
            indexValues.values = orderedValues;
        }
        setIndicesWithValues(newIndicesWithValues);
        const filter = {
            ensembleIdents,
            tableNames,
            indicesWithValues: newIndicesWithValues,
            allowIndicesValuesIntersection: props.selectedAllowIndicesValuesIntersection,
        };
        maybeDebounceOnChange(filter, publish);
    }

    const tableSourceOptions = props.availableTableNames.map((source) => ({ value: source, label: source }));

    const ensembleRealizationFilterFunction = useEnsembleRealizationFilterFunc(props.workbenchSession);

    // Errors are shown on the index columns whose selection holds values that are no longer available, so that the
    // section header counts them. Other annotations (e.g. waiting for valid table sources) are shown for the section.
    const selectionErrorAnnotations =
        props.selectionAnnotations?.filter((annotation) => annotation.type === "error") ?? [];
    const otherSelectionAnnotations =
        props.selectionAnnotations?.filter((annotation) => annotation.type !== "error") ?? [];

    function hasUnavailableSelectedValues(availableIndexWithValues: InplaceVolumesIndexWithValues_api): boolean {
        const selectedValues =
            props.selectedIndicesWithValues.find((el) => el.indexColumn === availableIndexWithValues.indexColumn)
                ?.values ?? [];
        return selectedValues.some((value) => !availableIndexWithValues.values.includes(value));
    }

    return (
        <>
            <Setting.Section title="Data" defaultOpen>
                <Setting.Field label="Ensembles" annotations={props.ensembleAnnotations} stacked>
                    {props.allowDeltaEnsembles ? (
                        <EnsemblePicker
                            ensembles={props.ensembleSet.getEnsembleArray()}
                            value={ensembleIdents}
                            allowDeltaEnsembles={true}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                            onValueChange={handleEnsembleIdentsChange}
                        />
                    ) : (
                        <EnsemblePicker
                            ensembles={props.ensembleSet.getRegularEnsembleArray()}
                            value={filterEnsembleIdentsByType(ensembleIdents, RegularEnsembleIdent)}
                            allowDeltaEnsembles={false}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                            onValueChange={handleEnsembleIdentsChange}
                        />
                    )}
                </Setting.Field>

                <Setting.Field
                    stacked
                    loadingOverlay={props.isPending ?? false}
                    label="Table sources"
                    annotations={props.tableNamesAnnotations}
                    errorOverlay={
                        !props.isPending && tableSourceOptions.length === 0
                            ? "No table names. See logs for details."
                            : undefined
                    }
                >
                    <Select
                        options={tableSourceOptions}
                        value={tableNames}
                        onValueChange={handleTableNamesChange}
                        multiple
                        size={3}
                    />
                </Setting.Field>
                <Setting.Field
                    help={{
                        content: (
                            <>
                                Tables with the same filters may contain different values, such as different zone names.
                                Enable this setting to compare them using only the values available in every table.
                                Values not shared by all tables are omitted.
                                <br />
                                Filters that are not available in every selected table are always omitted.
                            </>
                        ),
                    }}
                >
                    <SwitchCompositions.WithLabel
                        checked={props.selectedAllowIndicesValuesIntersection}
                        onCheckedChange={handleAllowIndexValueIntersectionChange}
                    >
                        Compare using common filter values
                    </SwitchCompositions.WithLabel>
                </Setting.Field>
            </Setting.Section>

            <Setting.Section title="Data Selection">
                {/* Only judged for valid table sources - invalid ones or ones waiting for valid ensembles have no
                    filters to compare yet */}
                {!props.availableIndicesWithValues.length && !props.tableNamesAnnotations?.length && (
                    // TODO - Waiting for section overlay. Temp workaround
                    <Banner layoutClassName="col-span-3" tone="danger">
                        Selected tables are not comparable because they have no filters in common
                    </Banner>
                )}

                {otherSelectionAnnotations.map((annotation) => (
                    <Banner
                        key={annotation.message}
                        layoutClassName="col-span-3"
                        tone={
                            ({ info: "info", warning: "warning", error: "danger", invalid: "danger" } as const)[
                                annotation.type
                            ]
                        }
                    >
                        {annotation.message}
                    </Banner>
                ))}

                {props.availableIndicesWithValues.map((indexWithValues) => {
                    const options = indexWithValues.values.map((value) => ({
                        value: value,
                        label: value.toString(),
                    }));

                    // A column without an entry has never been filtered - all its values count as selected
                    const value =
                        indicesWithValues.find((el) => el.indexColumn === indexWithValues.indexColumn)?.values ??
                        indexWithValues.values;

                    return (
                        <Setting.Field
                            key={indexWithValues.indexColumn}
                            label={indexWithValues.indexColumn}
                            stacked
                            annotations={
                                hasUnavailableSelectedValues(indexWithValues) ? selectionErrorAnnotations : undefined
                            }
                            errorOverlay={
                                !props.areCurrentlySelectedTablesComparable
                                    ? "Selected tables are not comparable because their filter values differ"
                                    : undefined
                            }
                        >
                            <Select
                                options={options}
                                value={value}
                                multiple
                                size={Math.max(Math.min(indexWithValues.values.length, 10), 3)}
                                showQuickSelectButtons={true}
                                onValueChange={(value) => handleIndexValuesChange(indexWithValues.indexColumn, value)}
                            />
                        </Setting.Field>
                    );
                })}
            </Setting.Section>
            {props.additionalSettings}
        </>
    );
}

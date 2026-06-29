import React from "react";

import { cloneDeep, isEqual } from "lodash-es";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { SettingsContext } from "@framework/ModuleContext";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import { useEnsembleRealizationFilterFunc, type WorkbenchSession } from "@framework/WorkbenchSession";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import { Banner } from "@lib/components/Banner";
import { Select } from "@lib/components/Select";
import type { SettingAnnotation } from "@lib/components/SettingWrapper";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { SwitchCompositions } from "@lib/components/Switch/compositions";

export type InplaceVolumesFilterComponentProps = {
    ensembleSet: EnsembleSet;
    settingsContext: SettingsContext<any>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    availableTableNames: string[];
    availableIndicesWithValues: InplaceVolumesIndexWithValues_api[];
    selectedEnsembleIdents: RegularEnsembleIdent[];
    selectedTableNames: string[];
    selectedIndicesWithValues: InplaceVolumesIndexWithValues_api[];
    selectedAllowIndicesValuesIntersection: boolean;

    dataAnnotations?: SettingAnnotation[];
    selectionAnnotations?: SettingAnnotation[];
    debounceMs?: number;
    isPending?: boolean;
    areCurrentlySelectedTablesComparable?: boolean;

    additionalSettings?: React.ReactNode;

    onChange: (filter: InplaceVolumesFilterSettings) => void;
};

export function InplaceVolumesFilterComponent(props: InplaceVolumesFilterComponentProps): React.ReactNode {
    const [ensembleIdents, setEnsembleIdents] = React.useState<RegularEnsembleIdent[]>(props.selectedEnsembleIdents);
    const [tableNames, setTableNames] = React.useState<string[]>(props.selectedTableNames);
    const [indicesWithValues, setIndicesWithValues] = React.useState<InplaceVolumesIndexWithValues_api[]>(
        props.selectedIndicesWithValues,
    );

    const [prevEnsembleIdents, setPrevEnsembleIdents] = React.useState<RegularEnsembleIdent[]>(
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
        workbenchServices: props.workbenchServices,
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

    function handleEnsembleIdentsChange(newEnsembleIdents: RegularEnsembleIdent[], publish = true): void {
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
        const newIndicesWithValues = cloneDeep(indicesWithValues);
        const indexValues = newIndicesWithValues.find((filter) => filter.indexColumn === indexColumn);
        if (!indexValues) {
            newIndicesWithValues.push({ indexColumn: indexColumn, values });
        } else {
            indexValues.values = [...values];
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

    return (
        <>
            <SettingWrapper.Section title="Data" defaultOpen>
                <SettingWrapper label="Ensembles" stacked>
                    <EnsemblePicker
                        ensembles={props.ensembleSet.getRegularEnsembleArray()}
                        value={ensembleIdents}
                        allowDeltaEnsembles={false}
                        ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(props.workbenchSession)}
                        onValueChange={handleEnsembleIdentsChange}
                    />
                </SettingWrapper>

                <SettingWrapper
                    stacked
                    loadingOverlay={props.isPending ?? false}
                    label="Table sources"
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
                </SettingWrapper>
                <SettingWrapper
                    help={{
                        title: "Allow table source intersections",
                        content: (
                            <>
                                When active allows comparison of tables where available zones, regions, facies, fluids
                                or responses differs.
                                <br />
                                Only the <b>intersection</b> of options will then be available for filtering. <br />
                                Identifiers not present in all tables will be <b>filtered out</b>.
                            </>
                        ),
                    }}
                >
                    <SwitchCompositions.WithLabel
                        checked={props.selectedAllowIndicesValuesIntersection}
                        onCheckedChange={handleAllowIndexValueIntersectionChange}
                    >
                        Allow table source intersections
                    </SwitchCompositions.WithLabel>
                </SettingWrapper>
            </SettingWrapper.Section>

            <SettingWrapper.Section title="Data Selection">
                {!props.availableIndicesWithValues.length && (
                    // TODO - Waiting for section overlay. Temp workaround
                    <Banner layoutClassName="col-span-3" tone="danger">
                        Selected tables are not comparable due to mismatching index columns
                    </Banner>
                )}

                {props.selectionAnnotations?.map((annotation, index) => (
                    <Banner
                        layoutClassName="col-span-3"
                        key={index}
                        tone={({ info: "info", warning: "warning", error: "danger" } as const)[annotation.type]}
                    >
                        {annotation.message}
                    </Banner>
                ))}

                {props.availableIndicesWithValues.map((indexWithValues) => {
                    const options = indexWithValues.values.map((value) => ({
                        value: value,
                        label: value.toString(),
                    }));

                    const value =
                        indicesWithValues.find((el) => el.indexColumn === indexWithValues.indexColumn)?.values ?? [];

                    return (
                        <SettingWrapper
                            key={indexWithValues.indexColumn}
                            label={indexWithValues.indexColumn}
                            stacked
                            errorOverlay={
                                !props.areCurrentlySelectedTablesComparable
                                    ? "Selected tables are not comparable due to mismatching index columns"
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
                        </SettingWrapper>
                    );
                })}
            </SettingWrapper.Section>
            {props.additionalSettings}
        </>
    );
}

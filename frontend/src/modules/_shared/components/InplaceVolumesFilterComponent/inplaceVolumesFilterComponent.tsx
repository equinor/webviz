import React from "react";

import { cloneDeep, isEqual } from "lodash";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { SettingsContext } from "@framework/ModuleContext";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";
import {
    SettingAnnotationsWrapper,
    type SettingAnnotation,
} from "@lib/components/SettingAnnotationsWrapper/settingAnnotationsWrapper";
import type { RegularEnsemble } from "@framework/RegularEnsemble";

export type Setting<TAvailableValues, TSelectedValues = TAvailableValues> = {
    availableValues: TAvailableValues;
    selectedValues: TSelectedValues;
    annotations?: SettingAnnotation[];
};

export type InplaceVolumesFilterComponentProps = {
    ensembleSet: EnsembleSet;
    settingsContext: SettingsContext<any, any>;
    workbenchServices: WorkbenchServices;
    settings: {
        ensembleIdents: Setting<readonly RegularEnsemble[], RegularEnsembleIdent[]>;
        tableNames: Setting<string[]>;
        indicesWithValues: Setting<InplaceVolumesIndexWithValues_api[]>;
    };
    arePersistedIndicesWithValuesValid: boolean;
    selectedAllowIndicesValuesIntersection: boolean;
    onChange: (filter: InplaceVolumesFilterSettings) => void;
    isPending?: boolean;
    errorMessage?: string;
    additionalSettings?: React.ReactNode;
    areCurrentlySelectedTablesComparable?: boolean;
    debounceMs?: number;
};

export function InplaceVolumesFilterComponent(props: InplaceVolumesFilterComponentProps): React.ReactNode {
    const [ensembleIdents, setEnsembleIdents] = React.useState<RegularEnsembleIdent[]>(
        props.settings.ensembleIdents.selectedValues,
    );
    const [tableNames, setTableNames] = React.useState<string[]>(props.settings.tableNames.selectedValues);
    const [indicesWithValues, setIndicesWithValues] = React.useState<InplaceVolumesIndexWithValues_api[]>(
        props.settings.indicesWithValues.selectedValues,
    );

    const [prevEnsembleIdents, setPrevEnsembleIdents] = React.useState<RegularEnsembleIdent[]>(
        props.settings.ensembleIdents.selectedValues,
    );
    const [prevTableNames, setPrevTableNames] = React.useState<string[]>(props.settings.tableNames.selectedValues);
    const [prevIndicesWithValues, setPrevIndicesWithValues] = React.useState<InplaceVolumesIndexWithValues_api[]>(
        props.settings.indicesWithValues.selectedValues,
    );
    const [prevSyncedFilter, setPrevSyncedFilter] = React.useState<InplaceVolumesFilterSettings | null>(null);

    const debounceTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    if (!isEqual(props.settings.ensembleIdents.selectedValues, prevEnsembleIdents)) {
        setEnsembleIdents(props.settings.ensembleIdents.selectedValues);
        setPrevEnsembleIdents(props.settings.ensembleIdents.selectedValues);
    }

    if (!isEqual(props.settings.tableNames.selectedValues, prevTableNames)) {
        setTableNames(props.settings.tableNames.selectedValues);
        setPrevTableNames(props.settings.tableNames.selectedValues);
    }

    if (!isEqual(props.settings.indicesWithValues.selectedValues, prevIndicesWithValues)) {
        setIndicesWithValues((prev) => {
            const newIndexValues = [...prev];
            for (const [i, indexWithValues] of props.settings.indicesWithValues.selectedValues.entries()) {
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
        setPrevIndicesWithValues(props.settings.indicesWithValues.selectedValues);
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

    const tableSourceOptions = props.settings.tableNames.availableValues.map((source) => ({
        value: source,
        label: source,
    }));

    const tableNamesAnnotations: SettingAnnotation[] = [];
    if (tableSourceOptions.length === 0 && !props.isPending) {
        tableNamesAnnotations.push({
            type: "error",
            message: "No table names are available for the selected ensembles",
        });
    }
    if (props.settings.tableNames.annotations) {
        tableNamesAnnotations.push(...props.settings.tableNames.annotations);
    }

    return (
        <>
            <CollapsibleGroup title="Ensembles" expanded>
                <SettingAnnotationsWrapper annotations={props.settings.ensembleIdents.annotations}>
                    <EnsembleSelect
                        ensembles={props.ensembleSet.getRegularEnsembleArray()}
                        value={ensembleIdents}
                        onChange={handleEnsembleIdentsChange}
                        size={5}
                    />
                </SettingAnnotationsWrapper>
            </CollapsibleGroup>
            <PendingWrapper isPending={props.isPending ?? false} errorMessage={props.errorMessage}>
                <div className="flex flex-col gap-2">{props.additionalSettings}</div>
                <div className="flex flex-col gap-2">
                    <CollapsibleGroup title="Inplace volumes table names" expanded>
                        <SettingAnnotationsWrapper annotations={tableNamesAnnotations}>
                            <Select
                                options={tableSourceOptions}
                                value={tableNames}
                                onChange={handleTableNamesChange}
                                multiple
                                size={3}
                            />
                        </SettingAnnotationsWrapper>
                    </CollapsibleGroup>
                    <CollapsibleGroup title="Index filters" expanded>
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <div className="grow">Allow intersection of values</div>
                                <Checkbox
                                    checked={props.selectedAllowIndicesValuesIntersection}
                                    onChange={(_, checked) => handleAllowIndexValueIntersectionChange(checked)}
                                />
                            </div>
                            <SettingAnnotationsWrapper
                                annotations={[
                                    ...(!props.areCurrentlySelectedTablesComparable &&
                                    props.settings.indicesWithValues.availableValues.length > 0
                                        ? [
                                              {
                                                  type: "error",
                                                  message:
                                                      "Selected tables are not comparable due to mismatching index columns",
                                              } as SettingAnnotation,
                                          ]
                                        : []),
                                    ...(props.settings.indicesWithValues.availableValues.length === 0
                                        ? [
                                              {
                                                  type: "warning",
                                                  message: "No index filters available",
                                              } as SettingAnnotation,
                                          ]
                                        : []),
                                ]}
                            >
                                {props.settings.indicesWithValues.availableValues.map((indexWithValues) => (
                                    <CollapsibleGroup
                                        key={indexWithValues.indexColumn}
                                        title={indexWithValues.indexColumn}
                                        expanded
                                    >
                                        <SettingAnnotationsWrapper
                                            annotations={
                                                !areSelectedValuesContainedInAvailableValues(
                                                    indicesWithValues.find(
                                                        (el) => el.indexColumn === indexWithValues.indexColumn,
                                                    )?.values ?? [],
                                                    indexWithValues.values,
                                                ) && !props.arePersistedIndicesWithValuesValid
                                                    ? [
                                                          {
                                                              type: "error",
                                                              message:
                                                                  "Selected values are not contained in available values",
                                                          },
                                                      ]
                                                    : undefined
                                            }
                                        >
                                            <Select
                                                options={indexWithValues.values.toSorted().map((value) => ({
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
                                        </SettingAnnotationsWrapper>
                                    </CollapsibleGroup>
                                ))}
                            </SettingAnnotationsWrapper>
                        </div>
                    </CollapsibleGroup>
                </div>
            </PendingWrapper>
        </>
    );
}

function areSelectedValuesContainedInAvailableValues(
    selectedValues: (string | number)[],
    availableValues: (string | number)[],
): boolean {
    return selectedValues.every((value) => availableValues.includes(value));
}

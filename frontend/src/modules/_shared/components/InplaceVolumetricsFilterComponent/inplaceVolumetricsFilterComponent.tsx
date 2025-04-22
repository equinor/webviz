import React from "react";

import type { FluidZone_api, InplaceVolumetricsIdentifierWithValues_api, InplaceVolumetricsIdentifier_api } from "@api";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { SettingsContext } from "@framework/ModuleContext";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import type { InplaceVolumetricsFilterSettings } from "@framework/types/inplaceVolumetricsFilterSettings";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { ErrorWrapper } from "@lib/components/ErrorWrapper";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";

import { cloneDeep, isEqual } from "lodash";

export type InplaceVolumetricsFilterComponentProps = {
    ensembleSet: EnsembleSet;
    settingsContext: SettingsContext<any>;
    workbenchServices: WorkbenchServices;
    availableTableNames: string[];
    availableFluidZones: FluidZone_api[];
    availableIdentifiersWithValues: InplaceVolumetricsIdentifierWithValues_api[];
    selectedEnsembleIdents: RegularEnsembleIdent[];
    selectedTableNames: string[];
    selectedFluidZones: FluidZone_api[];
    selectedIdentifiersValues: InplaceVolumetricsIdentifierWithValues_api[];
    selectedAllowIdentifierValuesIntersection: boolean;
    onChange: (filter: InplaceVolumetricsFilterSettings) => void;
    isPending?: boolean;
    errorMessage?: string;
    additionalSettings?: React.ReactNode;
    areCurrentlySelectedTablesComparable?: boolean;
    debounceMs?: number;
};

export function InplaceVolumetricsFilterComponent(props: InplaceVolumetricsFilterComponentProps): React.ReactNode {
    const [ensembleIdents, setEnsembleIdents] = React.useState<RegularEnsembleIdent[]>(props.selectedEnsembleIdents);
    const [tableNames, setTableNames] = React.useState<string[]>(props.selectedTableNames);
    const [fluidZones, setFluidZones] = React.useState<FluidZone_api[]>(props.selectedFluidZones);
    const [identifiersValues, setIdentifiersValues] = React.useState<InplaceVolumetricsIdentifierWithValues_api[]>(
        props.selectedIdentifiersValues,
    );

    const [prevEnsembleIdents, setPrevEnsembleIdents] = React.useState<RegularEnsembleIdent[]>(
        props.selectedEnsembleIdents,
    );
    const [prevTableNames, setPrevTableNames] = React.useState<string[]>(props.selectedTableNames);
    const [prevFluidZones, setPrevFluidZones] = React.useState<string[]>(props.selectedFluidZones);
    const [prevIdentifiersValues, setPrevIdentifiersValues] = React.useState<
        InplaceVolumetricsIdentifierWithValues_api[]
    >(props.selectedIdentifiersValues);
    const [prevSyncedFilter, setPrevSyncedFilter] = React.useState<InplaceVolumetricsFilterSettings | null>(null);

    const debounceTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setIdentifiersValues((prev) => {
            const newIdentifiersValues = [...prev];
            for (const [index, identifier] of props.selectedIdentifiersValues.entries()) {
                if (
                    !isEqual(
                        prevIdentifiersValues.find((filter) => filter.identifier === identifier.identifier)?.values,
                        identifier.values,
                    )
                ) {
                    newIdentifiersValues[index] = { ...identifier };
                }
            }
            return newIdentifiersValues;
        });
        setPrevIdentifiersValues(props.selectedIdentifiersValues);
    }

    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const syncedFilter = syncHelper.useValue(
        SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
        "global.syncValue.inplaceVolumetricsFilterSettings",
    );

    if (!isEqual(syncedFilter, prevSyncedFilter)) {
        if (syncedFilter) {
            const filter = {
                ensembleIdents,
                tableNames,
                fluidZones,
                identifiersValues,
                allowIdentifierValuesIntersection: props.selectedAllowIdentifierValuesIntersection,
            };

            if (!isEqual(syncedFilter.ensembleIdents, ensembleIdents)) {
                filter.ensembleIdents = [...syncedFilter.ensembleIdents];
            }

            if (!isEqual(syncedFilter.tableNames, tableNames)) {
                filter.tableNames = [...syncedFilter.tableNames];
            }

            if (!isEqual(syncedFilter.fluidZones, fluidZones)) {
                filter.fluidZones = [...syncedFilter.fluidZones];
            }

            if (syncedFilter.allowIdentifierValuesIntersection !== props.selectedAllowIdentifierValuesIntersection) {
                filter.allowIdentifierValuesIntersection = props.selectedAllowIdentifierValuesIntersection;
            }

            if (!isEqual(syncedFilter.identifiersValues, identifiersValues)) {
                const newIdentifiersValues = cloneDeep(identifiersValues);

                for (const identifier of syncedFilter.identifiersValues) {
                    const identifierValues = newIdentifiersValues.find(
                        (filter) => filter.identifier === identifier.identifier,
                    );
                    if (!identifierValues) {
                        newIdentifiersValues.push({ ...identifier });
                    } else {
                        identifierValues.values = [...identifier.values];
                    }
                }
                setIdentifiersValues(newIdentifiersValues);
                filter.identifiersValues = newIdentifiersValues;
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

    function callOnChangeAndMaybePublish(filter: InplaceVolumetricsFilterSettings, publish: boolean): void {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        props.onChange(filter);
        if (publish) {
            syncHelper.publishValue(
                SyncSettingKey.INPLACE_VOLUMETRICS_FILTER,
                "global.syncValue.inplaceVolumetricsFilterSettings",
                filter,
            );
        }
    }

    function maybeDebounceOnChange(
        filter: InplaceVolumetricsFilterSettings,
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
            tableNames: tableNames,
            fluidZones,
            identifiersValues,
            allowIdentifierValuesIntersection: props.selectedAllowIdentifierValuesIntersection,
        };
        callOnChangeAndMaybePublish(filter, publish);
    }

    function handleTableNamesChange(newTableNames: string[], publish = true): void {
        setTableNames(newTableNames);
        const filter = {
            ensembleIdents,
            tableNames: newTableNames,
            fluidZones,
            identifiersValues,
            allowIdentifierValuesIntersection: props.selectedAllowIdentifierValuesIntersection,
        };
        callOnChangeAndMaybePublish(filter, publish);
    }

    function handleFluidZoneChange(newFluidZones: FluidZone_api[], publish = true): void {
        setFluidZones(newFluidZones);
        const filter = {
            ensembleIdents,
            tableNames: tableNames,
            fluidZones: newFluidZones,
            identifiersValues,
            allowIdentifierValuesIntersection: props.selectedAllowIdentifierValuesIntersection,
        };
        maybeDebounceOnChange(filter, publish);
    }

    function handleAllowIdentifierValueIntersectionChange(checked: boolean): void {
        const filter = {
            ensembleIdents,
            tableNames: tableNames,
            fluidZones,
            identifiersValues,
            allowIdentifierValuesIntersection: checked,
        };
        const doPublish = true;
        const dropDebounce = true;
        maybeDebounceOnChange(filter, doPublish, dropDebounce);
    }

    function handleIdentifierValuesChange(
        identifier: InplaceVolumetricsIdentifier_api,
        values: (string | number)[],
        publish = true,
    ): void {
        const newIdentifiersValues = cloneDeep(identifiersValues);
        const identifierValues = newIdentifiersValues.find((filter) => filter.identifier === identifier);
        if (!identifierValues) {
            newIdentifiersValues.push({ identifier: identifier, values });
        } else {
            identifierValues.values = [...values];
        }
        setIdentifiersValues(newIdentifiersValues);
        const filter = {
            ensembleIdents,
            tableNames: tableNames,
            fluidZones,
            identifiersValues: newIdentifiersValues,
            allowIdentifierValuesIntersection: props.selectedAllowIdentifierValuesIntersection,
        };
        maybeDebounceOnChange(filter, publish);
    }

    const tableSourceOptions = props.availableTableNames.map((source) => ({ value: source, label: source }));
    const fluidZoneOptions = props.availableFluidZones.map((zone) => ({ value: zone, label: zone }));

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
                    <CollapsibleGroup title="Volumetric table names" expanded>
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
                    <CollapsibleGroup title="Fluid zones" expanded>
                        <ErrorWrapper
                            isError={fluidZoneOptions.length === 0 && !props.isPending}
                            message={"No fluid zones"}
                        >
                            <Select
                                options={fluidZoneOptions}
                                value={fluidZones}
                                onChange={handleFluidZoneChange}
                                multiple
                                size={3}
                            />
                        </ErrorWrapper>
                    </CollapsibleGroup>
                    <CollapsibleGroup title="Identifier filters" expanded>
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <div className="grow">Allow intersection of values</div>
                                <Checkbox
                                    checked={props.selectedAllowIdentifierValuesIntersection}
                                    onChange={(_, checked) => handleAllowIdentifierValueIntersectionChange(checked)}
                                />
                            </div>
                            <ErrorWrapper
                                isError={!props.areCurrentlySelectedTablesComparable}
                                message={"Selected tables are not comparable due to mismatching identifier columns"}
                            >
                                {props.availableIdentifiersWithValues.map((identifier) => (
                                    <CollapsibleGroup
                                        key={identifier.identifier}
                                        title={identifier.identifier}
                                        expanded
                                    >
                                        <Select
                                            options={identifier.values.map((value) => ({
                                                value: value,
                                                label: value.toString(),
                                            }))}
                                            value={
                                                identifiersValues.find((el) => el.identifier === identifier.identifier)
                                                    ?.values ?? []
                                            }
                                            onChange={(value) =>
                                                handleIdentifierValuesChange(identifier.identifier, value)
                                            }
                                            multiple
                                            size={Math.max(Math.min(identifier.values.length, 10), 3)}
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

import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";
import { TagOption, TagPicker } from "@lib/components/TagPicker";
import {
    SourceAndTableIdentifierUnion,
    SourceIdentifier,
    TableType,
    TableTypeToStringMapping,
} from "@modules/_shared/InplaceVolumetrics/types";
import { InplaceVolumetricsFilterComponent } from "@modules/_shared/components/InplaceVolumetricsFilterComponent";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
    selectedTableTypeAtom,
    userSelectedAccumulationOptionsAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedFluidZonesAtom,
    userSelectedIdentifiersValuesAtom,
    userSelectedResultNamesAtom,
    userSelectedTableNamesAtom,
} from "./atoms/baseAtoms";
import {
    selectedAccumulationOptionsAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
    tableDefinitionsAccessorAtom,
} from "./atoms/derivedAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";

import { SettingsToViewInterface } from "../settingsToViewInterface";

export function Settings(props: ModuleSettingsProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const tableDefinitionsQueryResult = useAtomValue(tableDefinitionsQueryAtom);
    const tableDefinitionsAccessor = useAtomValue(tableDefinitionsAccessorAtom);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);

    const selectedTableNames = useAtomValue(selectedTableNamesAtom);
    const setSelectedTableNames = useSetAtom(userSelectedTableNamesAtom);

    const selectedFluidZones = useAtomValue(selectedFluidZonesAtom);
    const setSelectedFluidZones = useSetAtom(userSelectedFluidZonesAtom);

    const selectedIdentifiersValues = useAtomValue(selectedIdentifiersValuesAtom);
    const setSelectedIdentifiersValues = useSetAtom(userSelectedIdentifiersValuesAtom);

    const selectedResultNames = useAtomValue(selectedResultNamesAtom);
    const setSelectedResultNames = useSetAtom(userSelectedResultNamesAtom);

    const selectedAccumulationOptions = useAtomValue(selectedAccumulationOptionsAtom);
    const setSelectedAccumulationOptions = useSetAtom(userSelectedAccumulationOptionsAtom);

    const [selectedTableType, setSelectedTableType] = useAtom(selectedTableTypeAtom);

    function handleFilterChange(newFilter: InplaceVolumetricsFilter) {
        setSelectedEnsembleIdents(newFilter.ensembleIdents);
        setSelectedTableNames(newFilter.tableNames);
        setSelectedFluidZones(newFilter.fluidZones);
        setSelectedIdentifiersValues(newFilter.identifiersValues);
    }

    function handleAccumulationOptionsChange(
        newAccumulationOptions: Omit<
            SourceAndTableIdentifierUnion,
            SourceIdentifier.ENSEMBLE | SourceIdentifier.TABLE_NAME
        >[]
    ) {
        setSelectedAccumulationOptions(newAccumulationOptions);
    }

    function handleSelectedTableTypeChange(value: string) {
        setSelectedTableType(value as TableType);
    }

    const resultNameOptions = tableDefinitionsAccessor
        .getUniqueResultNames()
        .map((name) => ({ label: name, value: name }));

    const accumulateOptions: TagOption<
        Omit<SourceAndTableIdentifierUnion, SourceIdentifier.ENSEMBLE | SourceIdentifier.TABLE_NAME>
    >[] = [{ label: "FLUID ZONE", value: SourceIdentifier.FLUID_ZONE }];
    for (const identifier of tableDefinitionsAccessor.getUniqueIdentifierValues()) {
        accumulateOptions.push({ label: identifier.identifier, value: identifier.identifier });
    }

    return (
        <div className="flex flex-col gap-2">
            <PendingWrapper isPending={tableDefinitionsQueryResult.isLoading}>
                <CollapsibleGroup title="Result and grouping" expanded>
                    <div className="flex flex-col gap-2">
                        <Label text="Table type">
                            <Dropdown
                                value={selectedTableType}
                                options={Object.values(TableType).map((val: TableType) => {
                                    return { value: val, label: TableTypeToStringMapping[val] };
                                })}
                                onChange={handleSelectedTableTypeChange}
                            />
                        </Label>
                        <Label text="Result">
                            <Select
                                value={selectedResultNames}
                                options={resultNameOptions}
                                onChange={setSelectedResultNames}
                                multiple
                                size={5}
                            />
                        </Label>
                        <Label text="Group by">
                            <TagPicker
                                value={selectedAccumulationOptions}
                                tags={accumulateOptions}
                                onChange={handleAccumulationOptionsChange}
                            />
                        </Label>
                    </div>
                </CollapsibleGroup>
            </PendingWrapper>
            <InplaceVolumetricsFilterComponent
                ensembleSet={ensembleSet}
                settingsContext={props.settingsContext}
                workbenchServices={props.workbenchServices}
                isPending={tableDefinitionsQueryResult.isLoading}
                availableFluidZones={tableDefinitionsAccessor.getUniqueFluidZones()}
                availableTableNames={tableDefinitionsAccessor.getUniqueTableNames()}
                availableIdentifiersWithValues={tableDefinitionsAccessor.getUniqueIdentifierValues()}
                selectedEnsembleIdents={selectedEnsembleIdents}
                selectedFluidZones={selectedFluidZones}
                selectedIdentifiersValues={selectedIdentifiersValues}
                selectedTableNames={selectedTableNames}
                onChange={handleFilterChange}
            />
        </div>
    );
}

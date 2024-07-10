import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { InplaceVolumetricsFilterComponent } from "@modules/_shared/components/InplaceVolumetricsFilterComponent";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
    userSelectedEnsembleIdentsAtom,
    userSelectedFluidZonesAtom,
    userSelectedIdentifiersValuesAtom,
    userSelectedResultNameAtom,
    userSelectedSubplotByAtom,
    userSelectedTableNamesAtom,
} from "./atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNameAtom,
    selectedTableNamesAtom,
    tableDefinitionsAccessorAtom,
} from "./atoms/derivedAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { SubplotBy, SubplotByInfo } from "../typesAndEnums";

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

    const selectedResultName = useAtomValue(selectedResultNameAtom);
    const setSelectedResultName = useSetAtom(userSelectedResultNameAtom);

    const [selectedSubplotBy, setSelectedSubplotBy] = useAtom(userSelectedSubplotByAtom);

    function handleFilterChange(newFilter: InplaceVolumetricsFilter) {
        setSelectedEnsembleIdents(newFilter.ensembleIdents);
        setSelectedTableNames(newFilter.tableNames);
        setSelectedFluidZones(newFilter.fluidZones);
        setSelectedIdentifiersValues(newFilter.identifiersValues);
    }

    const resultNameOptions = tableDefinitionsAccessor
        .getUniqueResultNames()
        .map((name) => ({ label: name, value: name }));

    const subplotOptions: DropdownOption<SubplotByInfo>[] = [
        {
            value: {
                subplotBy: SubplotBy.SOURCE,
            },
            label: "Source",
        },
        {
            value: {
                subplotBy: SubplotBy.FLUID_ZONE,
            },
            label: "Fluid zone",
        },
    ];
    for (const identifier of tableDefinitionsAccessor.getUniqueIdentifierValues()) {
        subplotOptions.push({
            value: {
                subplotBy: SubplotBy.IDENTIFIER,
                identifier: identifier.identifier,
            },
            label: identifier.identifier,
        });
    }

    return (
        <div className="flex flex-col gap-2">
            <PendingWrapper isPending={tableDefinitionsQueryResult.isLoading}>
                <CollapsibleGroup title="Result and grouping" expanded>
                    <div className="flex flex-col gap-2">
                        <Label text="Result">
                            <Dropdown
                                value={selectedResultName ?? undefined}
                                options={resultNameOptions}
                                onChange={setSelectedResultName}
                            />
                        </Label>
                        <Label text="Subplot by">
                            <Dropdown
                                value={selectedSubplotBy ?? undefined}
                                options={subplotOptions}
                                onChange={setSelectedSubplotBy}
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

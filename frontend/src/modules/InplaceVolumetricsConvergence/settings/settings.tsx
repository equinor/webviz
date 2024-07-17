import React from "react";

import { InplaceVolumetricResultName_api } from "@api";
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
    userSelectedColorByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedFluidZonesAtom,
    userSelectedIdentifiersValuesAtom,
    userSelectedPlotTypeAtom,
    userSelectedResultNameAtom,
    userSelectedSubplotByAtom,
    userSelectedTableNamesAtom,
} from "./atoms/baseAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNameAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
    tableDefinitionsAccessorAtom,
} from "./atoms/derivedAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";
import { makeColorByOptions, makeSubplotByOptions } from "./utils/plotDimensionUtils";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { PlotType, plotTypeToStringMapping } from "../typesAndEnums";

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

    const selectedSubplotBy = useAtomValue(selectedSubplotByAtom);
    const setSelectedSubplotBy = useSetAtom(userSelectedSubplotByAtom);

    const selectedColorBy = useAtomValue(selectedColorByAtom);
    const setSelectedColorBy = useSetAtom(userSelectedColorByAtom);

    const [selectedPlotType, setSelectedPlotType] = useAtom(userSelectedPlotTypeAtom);

    function handleFilterChange(newFilter: InplaceVolumetricsFilter) {
        setSelectedEnsembleIdents(newFilter.ensembleIdents);
        setSelectedTableNames(newFilter.tableNames);
        setSelectedFluidZones(newFilter.fluidZones);
        setSelectedIdentifiersValues(newFilter.identifiersValues);
    }

    const resultNameOptions: DropdownOption<InplaceVolumetricResultName_api>[] = tableDefinitionsAccessor
        .getUniqueResultNames()
        .map((name) => ({ label: name, value: name }));

    const subplotOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames);
    const colorByOptions = makeColorByOptions(tableDefinitionsAccessor, selectedSubplotBy, selectedTableNames);
    const plotTypeOptions: DropdownOption<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }

    return (
        <div className="flex flex-col gap-2">
            <PendingWrapper isPending={tableDefinitionsQueryResult.isLoading}>
                <CollapsibleGroup title="Plot settings" expanded>
                    <div className="flex flex-col gap-2">
                        <Label text="Plot type">
                            <Dropdown
                                value={selectedPlotType}
                                options={plotTypeOptions}
                                onChange={setSelectedPlotType}
                            />
                        </Label>
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
                        <Label text="Color by">
                            <Dropdown
                                value={selectedColorBy ?? undefined}
                                options={colorByOptions}
                                onChange={setSelectedColorBy}
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

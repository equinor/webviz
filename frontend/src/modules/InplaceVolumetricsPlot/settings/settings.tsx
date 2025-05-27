import type React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import type { InplaceVolumetricResultName_api } from "@api";
import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import type { InplaceVolumetricsFilterSettings } from "@framework/types/inplaceVolumetricsFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { InplaceVolumetricsFilterComponent } from "@modules/_shared/components/InplaceVolumetricsFilterComponent";
import { IdentifierValueCriteria } from "@modules/_shared/InplaceVolumetrics/TableDefinitionsAccessor";
import { RealSelector, type SelectorColumn } from "@modules/_shared/InplaceVolumetrics/types";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumetrics/volumetricStringUtils";

import type { Interfaces } from "../interfaces";
import { PlotType, plotTypeToStringMapping } from "../typesAndEnums";

import {
    selectedIdentifierValueCriteriaAtom,
    userSelectedColorByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedFluidZonesAtom,
    userSelectedIdentifiersValuesAtom,
    userSelectedPlotTypeAtom,
    userSelectedResultName2Atom,
    userSelectedResultNameAtom,
    userSelectedSelectorColumnAtom,
    userSelectedSubplotByAtom,
    userSelectedTableNamesAtom,
} from "./atoms/baseAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultName2Atom,
    selectedResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
    tableDefinitionsAccessorAtom,
} from "./atoms/derivedAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";
import { makeColorByOptions, makeSubplotByOptions } from "./utils/plotDimensionUtils";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const tableDefinitionsQueryResult = useAtomValue(tableDefinitionsQueryAtom);
    const tableDefinitionsAccessor = useAtomValue(tableDefinitionsAccessorAtom);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);

    const selectedTableNames = useAtomValue(selectedTableNamesAtom);
    const setSelectedTableNames = useSetAtom(userSelectedTableNamesAtom);

    const selectedSelectorColumn = useAtomValue(selectedSelectorColumnAtom);
    const setSelectedSelectorColumn = useSetAtom(userSelectedSelectorColumnAtom);

    const selectedFluidZones = useAtomValue(selectedFluidZonesAtom);
    const setSelectedFluidZones = useSetAtom(userSelectedFluidZonesAtom);

    const selectedIdentifiersValues = useAtomValue(selectedIdentifiersValuesAtom);
    const setSelectedIdentifiersValues = useSetAtom(userSelectedIdentifiersValuesAtom);

    const selectedResultName = useAtomValue(selectedResultNameAtom);
    const setSelectedResultName = useSetAtom(userSelectedResultNameAtom);

    const selectedResultName2 = useAtomValue(selectedResultName2Atom);
    const setSelectedResultName2 = useSetAtom(userSelectedResultName2Atom);

    const selectedSubplotBy = useAtomValue(selectedSubplotByAtom);
    const setSelectedSubplotBy = useSetAtom(userSelectedSubplotByAtom);

    const selectedColorBy = useAtomValue(selectedColorByAtom);
    const setSelectedColorBy = useSetAtom(userSelectedColorByAtom);

    const [selectedPlotType, setSelectedPlotType] = useAtom(userSelectedPlotTypeAtom);
    const [selectedIdentifierValueCriteria, setSelectedIdentifierValueCriteria] = useAtom(
        selectedIdentifierValueCriteriaAtom,
    );

    useApplyInitialSettingsToState(
        props.initialSettings,
        "selectedIdentifierValueCriteria",
        "string",
        setSelectedIdentifierValueCriteria,
    );
    function handleFilterChange(newFilter: InplaceVolumetricsFilterSettings) {
        setSelectedEnsembleIdents(newFilter.ensembleIdents);
        setSelectedTableNames(newFilter.tableNames);
        setSelectedFluidZones(newFilter.fluidZones);
        setSelectedIdentifiersValues(newFilter.identifiersValues);
        setSelectedIdentifierValueCriteria(
            newFilter.allowIdentifierValuesIntersection
                ? IdentifierValueCriteria.ALLOW_INTERSECTION
                : IdentifierValueCriteria.REQUIRE_EQUALITY,
        );
    }

    const resultNameOptions: DropdownOption<InplaceVolumetricResultName_api>[] = tableDefinitionsAccessor
        .getResultNamesIntersection()
        .map((name) => ({ label: name, value: name, hoverText: createHoverTextForVolume(name) }));

    // Create selector options
    const commonIdentifiers = tableDefinitionsAccessor.getCommonIdentifiersWithValues().map((ident) => {
        return ident.identifier;
    });
    const selectorOptions: DropdownOption<SelectorColumn>[] = [
        { label: RealSelector.REAL, value: RealSelector.REAL },
        ...commonIdentifiers.map((name) => ({ label: name, value: name })),
    ];

    const subplotOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames);
    const colorByOptions = makeColorByOptions(tableDefinitionsAccessor, selectedSubplotBy, selectedTableNames);
    const plotTypeOptions: DropdownOption<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }

    const plotSettings = (
        <CollapsibleGroup title="Plot settings" expanded>
            <div className="flex flex-col gap-2">
                <Label text="Plot type">
                    <Dropdown value={selectedPlotType} options={plotTypeOptions} onChange={setSelectedPlotType} />
                </Label>
                <Label text="Result 1">
                    <Dropdown
                        value={selectedResultName ?? undefined}
                        options={resultNameOptions}
                        onChange={setSelectedResultName}
                    />
                </Label>
                {selectedPlotType !== PlotType.BAR ? (
                    <Label text="Result 2">
                        <Dropdown
                            value={selectedResultName2 ?? undefined}
                            options={resultNameOptions}
                            onChange={setSelectedResultName2}
                            disabled={selectedPlotType !== PlotType.SCATTER}
                        />
                    </Label>
                ) : (
                    <Label text="Selector">
                        <Dropdown
                            value={selectedSelectorColumn ?? undefined}
                            options={selectorOptions}
                            onChange={setSelectedSelectorColumn}
                            disabled={selectedPlotType !== PlotType.BAR}
                        />
                    </Label>
                )}
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
    );

    return (
        <InplaceVolumetricsFilterComponent
            ensembleSet={ensembleSet}
            settingsContext={props.settingsContext}
            workbenchServices={props.workbenchServices}
            isPending={tableDefinitionsQueryResult.isLoading}
            availableFluidZones={tableDefinitionsAccessor.getFluidZonesIntersection()}
            availableTableNames={tableDefinitionsAccessor.getTableNamesIntersection()}
            availableIdentifiersWithValues={tableDefinitionsAccessor.getCommonIdentifiersWithValues()}
            selectedEnsembleIdents={selectedEnsembleIdents}
            selectedFluidZones={selectedFluidZones}
            selectedIdentifiersValues={selectedIdentifiersValues}
            selectedTableNames={selectedTableNames}
            selectedAllowIdentifierValuesIntersection={
                selectedIdentifierValueCriteria === IdentifierValueCriteria.ALLOW_INTERSECTION
            }
            onChange={handleFilterChange}
            additionalSettings={plotSettings}
            areCurrentlySelectedTablesComparable={tableDefinitionsAccessor.getAreTablesComparable()}
            debounceMs={1500}
        />
    );
}

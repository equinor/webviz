import React from "react";

import { FluidZone_api, InplaceVolumetricsIndexNames_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";
import { FluidZoneTypeEnum } from "@modules/_shared/InplaceVolumetrics/types";
import { InplaceVolumetricsFilterComponent } from "@modules/_shared/components/InplaceVolumetricsFilterComponent";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { max } from "lodash";

import {
    colorByAtom,
    groupByAtom,
    plotTypeAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedInplaceFluidZonesAtom,
    userSelectedInplaceIndexesAtom,
    userSelectedInplaceResponseAtom,
    userSelectedInplaceTableNameAtom,
} from "./atoms/baseAtoms";
import {
    inplaceVolumetricsTableInfosAccessorAtom,
    selectedEnsembleIdentsAtom,
    selectedInplaceFluidZonesAtom,
    selectedInplaceIndexesAtom,
    selectedInplaceResponseAtom,
    selectedInplaceTableNameAtom,
} from "./atoms/derivedAtoms";
import { inplaceTableDefinitionsQueriesAtom } from "./atoms/queryAtoms";

import { Interface } from "../settingsToViewInterface";
import { State } from "../state";
import { PlotGroupingEnum, PlotTypeEnum } from "../typesAndEnums";

export function Settings(props: ModuleSettingsProps<State, Interface>) {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);

    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [groupBy, setGroupBy] = useAtom(groupByAtom);
    const [colorBy, setColorBy] = useAtom(colorByAtom);

    const inplaceTableInfosQuery = useAtomValue(inplaceTableDefinitionsQueriesAtom);
    const inplaceInfoAccessor = useAtomValue(inplaceVolumetricsTableInfosAccessorAtom);
    const availableInplaceTableNames = inplaceInfoAccessor.getTableNames();
    const availableFluidZones = inplaceInfoAccessor.getFluidZones();
    const availableInplaceResponses = inplaceInfoAccessor.getResponseNames();
    const availableInplaceIndexes = inplaceInfoAccessor.getIndexes();

    const setSelectedInplaceTableName = useSetAtom(userSelectedInplaceTableNameAtom);
    const selectedInplaceTableName = useAtomValue(selectedInplaceTableNameAtom);

    const setSelectedInplaceFluidZones = useSetAtom(userSelectedInplaceFluidZonesAtom);
    const selectedInplaceFluidZones = useAtomValue(selectedInplaceFluidZonesAtom);

    const setSelectedInplaceResponse = useSetAtom(userSelectedInplaceResponseAtom);
    const selectedInplaceResponse = useAtomValue(selectedInplaceResponseAtom);

    const setSelectedInplaceIndexes = useSetAtom(userSelectedInplaceIndexesAtom);
    const selectedInplaceIndexes = useAtomValue(selectedInplaceIndexesAtom);

    function handleEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }
    function onPlotTypeChange(plotTypeString: string) {
        setPlotType(plotTypeString as PlotTypeEnum);
    }
    function onGroupByChange(groupByString: string) {
        setGroupBy(groupByString as PlotGroupingEnum);
    }
    function onColorByChange(colorByString: string) {
        setColorBy(colorByString as PlotGroupingEnum);
    }
    function handleInplaceTableSelectionChange(name: string) {
        setSelectedInplaceTableName(name);
    }
    function handleInplaceFluidZonesSelectionChange(zones: string[]) {
        setSelectedInplaceFluidZones(zones as FluidZone_api[]);
    }
    function handleInplaceResponseChange(name: string) {
        setSelectedInplaceResponse(name);
    }

    function handleInplaceIndexesChange(categoryName: string, values: string[]) {
        const categoryIndex = selectedInplaceIndexes.findIndex((category) => category.index_name === categoryName);

        if (categoryIndex !== -1) {
            const newCategories = selectedInplaceIndexes.map((category, index) =>
                index === categoryIndex ? { ...category, values } : category
            );
            setSelectedInplaceIndexes(
                newCategories.map((category) => ({
                    index_name: category.index_name as InplaceVolumetricsIndexNames_api,
                    values: category.values,
                }))
            );
        } else {
            setSelectedInplaceIndexes([
                ...selectedInplaceIndexes.map((category) => ({
                    index_name: category.index_name as InplaceVolumetricsIndexNames_api,
                    values: category.values,
                })),
                { index_name: categoryName as InplaceVolumetricsIndexNames_api, values: values },
            ]);
        }
    }

    let tableInfosErrorMessage = "";
    if (inplaceTableInfosQuery.allQueriesFailed) {
        tableInfosErrorMessage =
            "Failed to fetch inplace volumetrics info. Make sure the selected ensembles has inplace volumetrics data.";
    }
    console.log("availableInplaceIndexes settings", availableInplaceIndexes);

    /*
    return (
        <div className="flex flex-col gap-2">
            <InplaceVolumetricsFilterComponent workbenchServices={props.workbenchServices} ensembleSet={ensembleSet} availableTableSources={availableInplaceTableNames} availableIndexFilters={{}} selectedEnsembleIdents={selectedEnsembleIdents} selectedTableSources={[]} selectedIndexFilters={{}} onChange={() => {}} />
            
            <CollapsibleGroup title="Ensembles" expanded>
                <EnsembleSelect
                    ensembleSet={ensembleSet}
                    onChange={handleEnsembleSelectionChange}
                    value={selectedEnsembleIdents}
                    size={5}
                    multiple={groupBy === PlotGroupingEnum.ENSEMBLE || colorBy === PlotGroupingEnum.ENSEMBLE}
                />
            </CollapsibleGroup>
            <PendingWrapper isPending={inplaceTableInfosQuery.isFetching} errorMessage={tableInfosErrorMessage}>
                <CollapsibleGroup title="Volumetric table source" expanded>
                    <Dropdown
                        options={availableInplaceTableNames.map((name) => ({ value: name, label: name }))}
                        value={selectedInplaceTableName || ""}
                        onChange={handleInplaceTableSelectionChange}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup title="Plotting" expanded>
                    <div className="flex gap-4">
                        <Label position="above" text="Plot type">
                            <Dropdown value={plotType} onChange={onPlotTypeChange} options={plotTypeToOptions()} />
                        </Label>
                    </div>
                    <div className="flex gap-4">
                        <Label position="above" text="Subplot category">
                            <Dropdown
                                value={groupBy}
                                onChange={onGroupByChange}
                                options={plotGroupingEnumToOptions()}
                            />
                        </Label>{" "}
                        <Label position="above" text="Color category">
                            <Dropdown
                                value={colorBy}
                                onChange={onColorByChange}
                                options={plotGroupingEnumToOptions()}
                            />
                        </Label>
                    </div>
                </CollapsibleGroup>
                <CollapsibleGroup title="Volumetric response" expanded>
                    <Dropdown
                        options={availableInplaceResponses.map((name) => ({ value: name, label: name }))}
                        value={selectedInplaceResponse || ""}
                        onChange={handleInplaceResponseChange}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup title="Fluid zones" expanded>
                    <Select
                        options={availableFluidZones.map((name) => ({ value: name, label: name }))}
                        value={selectedInplaceFluidZones || []}
                        onChange={handleInplaceFluidZonesSelectionChange}
                        size={3}
                        multiple
                    />
                </CollapsibleGroup>
                <CollapsibleGroup title="Index filters" expanded>
                    {availableInplaceIndexes.map((categoryData) => (
                        <CollapsibleGroup key={categoryData.index_name} title={categoryData.index_name}>
                            <Select
                                key={categoryData.index_name}
                                options={categoryValuesToOptions(categoryData.values)}
                                size={max([categoryData.values.length, 5])}
                                value={
                                    (selectedInplaceIndexes.find(
                                        (category) => category.index_name === categoryData.index_name
                                    )?.values as string[]) || []
                                }
                                onChange={(values) => handleInplaceIndexesChange(categoryData.index_name, values)}
                                multiple
                            />
                        </CollapsibleGroup>
                    ))}
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
    */

    function handleFilterChange(filter: InplaceVolumetricsFilter) {
        setSelectedEnsembleIdents(filter.ensembleIdents);
        setSelectedInplaceTableName(filter.tableSources[0]);
        setSelectedInplaceFluidZones(filter.fluidZones as FluidZone_api[]);
        setSelectedInplaceIndexes(
            Object.entries(filter.indexFilters).map(([index, values]) => ({
                index_name: index as InplaceVolumetricsIndexNames_api,
                values,
            }))
        );
    }

    const selectedIndexFilters: Record<string, string[]> = {};
    for (const inplaceIndex of selectedInplaceIndexes) {
        selectedIndexFilters[inplaceIndex.index_name] = inplaceIndex.values.map((el) => el.toString());
    }

    const availableIndexFilters: Record<string, string[]> = {};
    for (const inplaceIndex of availableInplaceIndexes) {
        availableIndexFilters[inplaceIndex.index_name] = inplaceIndex.values.map((el) => el.toString());
    }

    return (
        <div className="flex flex-col gap-2">
            <InplaceVolumetricsFilterComponent
                workbenchServices={props.workbenchServices}
                settingsContext={props.settingsContext}
                ensembleSet={ensembleSet}
                availableTableSources={availableInplaceTableNames}
                availableFluidZones={availableFluidZones}
                availableIndexFilters={availableIndexFilters}
                selectedEnsembleIdents={selectedEnsembleIdents}
                selectedTableSources={selectedInplaceTableName ? [selectedInplaceTableName] : []}
                selectedFluidZones={selectedInplaceFluidZones}
                selectedIndexFilters={selectedIndexFilters}
                onChange={handleFilterChange}
                isPending={inplaceTableInfosQuery.isFetching}
                errorMessage={tableInfosErrorMessage}
            />
            <PendingWrapper isPending={inplaceTableInfosQuery.isFetching} errorMessage={tableInfosErrorMessage}>
                <div className="flex flex-col gap-2">
                    <CollapsibleGroup title="Plotting" expanded>
                        <div className="flex gap-4">
                            <Label position="above" text="Plot type">
                                <Dropdown value={plotType} onChange={onPlotTypeChange} options={plotTypeToOptions()} />
                            </Label>
                        </div>
                        <div className="flex gap-4">
                            <Label position="above" text="Subplot category">
                                <Dropdown
                                    value={groupBy}
                                    onChange={onGroupByChange}
                                    options={plotGroupingEnumToOptions()}
                                />
                            </Label>{" "}
                            <Label position="above" text="Color category">
                                <Dropdown
                                    value={colorBy}
                                    onChange={onColorByChange}
                                    options={plotGroupingEnumToOptions()}
                                />
                            </Label>
                        </div>
                    </CollapsibleGroup>
                </div>
                <CollapsibleGroup title="Volumetric response" expanded>
                    <Dropdown
                        options={availableInplaceResponses.map((name) => ({ value: name, label: name }))}
                        value={selectedInplaceResponse || ""}
                        onChange={handleInplaceResponseChange}
                    />
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
}
function plotGroupingEnumToOptions(): DropdownOption[] {
    return Object.values(PlotGroupingEnum).map((value) => ({ value, label: value }));
}

function plotTypeToOptions(): DropdownOption[] {
    return Object.values(PlotTypeEnum).map((value) => ({ value, label: value }));
}

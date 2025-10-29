import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dialog } from "@lib/components/Dialog";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { SettingConfigButton } from "@lib/components/SettingConfigButton";
import { InplaceVolumesFilterComponent } from "@modules/_shared/components/InplaceVolumesFilterComponent";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";
import { selectedResultNamesAtom } from "@modules/InplaceVolumesTable/settings/atoms/derivedAtoms";

import type { Interfaces } from "../interfaces";
import { PlotType, plotTypeToStringMapping } from "../typesAndEnums";

import {
    selectedIndexValueCriteriaAtom,
    userSelectedColorByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedIndicesWithValuesAtom,
    userSelectedPlotTypeAtom,
    userSelectedSecondResultNameAtom,
    userSelectedFirstResultNameAtom,
    userSelectedSelectorColumnAtom,
    userSelectedSubplotByAtom,
    userSelectedTableNamesAtom,
    plotOptionsAtom,
    showTableAtBottomAtom,
} from "./atoms/baseAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedSecondResultNameAtom,
    selectedFirstResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
    tableDefinitionsAccessorAtom,
} from "./atoms/derivedAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";
import {
    InplaceVolumesPlotOptionsDialog,
    InplaceVolumesPlotOptionsDialogPreview,
} from "./components/inplaceVolumesPlotOptionsDialog";
import { makeBarGroupingOptions, makeColorByOptions, makeSubplotByOptions } from "./utils/plotDimensionUtils";

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

    const selectedIndicesWithValues = useAtomValue(selectedIndicesWithValuesAtom);
    const setSelectedIndicesWithValues = useSetAtom(userSelectedIndicesWithValuesAtom);

    const selectedFirstResultName = useAtomValue(selectedFirstResultNameAtom);
    const setSelectedFirstResultName = useSetAtom(userSelectedFirstResultNameAtom);

    const selectedSecondResultName = useAtomValue(selectedSecondResultNameAtom);
    const setSelectedSecondResultName = useSetAtom(userSelectedSecondResultNameAtom);

    const selectedSubplotBy = useAtomValue(selectedSubplotByAtom);
    const setSelectedSubplotBy = useSetAtom(userSelectedSubplotByAtom);

    const selectedColorBy = useAtomValue(selectedColorByAtom);
    const setSelectedColorBy = useSetAtom(userSelectedColorByAtom);

    const [selectedPlotType, setSelectedPlotType] = useAtom(userSelectedPlotTypeAtom);
    const [selectedIndexValueCriteria, setSelectedIndexValueCriteria] = useAtom(selectedIndexValueCriteriaAtom);

    const [showTableAtBottom, setShowTableAtBottom] = useAtom(showTableAtBottomAtom);
    const [plotOptions, setPlotOptions] = useAtom(plotOptionsAtom);

    const [dialogOpen, setDialogOpen] = React.useState(false);
    const dialogButtonRef = React.useRef<HTMLDivElement | null>(null);

    useApplyInitialSettingsToState(
        props.initialSettings,
        "selectedIndexValueCriteria",
        "string",
        setSelectedIndexValueCriteria,
    );
    function handleFilterChange(newFilter: InplaceVolumesFilterSettings) {
        setSelectedEnsembleIdents(newFilter.ensembleIdents);
        setSelectedTableNames(newFilter.tableNames);
        setSelectedIndicesWithValues(newFilter.indicesWithValues);
        setSelectedIndexValueCriteria(
            newFilter.allowIndicesValuesIntersection
                ? IndexValueCriteria.ALLOW_INTERSECTION
                : IndexValueCriteria.REQUIRE_EQUALITY,
        );
    }

    const resultNameOptions: DropdownOption<string>[] = tableDefinitionsAccessor
        .getResultNamesIntersection()
        .map((name) => ({ label: name, value: name, hoverText: createHoverTextForVolume(name) }));

    // Create selector options
    const selectorOptions = makeBarGroupingOptions(tableDefinitionsAccessor);

    const subplotOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames);
    const colorByOptions = makeColorByOptions(tableDefinitionsAccessor, selectedSubplotBy, selectedTableNames);
    const plotTypeOptions: DropdownOption<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }

    const plotSettings = (
        <>
            <CollapsibleGroup title="Plot settings & data selection" expanded>
                <div className="flex">
                    <div className="flex gap-3 pb-3 items-end w-full">
                        <Label wrapperClassName="grow" text="Plot type">
                            <Dropdown
                                value={selectedPlotType}
                                options={plotTypeOptions}
                                onChange={setSelectedPlotType}
                            />
                        </Label>
                        <SettingConfigButton
                            size="medium"
                            formTitle="Plot settings"
                            title="Configure visualization"
                            formContent={
                                <InplaceVolumesPlotOptionsDialog
                                    options={plotOptions}
                                    onPlotTypeChange={setSelectedPlotType}
                                    plotType={selectedPlotType}
                                    onOptionsChange={setPlotOptions}
                                />
                            }
                        ></SettingConfigButton>
                    </div>
                </div>
                <div>
                    <Label text="Response">
                        <Dropdown
                            value={selectedFirstResultName ?? undefined}
                            options={resultNameOptions}
                            onChange={setSelectedFirstResultName}
                        />
                    </Label>
                    {selectedSecondResultName !== undefined && (
                        <Label text="Second Response(Cross Plot)">
                            <Dropdown
                                value={selectedSecondResultName ?? undefined}
                                options={resultNameOptions}
                                onChange={setSelectedSecondResultName}
                                disabled={selectedPlotType !== PlotType.SCATTER}
                            />
                        </Label>
                    )}
                    {selectedSelectorColumn !== undefined && (
                        <Label text="Category for each bar">
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
                    <Label wrapperClassName="mt-2" position="left" text="Show table at bottom">
                        <Checkbox
                            checked={showTableAtBottom}
                            onChange={(e) => setShowTableAtBottom(e.target.checked)}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>{" "}
        </>
    );

    return (
        <InplaceVolumesFilterComponent
            ensembleSet={ensembleSet}
            settingsContext={props.settingsContext}
            workbenchSession={props.workbenchSession}
            workbenchServices={props.workbenchServices}
            isPending={tableDefinitionsQueryResult.isLoading}
            availableTableNames={tableDefinitionsAccessor.getTableNamesIntersection()}
            availableIndicesWithValues={tableDefinitionsAccessor.getCommonIndicesWithValues()}
            selectedEnsembleIdents={selectedEnsembleIdents}
            selectedIndicesWithValues={selectedIndicesWithValues}
            selectedTableNames={selectedTableNames}
            selectedAllowIndicesValuesIntersection={
                selectedIndexValueCriteria === IndexValueCriteria.ALLOW_INTERSECTION
            }
            onChange={handleFilterChange}
            additionalSettings={plotSettings}
            areCurrentlySelectedTablesComparable={tableDefinitionsAccessor.getAreTablesComparable()}
            debounceMs={1500}
        />
    );
}

import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { SettingConfigButton } from "@lib/components/SettingConfigButton";
import { InplaceVolumesFilterComponent } from "@modules/_shared/components/InplaceVolumesFilterComponent";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";

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
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

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
                <div className="flex flex-col gap-2">
                    <SettingConfigButton
                        className="w-full"
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
                    >
                        <InplaceVolumesPlotOptionsDialogPreview value={selectedPlotType} />
                    </SettingConfigButton>
                    <Button ref={dialogButtonRef} onClick={() => setDialogOpen(!dialogOpen)}>
                        Open Dialog
                    </Button>
                    <Dialog
                        open={dialogOpen}
                        width={300}
                        height={400}
                        onClose={() => setDialogOpen(false)}
                        anchorEl={dialogButtonRef}
                        isDraggable
                        keepMounted
                        title="Test Dialog"
                        showCloseCross
                    >
                        Test
                    </Dialog>
                    <Label text="Response">
                        <Dropdown
                            value={selectedFirstResultName ?? undefined}
                            options={resultNameOptions}
                            onChange={setSelectedFirstResultName}
                        />
                    </Label>
                    {selectedPlotType !== PlotType.BAR ? (
                        <Label text="Second Response(Cross Plot)">
                            <Dropdown
                                value={selectedSecondResultName ?? undefined}
                                options={resultNameOptions}
                                onChange={setSelectedSecondResultName}
                                disabled={selectedPlotType !== PlotType.SCATTER}
                            />
                        </Label>
                    ) : (
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

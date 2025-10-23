import React from "react";

import { Tune } from "@mui/icons-material";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { TagPicker } from "@lib/components/TagPicker";
import { InplaceVolumesFilterComponent } from "@modules/_shared/components/InplaceVolumesFilterComponent";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";

import type { Interfaces } from "../interfaces";
import { PlotType, plotTypeToStringMapping } from "../typesAndEnums";

import {
    plotOptionsAtom,
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
    hasSensitivitiesAtom,
} from "./atoms/derivedAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";
import { InplaceVolumesPlotOptionsDialog } from "./components/inplaceVolumesPlotOptionsDialog";
import { makeColorByOptions, makeSubplotByOptions } from "./utils/plotDimensionUtils";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const tableDefinitionsQueryResult = useAtomValue(tableDefinitionsQueryAtom);
    const tableDefinitionsAccessor = useAtomValue(tableDefinitionsAccessorAtom);
    const hasSensitivities = useAtomValue(hasSensitivitiesAtom);

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
    const selectorOptions: DropdownOption<string>[] = [
        ...tableDefinitionsAccessor.getCommonSelectorColumns().map((name) => ({ label: name, value: name })),
    ];

    const subplotOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames);
    const colorByOptions = makeColorByOptions(tableDefinitionsAccessor, selectedSubplotBy, selectedTableNames);
    const plotTypeOptions: DropdownOption<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }
    const [isPlotSettingsDialogOpen, setIsPlotSettingsDialogOpen] = React.useState(false);
    const settingsButtonRef = React.useRef<HTMLButtonElement>(null);
    const handlePlotOptionsClick = React.useCallback(() => {
        setIsPlotSettingsDialogOpen(true);
    }, []);
    const plotSettings = (
        <>
            <CollapsibleGroup title="Plot settings" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Plot type">
                        <div className="flex">
                            <div className="flex-1  mr-2">
                                <Dropdown
                                    value={selectedPlotType}
                                    options={plotTypeOptions}
                                    onChange={setSelectedPlotType}
                                />
                            </div>
                            <IconButton
                                ref={settingsButtonRef}
                                color="primary"
                                size="medium"
                                onClick={handlePlotOptionsClick}
                            >
                                <Tune fontSize="medium" />
                            </IconButton>
                        </div>
                    </Label>

                    <Label text={selectedPlotType === PlotType.BAR ? "Response" : "X Response"}>
                        <Dropdown
                            value={selectedFirstResultName ?? undefined}
                            options={resultNameOptions}
                            onChange={setSelectedFirstResultName}
                        />
                    </Label>
                    {selectedPlotType !== PlotType.BAR ? (
                        <Label text="Y Response">
                            <Dropdown
                                value={selectedSecondResultName ?? undefined}
                                options={resultNameOptions}
                                onChange={setSelectedSecondResultName}
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
                        <TagPicker
                            selection={selectedSubplotBy ?? []}
                            tagOptions={subplotOptions}
                            onChange={setSelectedSubplotBy}
                        />
                    </Label>
                    <Label text="Color by">
                        <Dropdown
                            value={selectedColorBy ?? undefined}
                            options={colorByOptions}
                            onChange={setSelectedColorBy}
                            placeholder="Color by ensemble by default"
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <InplaceVolumesPlotOptionsDialog
                isOpen={isPlotSettingsDialogOpen}
                onClose={() => setIsPlotSettingsDialogOpen(false)}
                anchorElement={settingsButtonRef.current}
                options={plotOptions}
                onChange={setPlotOptions}
            />
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

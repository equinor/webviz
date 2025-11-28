import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { InplaceVolumesFilterComponent } from "@modules/_shared/components/InplaceVolumesFilterComponent";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";

import type { Interfaces } from "../interfaces";
import { PlotType, plotTypeToStringMapping } from "../typesAndEnums";

import { selectedIndexValueCriteriaAtom, selectedPlotTypeAtom } from "./atoms/baseAtoms";
import { tableDefinitionsAccessorAtom } from "./atoms/derivedAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedSecondResultNameAtom,
    selectedFirstResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./atoms/persistableFixableAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";
import { makeColorByOptions, makeSubplotByOptions } from "./utils/plotDimensionUtils";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const tableDefinitionsQueryResult = useAtomValue(tableDefinitionsQueryAtom);
    const tableDefinitionsAccessor = useAtomValue(tableDefinitionsAccessorAtom);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);

    const [selectedTableNames, setSelectedTableNames] = useAtom(selectedTableNamesAtom);

    const [selectedSelectorColumn, setSelectedSelectorColumn] = useAtom(selectedSelectorColumnAtom);

    const [selectedIndicesWithValues, setSelectedIndicesWithValues] = useAtom(selectedIndicesWithValuesAtom);

    const [selectedFirstResultName, setSelectedFirstResultName] = useAtom(selectedFirstResultNameAtom);
    const [selectedSecondResultName, setSelectedSecondResultName] = useAtom(selectedSecondResultNameAtom);

    const [selectedSubplotBy, setSelectedSubplotBy] = useAtom(selectedSubplotByAtom);

    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);

    const [selectedPlotType, setSelectedPlotType] = useAtom(selectedPlotTypeAtom);
    const [selectedIndexValueCriteria, setSelectedIndexValueCriteria] = useAtom(selectedIndexValueCriteriaAtom);

    usePropagateAllApiErrorsToStatusWriter(tableDefinitionsQueryResult.errors, statusWriter);

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

    const subplotOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames.value);
    const colorByOptions = makeColorByOptions(
        tableDefinitionsAccessor,
        selectedSubplotBy.value,
        selectedTableNames.value,
    );
    const plotTypeOptions: DropdownOption<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }

    const selectedFirstResultNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedFirstResultNameAtom);
    const selectedSecondResultNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedSecondResultNameAtom);
    const selectedSelectorColumnAnnotations = useMakePersistableFixableAtomAnnotations(selectedSelectorColumnAtom);
    const selectedSubplotByAnnotations = useMakePersistableFixableAtomAnnotations(selectedSubplotByAtom);
    const selectedColorByAnnotations = useMakePersistableFixableAtomAnnotations(selectedColorByAtom);

    const plotSettings = (
        <CollapsibleGroup title="Plot settings" expanded>
            <div className="flex flex-col gap-2">
                <Label text="Plot type">
                    <Dropdown value={selectedPlotType} options={plotTypeOptions} onChange={setSelectedPlotType} />
                </Label>
                <SettingWrapper label="First Result" annotations={selectedFirstResultNameAnnotations}>
                    <Dropdown
                        value={selectedFirstResultName.value}
                        options={resultNameOptions}
                        onChange={setSelectedFirstResultName}
                    />
                </SettingWrapper>
                {selectedPlotType !== PlotType.BAR ? (
                    <SettingWrapper
                        label={`Second Result ${selectedPlotType !== PlotType.SCATTER ? "(only for scatter plot)" : ""}`}
                        annotations={selectedSecondResultNameAnnotations}
                    >
                        <Dropdown
                            value={selectedSecondResultName.value}
                            options={resultNameOptions}
                            onChange={setSelectedSecondResultName}
                            disabled={selectedPlotType !== PlotType.SCATTER}
                        />
                    </SettingWrapper>
                ) : (
                    <SettingWrapper label="Selector" annotations={selectedSelectorColumnAnnotations}>
                        <Dropdown
                            value={selectedSelectorColumn.value}
                            options={selectorOptions}
                            onChange={setSelectedSelectorColumn}
                            disabled={selectedPlotType !== PlotType.BAR}
                        />
                    </SettingWrapper>
                )}
                <SettingWrapper label="Subplot by" annotations={selectedSubplotByAnnotations}>
                    <Dropdown
                        value={selectedSubplotBy.value}
                        options={subplotOptions}
                        onChange={setSelectedSubplotBy}
                    />
                </SettingWrapper>
                <SettingWrapper label="Color by" annotations={selectedColorByAnnotations}>
                    <Dropdown value={selectedColorBy.value} options={colorByOptions} onChange={setSelectedColorBy} />
                </SettingWrapper>
            </div>
        </CollapsibleGroup>
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
            selectedEnsembleIdents={selectedEnsembleIdents.value}
            selectedIndicesWithValues={selectedIndicesWithValues.value}
            selectedTableNames={selectedTableNames.value}
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

import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { Combobox } from "@lib/newComponents/Combobox";
import type { ComboboxItem } from "@lib/newComponents/Combobox/types";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
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

const DEBOUNCE_TIME_MS = 1500;

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

    const resultNameOptions: ComboboxItem<string>[] = tableDefinitionsAccessor
        .getResultNamesIntersection()
        .map((name) => ({ label: name, value: name, hoverText: createHoverTextForVolume(name) }));

    // Create selector options
    const selectorOptions: ComboboxItem<string>[] = [
        ...tableDefinitionsAccessor.getCommonSelectorColumns().map((name) => ({ label: name, value: name })),
    ];

    const subplotOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames.value);
    const colorByOptions = makeColorByOptions(
        tableDefinitionsAccessor,
        selectedSubplotBy.value,
        selectedTableNames.value,
    );
    const plotTypeOptions: ComboboxItem<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }

    const selectedFirstResultNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedFirstResultNameAtom);
    const selectedSecondResultNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedSecondResultNameAtom);
    const selectedSelectorColumnAnnotations = useMakePersistableFixableAtomAnnotations(selectedSelectorColumnAtom);
    const selectedSubplotByAnnotations = useMakePersistableFixableAtomAnnotations(selectedSubplotByAtom);
    const selectedColorByAnnotations = useMakePersistableFixableAtomAnnotations(selectedColorByAtom);

    const plotSettings = (
        <SettingWrapper.Section title="Plot settings" defaultOpen>
            <SettingWrapper label="Plot type">
                <Combobox
                    value={selectedPlotType}
                    items={plotTypeOptions}
                    onValueChange={(v) => v && setSelectedPlotType(v)}
                />
            </SettingWrapper>
            <SettingWrapper label="First Result" annotations={selectedFirstResultNameAnnotations}>
                <Combobox
                    value={selectedFirstResultName.value}
                    items={resultNameOptions}
                    onValueChange={setSelectedFirstResultName}
                />
            </SettingWrapper>

            {selectedPlotType === PlotType.BAR && (
                <SettingWrapper label="Selector" annotations={selectedSelectorColumnAnnotations}>
                    <Combobox
                        value={selectedSelectorColumn.value}
                        items={selectorOptions}
                        disabled={selectedPlotType !== PlotType.BAR}
                        onValueChange={setSelectedSelectorColumn}
                    />
                </SettingWrapper>
            )}

            {selectedPlotType === PlotType.SCATTER && (
                <SettingWrapper label="Second Result" annotations={selectedSecondResultNameAnnotations}>
                    <Combobox
                        value={selectedSecondResultName.value}
                        items={resultNameOptions}
                        disabled={selectedPlotType !== PlotType.SCATTER}
                        onValueChange={setSelectedSecondResultName}
                    />
                </SettingWrapper>
            )}
            <SettingWrapper label="Subplot by" annotations={selectedSubplotByAnnotations}>
                <Combobox
                    value={selectedSubplotBy.value}
                    items={subplotOptions}
                    onValueChange={(v) => v && setSelectedSubplotBy}
                />
            </SettingWrapper>
            <SettingWrapper label="Color by" annotations={selectedColorByAnnotations}>
                <Combobox
                    value={selectedColorBy.value}
                    items={colorByOptions}
                    onValueChange={(v) => v && setSelectedColorBy}
                />
            </SettingWrapper>
        </SettingWrapper.Section>
    );

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <InplaceVolumesFilterComponent
                    debounceMs={DEBOUNCE_TIME_MS}
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
                    additionalSettings={plotSettings}
                    areCurrentlySelectedTablesComparable={tableDefinitionsAccessor.getAreTablesComparable()}
                    onChange={handleFilterChange}
                />
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}

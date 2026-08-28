import React from "react";

import { useAtom, useAtomValue } from "jotai";

import { InplaceVolumesStatistic_api } from "@api";
import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { Setting } from "@lib/components/Setting";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { InplaceVolumesFilterComponent } from "@modules/_shared/components/InplaceVolumesFilterComponent";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import {
    InplaceVolumesStatisticEnumToStringMapping,
    TableType,
    TableTypeToStringMapping,
} from "@modules/_shared/InplaceVolumes/types";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";

import type { Interfaces } from "../interfaces";

import { selectedIndexValueCriteriaAtom, selectedStatisticOptionsAtom, selectedTableTypeAtom } from "./atoms/baseAtoms";
import { tableDefinitionsAccessorAtom } from "./atoms/derivedAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedGroupByIndicesAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
} from "./atoms/persistableFixableAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";

const DEBOUNCE_TIME_MS = 1500;

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const tableDefinitionsQuery = useAtomValue(tableDefinitionsQueryAtom);
    const tableDefinitionsAccessor = useAtomValue(tableDefinitionsAccessorAtom);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);
    const [selectedTableNames, setSelectedTableNames] = useAtom(selectedTableNamesAtom);
    const [selectedIndicesWithValues, setSelectedIndicesWithValues] = useAtom(selectedIndicesWithValuesAtom);
    const [selectedIndexValueCriteria, setSelectedIndexValueCriteria] = useAtom(selectedIndexValueCriteriaAtom);

    // Local form settings that all have a debounce
    const [settledSelectedTableType, setSettledSelectedTableType] = useAtom(selectedTableTypeAtom);
    const [selectedTableType, setSelectedTableTypeChange] = useDebouncedOnChange<TableType>(
        settledSelectedTableType,
        setSettledSelectedTableType,
        DEBOUNCE_TIME_MS,
    );

    const [settledSelectedStatisticOptions, setSettledSelectedStatisticOptions] = useAtom(selectedStatisticOptionsAtom);
    const [selectedStatisticOptions, setStatisticOptionsChange] = useDebouncedOnChange(
        settledSelectedStatisticOptions,
        setSettledSelectedStatisticOptions,
        DEBOUNCE_TIME_MS,
    );

    const [settledSelectedResultNames, setSettledSelectedResultNames] = useAtom(selectedResultNamesAtom);
    const [selectedResultNames, setSelectedResultNames] = useDebouncedOnChange(
        settledSelectedResultNames.value,
        setSettledSelectedResultNames,
        DEBOUNCE_TIME_MS,
    );

    const [settledSelectedGroupByIndices, setSettledSelectedGroupByIndices] = useAtom(selectedGroupByIndicesAtom);
    const [selectedGroupByIndices, setSettledGroupByIndices] = useDebouncedOnChange(
        settledSelectedGroupByIndices.value,
        setSettledSelectedGroupByIndices,
        DEBOUNCE_TIME_MS,
    );

    usePropagateAllApiErrorsToStatusWriter(tableDefinitionsQuery.errors, statusWriter);

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

    function handleSelectedTableTypeChange(value: string | null) {
        if (value === null) throw new Error("Table type value cannot be null");

        setSelectedTableTypeChange(value as TableType);
    }

    const resultNameOptions: SelectOption<string>[] = tableDefinitionsAccessor
        .getResultNamesIntersection()
        .map((name) => ({ label: name, value: name, hoverText: createHoverTextForVolume(name) }));

    const groupByIndicesOptions: ComboboxItem<string>[] = [];
    for (const indicesWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        groupByIndicesOptions.push({ label: indicesWithValues.indexColumn, value: indicesWithValues.indexColumn });
    }

    const statisticOptions = React.useMemo<ComboboxItem<InplaceVolumesStatistic_api>[]>(() => {
        return Object.values(InplaceVolumesStatistic_api).map((v) => {
            return { value: v, label: InplaceVolumesStatisticEnumToStringMapping[v] };
        });
    }, []);

    const selectedResultNamesAnnotations = useMakePersistableFixableAtomAnnotations(selectedResultNamesAtom);
    const selectedGroupByIndicesAnnotations = useMakePersistableFixableAtomAnnotations(selectedGroupByIndicesAtom);

    const selectedIndicesWithValuesAnnotations =
        useMakePersistableFixableAtomAnnotations(selectedIndicesWithValuesAtom);

    const tableSettings = (
        <Setting.Section title="Result and grouping" defaultOpen>
            <Setting.Field label="Table type" stacked>
                <Combobox
                    value={selectedTableType}
                    items={Object.values(TableType).map((val: TableType) => {
                        return { value: val, label: TableTypeToStringMapping[val] };
                    })}
                    onValueChange={handleSelectedTableTypeChange}
                />
            </Setting.Field>
            {settledSelectedTableType === TableType.STATISTICAL && (
                <Setting.Field label="Statistics">
                    <Combobox
                        value={selectedStatisticOptions}
                        items={statisticOptions}
                        multiple
                        showClearAllButton
                        onValueChange={setStatisticOptionsChange}
                    />
                </Setting.Field>
            )}
            <Setting.Field label="Results" annotations={selectedResultNamesAnnotations}>
                <Select
                    value={selectedResultNames}
                    options={resultNameOptions}
                    multiple
                    size={5}
                    onValueChange={setSelectedResultNames}
                />
            </Setting.Field>
            <Setting.Field label="Grouping" annotations={selectedGroupByIndicesAnnotations}>
                <Combobox
                    value={selectedGroupByIndices}
                    items={groupByIndicesOptions}
                    multiple
                    showClearAllButton
                    onValueChange={setSettledGroupByIndices}
                    placeholder="Select one ore more groups..."
                />
            </Setting.Field>
        </Setting.Section>
    );

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <InplaceVolumesFilterComponent
                    debounceMs={DEBOUNCE_TIME_MS}
                    ensembleSet={ensembleSet}
                    settingsContext={props.settingsContext}
                    workbenchSession={props.workbenchSession}
                    workbenchServices={props.workbenchServices}
                    isPending={tableDefinitionsQuery.isLoading}
                    availableTableNames={tableDefinitionsAccessor.getTableNamesIntersection()}
                    availableIndicesWithValues={tableDefinitionsAccessor.getCommonIndicesWithValues()}
                    selectedEnsembleIdents={selectedEnsembleIdents.value}
                    selectedIndicesWithValues={selectedIndicesWithValues.value}
                    selectedTableNames={selectedTableNames.value}
                    selectedAllowIndicesValuesIntersection={
                        selectedIndexValueCriteria === IndexValueCriteria.ALLOW_INTERSECTION
                    }
                    additionalSettings={tableSettings}
                    areCurrentlySelectedTablesComparable={tableDefinitionsAccessor.getAreTablesComparable()}
                    selectionAnnotations={selectedIndicesWithValuesAnnotations}
                    onChange={handleFilterChange}
                />
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}

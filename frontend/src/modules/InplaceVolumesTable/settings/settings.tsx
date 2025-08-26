import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import { InplaceVolumesStatistic_api } from "@api";
import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import type { TagOption } from "@lib/components/TagPicker";
import { TagPicker } from "@lib/components/TagPicker";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { InplaceVolumesFilterComponent } from "@modules/_shared/components/InplaceVolumesFilterComponent";
import { PersistableAtomWarningWrapper } from "@modules/_shared/components/PersistableAtomWarningWrapper";
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
} from "./atoms/persistableAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = usePublishSubscribeTopicValue(props.workbenchSession, WorkbenchSessionTopic.EnsembleSet);
    const tableDefinitionsQueryResult = useAtomValue(tableDefinitionsQueryAtom);
    const tableDefinitionsAccessor = useAtomValue(tableDefinitionsAccessorAtom);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);
    const [selectedTableNames, setSelectedTableNames] = useAtom(selectedTableNamesAtom);
    const [selectedIndicesWithValues, setSelectedIndicesWithValues] = useAtom(selectedIndicesWithValuesAtom);
    const [selectedResultNames, setSelectedResultNames] = useAtom(selectedResultNamesAtom);
    const [selectedGroupByIndices, setSelectedGroupByIndices] = useAtom(selectedGroupByIndicesAtom);

    const [selectedTableType, setSelectedTableType] = useAtom(selectedTableTypeAtom);
    const [selectedStatisticOptions, setSelectedStatisticOptions] = useAtom(selectedStatisticOptionsAtom);
    const [selectedIndexValueCriteria, setSelectedIndexValueCriteria] = useAtom(selectedIndexValueCriteriaAtom);
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

    function handleGroupByIndicesChange(newGroupByIndices: string[]) {
        setSelectedGroupByIndices(newGroupByIndices);
    }

    function handleStatisticOptionsChange(newStatistics: InplaceVolumesStatistic_api[]) {
        setSelectedStatisticOptions(newStatistics);
    }

    function handleSelectedTableTypeChange(value: string) {
        setSelectedTableType(value as TableType);
    }

    const resultNameOptions: SelectOption<string>[] = tableDefinitionsAccessor
        .getResultNamesIntersection()
        .map((name) => ({ label: name, value: name, hoverText: createHoverTextForVolume(name) }));

    const groupByIndicesOptions: TagOption<string>[] = [];
    for (const indicesWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        groupByIndicesOptions.push({ label: indicesWithValues.indexColumn, value: indicesWithValues.indexColumn });
    }

    const statisticOptions: TagOption<InplaceVolumesStatistic_api>[] = Object.values(InplaceVolumesStatistic_api).map(
        (elm: InplaceVolumesStatistic_api) => {
            return { label: InplaceVolumesStatisticEnumToStringMapping[elm], value: elm };
        },
    );

    const tableSettings = (
        <CollapsibleGroup title="Result and grouping" expanded>
            <div className="flex flex-col gap-2">
                <Label text="Table type">
                    <Dropdown
                        value={selectedTableType}
                        options={Object.values(TableType).map((val: TableType) => {
                            return { value: val, label: TableTypeToStringMapping[val] };
                        })}
                        onChange={handleSelectedTableTypeChange}
                    />
                </Label>
                {selectedTableType === TableType.STATISTICAL && (
                    <Label text="Statistics">
                        <TagPicker
                            value={selectedStatisticOptions}
                            tags={statisticOptions}
                            onChange={handleStatisticOptionsChange}
                        />
                    </Label>
                )}
                <Label text="Results">
                    <PersistableAtomWarningWrapper atom={selectedResultNamesAtom}>
                        <Select
                            value={selectedResultNames.value}
                            options={resultNameOptions}
                            onChange={setSelectedResultNames}
                            multiple
                            size={5}
                            debounceTimeMs={1500}
                        />
                    </PersistableAtomWarningWrapper>
                </Label>
                <Label text="Grouping">
                    <PersistableAtomWarningWrapper atom={selectedGroupByIndicesAtom}>
                        <TagPicker
                            value={selectedGroupByIndices.value}
                            tags={groupByIndicesOptions}
                            onChange={handleGroupByIndicesChange}
                            debounceTimeMs={1500}
                        />
                    </PersistableAtomWarningWrapper>
                </Label>
            </div>
        </CollapsibleGroup>
    );

    return (
        <InplaceVolumesFilterComponent
            ensembleSet={ensembleSet}
            settingsContext={props.settingsContext}
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
            additionalSettings={tableSettings}
            areCurrentlySelectedTablesComparable={tableDefinitionsAccessor.getAreTablesComparable()}
            debounceMs={1500}
        />
    );
}

import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { min } from "lodash";

import {
    colorByAtom,
    groupByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedInplaceCategoriesAtom,
    userSelectedInplaceResponseAtom,
    userSelectedInplaceTableNameAtom,
} from "./atoms/baseAtoms";
import {
    availableInplaceCategoriesAtom,
    availableInplaceResponsesAtom,
    availableInplaceTableNamesAtom,
    selectedEnsembleIdentsAtom,
    selectedInplaceCategoriesAtom,
    selectedInplaceResponseAtom,
    selectedInplaceTableNameAtom,
} from "./atoms/derivedAtoms";
import { inplaceTableInfosQueryAtom } from "./atoms/queryAtoms";
import FilterSelect from "./components/filterSelect";

import { Interface } from "../settingsToViewInterface";
import { State } from "../state";
import { PlotGroupingEnum } from "../typesAndEnums";

export function Settings(props: ModuleSettingsProps<State, Interface>) {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);

    const [groupBy, setGroupBy] = useAtom(groupByAtom);
    const [colorBy, setColorBy] = useAtom(colorByAtom);

    const inplaceTableInfosQuery = useAtomValue(inplaceTableInfosQueryAtom);

    const availableInplaceTableNames = useAtomValue(availableInplaceTableNamesAtom);
    const setSelectedInplaceTableName = useSetAtom(userSelectedInplaceTableNameAtom);
    const selectedInplaceTableName = useAtomValue(selectedInplaceTableNameAtom);

    const availableInplaceResponses = useAtomValue(availableInplaceResponsesAtom);
    const setSelectedInplaceResponse = useSetAtom(userSelectedInplaceResponseAtom);
    const selectedInplaceResponse = useAtomValue(selectedInplaceResponseAtom);

    const availableInplaceCategories = useAtomValue(availableInplaceCategoriesAtom);
    const setSelectedInplaceCategories = useSetAtom(userSelectedInplaceCategoriesAtom);
    const selectedInplaceCategories = useAtomValue(selectedInplaceCategoriesAtom);

    console.log("selectedInplaceCategories settings", selectedInplaceCategories);

    function handleEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
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
    function handleInplaceResponseChange(name: string) {
        setSelectedInplaceResponse(name);
    }

    function handleInplaceCategoriesChange(categoryName: string, values: string[]) {
        const categoryIndex = selectedInplaceCategories.findIndex((category) => category.index_name === categoryName);

        if (categoryIndex !== -1) {
            const newCategories = selectedInplaceCategories.map((category, index) =>
                index === categoryIndex ? { ...category, unique_values: values } : category
            );
            setSelectedInplaceCategories(newCategories);
        } else {
            setSelectedInplaceCategories([...selectedInplaceCategories, { index_name: categoryName, values: values }]);
        }
    }

    let tableInfosErrorMessage = "";
    if (inplaceTableInfosQuery.allQueriesFailed) {
        tableInfosErrorMessage =
            "Failed to fetch inplace volumetrics info. Make sure the selected ensembles has inplace volumetrics data.";
    }
    console.log("availableInplaceCategories settings", availableInplaceCategories);
    return (
        <div className="flex flex-col gap-2">
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
                <CollapsibleGroup title="Subplots and coloring" expanded>
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
                <CollapsibleGroup title="Zone/Region filters" expanded>
                    {availableInplaceCategories.map((categoryData) => (
                        <Select
                            key={categoryData.index_name}
                            options={categoryValuesToOptions(categoryData.values)}
                            size={5}
                            onChange={(values) => handleInplaceCategoriesChange(categoryData.index_name, values)}
                            multiple
                        />
                    ))}
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
}
function plotGroupingEnumToOptions(): DropdownOption[] {
    return Object.values(PlotGroupingEnum).map((value) => ({ value, label: value }));
}

function categoryValuesToOptions(values: (string | number)[]): DropdownOption[] {
    return values.map((value) => ({
        value: value.toString(),
        label: value.toString(),
    }));
}

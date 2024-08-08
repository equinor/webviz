import React from "react";

import { InplaceVolumetricsCategoricalMetaData_api, InplaceVolumetricsTableMetaData_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select } from "@lib/components/Select";
import { UseQueryResult } from "@tanstack/react-query";

import { useAtom } from "jotai";

import { categoricalFilterAtom, ensembleIdentAtom, responseNameAtom, tableNameAtom } from "./atoms/baseAtoms";

import { Interfaces } from "../interfaces";
import { useTableDescriptionsQuery } from "../queryHooks";

//-----------------------------------------------------------------------------------------------------------

export enum VolumetricResponseAbbreviations {
    //a bit future proff
    STOIIP_OIL = "Stock tank oil initially in place (oil zone)",
    GIIP_GAS = "Gas initially in place (gas zone)",
    BULK_OIL = "Bulk volume (oil zone)",
    BULK_GAS = "Bulk volume (gas zone)",
    BULK_TOTAL = "Bulk volume (total)",
    NET_OIL = "Net volume (oil zone)",
    NET_GAS = "Net volume (gas zone)",
    NET_TOTAL = "Net volume (total)",
    // PORV_OIL = "Pore volume (oil zone)",
    // PORV_GAS = "Pore volume (gas zone)",
    // PORV_TOTAL = "Pore volume (total)",
    PORE_OIL = "Pore volume (oil zone)",
    PORE_GAS = "Pore volume (gas zone)",
    PORE_TOTAL = "Pore volume (total)",
    HCPV_OIL = "Hydro carbon pore volume (oil zone)",
    HCPV_GAS = "Hydro carbon pore volume (gas zone)",
    HCPV_TOTAL = "Hydro carbon pore volume (total zone)",
    STOIIP_GAS = "Stock tank oil initially in place (gas zone)",
    STOIIP_TOTAL = "Stock tank oil initially in place (total)",
    GIIP_OIL = "Gas initially in place (oil zone)",
    GIIP_TOTAL = "Gas initially in place (total)",
    RECOVERABLE_OIL = "Recoverable volume (oil zone)",
    RECOVERABLE_GAS = "Recoverable volume (gas zone)",
    RECOVERABLE_TOTAL = "Recoverable volume (total)",
    BULK = "Bulk volume",
    NET = "Net volume",
    PORV = "Pore volume",
    HCPV = "Hydro carbon pore volume",
    STOIIP = "Stock tank oil initially in place",
    GIIP = "Gas initially in place",
    RECOVERABLE = "Recoverable volume",
    ASSOCIATEDGAS = "Associated gas",
    ASSOCIATEDOIL = "Associated oil",
    PORO = "Porosity",
    SW = "Water saturation",
    NTG = "Net to gross",
    BO = "Oil formation volume factor",
    BG = "Gas formation volume factor",
}
function sortedResponses(responses: string[]): string[] {
    return Object.keys(VolumetricResponseAbbreviations).filter((response) => responses.includes(response));
}
function responsesToSelectOptions(responses: string[]): { value: string; label: string }[] {
    return (
        responses.map((response: string) => ({
            value: response,
            label: VolumetricResponseAbbreviations[response as keyof typeof VolumetricResponseAbbreviations],
        })) ?? []
    );
}
function getTableNameOptions(
    tableDescriptionsQuery: UseQueryResult<InplaceVolumetricsTableMetaData_api[]>
): { value: string; label: string }[] {
    return (
        tableDescriptionsQuery.data?.map((table: InplaceVolumetricsTableMetaData_api) => ({
            value: table.name,
            label: table.name,
        })) ?? []
    );
}
function getTableCategoricalOptions(
    tableDescriptionsQuery: UseQueryResult<InplaceVolumetricsTableMetaData_api[]>,
    tableName: string | null
): InplaceVolumetricsCategoricalMetaData_api[] {
    const tableDescription = tableDescriptionsQuery.data?.find((table) => table.name === tableName);
    return tableDescription?.categorical_column_metadata ?? [];
}
function getTableResponseOptions(
    tableDescriptionsQuery: UseQueryResult<InplaceVolumetricsTableMetaData_api[]>,
    tableName: string | null
): { value: string; label: string }[] {
    const tableDescription = tableDescriptionsQuery.data?.find((table) => table.name === tableName);
    const responses = sortedResponses(tableDescription?.numerical_column_names ?? []);
    return responsesToSelectOptions(responses);
}

export function Settings({ workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [ensembleIdent, setEnsembleIdent] = useAtom(ensembleIdentAtom);
    const [tableName, setTableName] = useAtom(tableNameAtom);
    const [categoricalFilter, setCategoricalFilter] = useAtom(categoricalFilterAtom);
    const [responseName, setResponseName] = useAtom(responseNameAtom);

    const tableDescriptionsQuery = useTableDescriptionsQuery(ensembleIdent, true);

    React.useEffect(
        function selectDefaultEnsemble() {
            const fixedEnsembleIdent = fixupEnsembleIdent(ensembleIdent, ensembleSet);
            if (fixedEnsembleIdent !== ensembleIdent) {
                setEnsembleIdent(fixedEnsembleIdent);
            }
        },
        [ensembleSet, ensembleIdent, setEnsembleIdent]
    );

    React.useEffect(
        function selectDefaultTable() {
            if (tableDescriptionsQuery.data) {
                setTableName(tableDescriptionsQuery.data[0].name);
                const responses = tableDescriptionsQuery.data[0].numerical_column_names;
                setResponseName(sortedResponses(responses)[0]);
            } else {
                setTableName(null);
                setResponseName(null);
            }
        },
        [tableDescriptionsQuery.data, setTableName, setResponseName]
    );

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setEnsembleIdent(newEnsembleIdent);
    }
    function handleTableChange(tableName: string) {
        setTableName(tableName);
    }
    function handleResponseChange(responseName: string) {
        setResponseName(responseName);
    }

    const handleSelectionChange = React.useCallback(
        function handleSelectionChange(categoryName: string, categoryValues: string[]) {
            let currentCategoryFilter = categoricalFilter;
            if (currentCategoryFilter) {
                const categoryIndex = currentCategoryFilter.findIndex((category) => category.name === categoryName);
                if (categoryIndex > -1) {
                    currentCategoryFilter[categoryIndex].unique_values = categoryValues;
                } else {
                    currentCategoryFilter.push({ name: categoryName, unique_values: categoryValues });
                }
            } else {
                currentCategoryFilter = [];
                currentCategoryFilter.push({ name: categoryName, unique_values: categoryValues });
            }

            setCategoricalFilter(currentCategoryFilter);
        },
        [categoricalFilter, setCategoricalFilter]
    );

    const tableNameOptions = getTableNameOptions(tableDescriptionsQuery);
    const tableCategoricalOptions = getTableCategoricalOptions(tableDescriptionsQuery, tableName);
    const responseOptions = getTableResponseOptions(tableDescriptionsQuery, tableName);

    return (
        <>
            <Label text="Ensemble">
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={ensembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <QueryStateWrapper
                queryResult={tableDescriptionsQuery}
                loadingComponent={<CircularProgress />}
                errorComponent={"Could not load table descriptions"}
                className="flex flex-col gap-4"
            >
                <Label text="Volumetric table">
                    <Dropdown
                        options={tableNameOptions}
                        value={tableName ?? ""}
                        onChange={(tableName) => handleTableChange(tableName as string)}
                    />
                </Label>
                <Label text="Volume response">
                    <Dropdown
                        options={responseOptions}
                        value={responseName ?? ""}
                        onChange={(responseName) => handleResponseChange(responseName as string)}
                    />
                </Label>
                <h6>Filters</h6>
                {tableCategoricalOptions?.map((category) => {
                    return (
                        <Label key={category.name} text={category.name}>
                            <Select
                                key={category.name}
                                options={category.unique_values.map((value) => ({
                                    value: value as string,
                                    label: value as string,
                                }))}
                                value={category.unique_values as string[]}
                                onChange={(unique_values) =>
                                    handleSelectionChange(category.name, unique_values as string[])
                                }
                                size={5}
                                multiple={true}
                            />
                        </Label>
                    );
                })}
            </QueryStateWrapper>
        </>
    );
}

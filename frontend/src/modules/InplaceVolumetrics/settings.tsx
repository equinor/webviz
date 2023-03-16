import React from "react";

import { Ensemble, InplaceVolumetricsCategoricalMetaData, InplaceVolumetricsTableMetaData } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper/apiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { UseQueryResult } from "@tanstack/react-query";

import { useEnsemblesQuery, useTableDescriptionsQuery } from "./queryHooks";
import { State } from "./state";

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
    PORV_OIL = "Pore volume (oil zone)",
    PORV_GAS = "Pore volume (gas zone)",
    PORV_TOTAL = "Pore volume (total)",
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
    return Object.keys(VolumetricResponseAbbreviations).filter(response => responses.includes(response))
}
function responsesToSelectOptions(responses: string[]): { value: string; label: string }[] {
    return responses.map((response: string) => (
        {
            value: response,
            label: VolumetricResponseAbbreviations[response as keyof typeof VolumetricResponseAbbreviations]
        }
    )) ?? [];
}
function fixupSelectedEnsembleName(currName: string | null, ensemblesArr: Ensemble[] | null): string | null {
    const ensembleNames = ensemblesArr ? ensemblesArr.map((item) => item.name) : [];
    if (currName && ensembleNames.includes(currName)) {
        return currName;
    }

    if (ensembleNames.length > 0) {
        return ensembleNames[0];
    }

    return null;
}
function getEnsembleNameOptions(ensemblesQuery: UseQueryResult<Ensemble[]>): { value: string; label: string }[] {
    return ensemblesQuery.data?.map((ensemble: Ensemble) => ({ value: ensemble.name, label: ensemble.name })) ?? [];
}
function getTableNameOptions(tableDescriptionsQuery: UseQueryResult<InplaceVolumetricsTableMetaData[]>): { value: string; label: string }[] {
    return tableDescriptionsQuery.data?.map((table: InplaceVolumetricsTableMetaData) => ({ value: table.name, label: table.name })) ?? [];
}
function getTableCategoricalOptions(tableDescriptionsQuery: UseQueryResult<InplaceVolumetricsTableMetaData[]>, tableName: string | null): InplaceVolumetricsCategoricalMetaData[] {
    const tableDescription = tableDescriptionsQuery.data?.find((table) => table.name === tableName);
    return tableDescription?.categorical_column_metadata ?? [];
}
function getTableResponseOptions(tableDescriptionsQuery: UseQueryResult<InplaceVolumetricsTableMetaData[]>, tableName: string | null): { value: string; label: string }[] {
    const tableDescription = tableDescriptionsQuery.data?.find((table) => table.name === tableName);
    const responses = sortedResponses(tableDescription?.numerical_column_names ?? [])
    return responsesToSelectOptions(responses)
}


export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {

    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const [ensembleName, setEnsembleName] = moduleContext.useStoreState("ensembleName");
    const [tableName, setTableName] = moduleContext.useStoreState("tableName");
    const [categoricalFilter, setCategoricalFilter] = moduleContext.useStoreState("categoricalFilter");
    const [responseName, setResponseName] = moduleContext.useStoreState("responseName");
    const stashedEnsembleName = React.useRef("");

    const ensemblesQuery = useEnsemblesQuery(caseUuid);
    const tableDescriptionsQuery = useTableDescriptionsQuery(caseUuid, ensembleName, true);

    React.useEffect(
        function selectDefaultEnsemble() {
            if (ensemblesQuery.data) {
                const candidateName = ensembleName ?? stashedEnsembleName.current;
                setEnsembleName(fixupSelectedEnsembleName(candidateName, ensemblesQuery.data));
            } else {
                stashedEnsembleName.current = ensembleName ?? "";
            }
        },
        [ensemblesQuery.data]
    );


    React.useEffect(
        function selectDefaultTable() {
            console.log("selectDefaultTable()");
            if (tableDescriptionsQuery.data) {
                setTableName(tableDescriptionsQuery.data[0].name);
                const responses = tableDescriptionsQuery.data[0].numerical_column_names;
                setResponseName(sortedResponses(responses)[0]);
            } else {
                setTableName(null);
                setResponseName(null);

            }
        },
        [tableDescriptionsQuery.data]
    );

    function handleEnsembleSelectionChange(ensembleName: string) {
        console.log("handleEnsembleSelectionChange()");
        setEnsembleName(ensembleName);
    }
    function handleTableChange(tableName: string) {
        console.log("handleTableChange()");
        setTableName(tableName)

    }
    function handleResponseChange(responseName: string) {
        console.log("handleResponseChange()");
        setResponseName(responseName)

    }

    const handleSelectionChange = React.useCallback((categoryName: string, categoryValues: string[]) => {
        console.log("handleSelectionChange()");
        let currentCategoryFilter = categoricalFilter;
        if (currentCategoryFilter) {

            const categoryIndex = currentCategoryFilter.findIndex((category) => category.name === categoryName);
            if (categoryIndex > -1) {
                currentCategoryFilter[categoryIndex].unique_values = categoryValues
            }
            else {
                currentCategoryFilter.push({ name: categoryName, unique_values: categoryValues })
            }
        }
        else {
            currentCategoryFilter = [];
            currentCategoryFilter.push({ name: categoryName, unique_values: categoryValues })
        }

        setCategoricalFilter(currentCategoryFilter)

    }, [])

    const ensembleNameOptions = getEnsembleNameOptions(ensemblesQuery);
    const tableNameOptions = getTableNameOptions(tableDescriptionsQuery);
    const tableCategoricalOptions = getTableCategoricalOptions(tableDescriptionsQuery, tableName);
    const responseOptions = getTableResponseOptions(tableDescriptionsQuery, tableName);


    return (
        <>
            <ApiStateWrapper apiResult={ensemblesQuery} loadingComponent={<CircularProgress />} errorComponent={"feil"} >
                <Dropdown
                    options={ensembleNameOptions}
                    value={ensembleName ?? ""}
                    onChange={(ensembleName) => handleEnsembleSelectionChange(ensembleName as string)}
                /></ApiStateWrapper>
            <ApiStateWrapper apiResult={tableDescriptionsQuery} loadingComponent={<CircularProgress />} errorComponent={"feil"} >
                <Dropdown
                    options={tableNameOptions}
                    value={tableName ?? ""}
                    onChange={(tableName) => handleTableChange(tableName as string)}

                />

                <Dropdown
                    options={responseOptions}
                    value={responseName ?? ""}
                    onChange={(responseName) => handleResponseChange(responseName as string)}

                />

                <label className="text-lg">{" Filters"}</label>
                {
                    tableCategoricalOptions?.map((category) => {
                        return (
                            <div key={category.name}>

                                <Select
                                    key={category.name}
                                options={category.unique_values.map((value) => ({
                                    options={category.unique_values.map((value) => ({ value: value as string, label: value as string }))}
                                    value={category.unique_values as string[]}
                                    onChange={(unique_values) => handleSelectionChange(category.name, unique_values as string[])}
                                    size={5}
                                    multiple={true}
                                />

                            </div>)
                    })
                }
            </ApiStateWrapper>

        </>
    )
}
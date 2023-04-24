import React from "react";

import { InplaceVolumetricsCategoricalMetaData, InplaceVolumetricsTableMetaData } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper/apiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { Ensemble } from "@shared-types/ensemble";
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
function fixupSelectedEnsembleName(currEnsemble: Ensemble | null, ensemblesArr: Ensemble[] | null): Ensemble | null {
    if (!ensemblesArr) {
        return null;
    }

    if (
        currEnsemble &&
        ensemblesArr &&
        ensemblesArr.some(
            (el) => el.caseUuid === currEnsemble.caseUuid && el.ensembleName === currEnsemble.ensembleName
        )
    ) {
        return currEnsemble;
    }

    if (ensemblesArr.length > 0) {
        return ensemblesArr[0];
    }

    return null;
}
function getEnsembleNameOptions(ensembles: Ensemble[] | null): { value: string; label: string }[] {
    if (!ensembles) {
        return [];
    }
    return (
        ensembles.map((ensemble: Ensemble) => ({
            value: `${ensemble.caseUuid}::${ensemble.ensembleName}`,
            label: `${ensemble.caseName} - ${ensemble.ensembleName}`,
        })) ?? []
    );
}
function getTableNameOptions(
    tableDescriptionsQuery: UseQueryResult<InplaceVolumetricsTableMetaData[]>
): { value: string; label: string }[] {
    return (
        tableDescriptionsQuery.data?.map((table: InplaceVolumetricsTableMetaData) => ({
            value: table.name,
            label: table.name,
        })) ?? []
    );
}
function getTableCategoricalOptions(
    tableDescriptionsQuery: UseQueryResult<InplaceVolumetricsTableMetaData[]>,
    tableName: string | null
): InplaceVolumetricsCategoricalMetaData[] {
    const tableDescription = tableDescriptionsQuery.data?.find((table) => table.name === tableName);
    return tableDescription?.categorical_column_metadata ?? [];
}
function getTableResponseOptions(
    tableDescriptionsQuery: UseQueryResult<InplaceVolumetricsTableMetaData[]>,
    tableName: string | null
): { value: string; label: string }[] {
    const tableDescription = tableDescriptionsQuery.data?.find((table) => table.name === tableName);
    const responses = sortedResponses(tableDescription?.numerical_column_names ?? []);
    return responsesToSelectOptions(responses);
}

function ensembleToString(ensemble: Ensemble): string {
    return `${ensemble.caseUuid}-${ensemble.ensembleName}`;
}

export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    const selectedEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const [ensemble, setEnsemble] = moduleContext.useStoreState("ensemble");
    const [tableName, setTableName] = moduleContext.useStoreState("tableName");
    const [categoricalFilter, setCategoricalFilter] = moduleContext.useStoreState("categoricalFilter");
    const [responseName, setResponseName] = moduleContext.useStoreState("responseName");
    const stashedEnsemble = React.useRef<Ensemble | null>(null);

    const tableDescriptionsQuery = useTableDescriptionsQuery(ensemble, true);

    React.useEffect(
        function selectDefaultEnsemble() {
            if (selectedEnsembles) {
                const candidate = selectedEnsembles.length > 0 ? selectedEnsembles[0] : stashedEnsemble.current;
                setEnsemble(fixupSelectedEnsembleName(candidate, selectedEnsembles));
            } else {
                stashedEnsemble.current = ensemble ?? null;
            }
        },
        [selectedEnsembles, ensemble]
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

    function handleEnsembleSelectionChange(ensembleString: string) {
        console.log("handleEnsembleSelectionChange()");
        const [caseUuid, ensembleName] = ensembleString.split("::");
        const matchingEnsemble = selectedEnsembles?.find(
            (el) => el.caseUuid === caseUuid && el.ensembleName === ensembleName
        );
        setEnsemble(matchingEnsemble ?? null);
    }
    function handleTableChange(tableName: string) {
        console.log("handleTableChange()");
        setTableName(tableName);
    }
    function handleResponseChange(responseName: string) {
        console.log("handleResponseChange()");
        setResponseName(responseName);
    }

    const handleSelectionChange = React.useCallback((categoryName: string, categoryValues: string[]) => {
        console.log("handleSelectionChange()");
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
    }, []);

    const ensembleOptions = getEnsembleNameOptions(selectedEnsembles);
    const tableNameOptions = getTableNameOptions(tableDescriptionsQuery);
    const tableCategoricalOptions = getTableCategoricalOptions(tableDescriptionsQuery, tableName);
    const responseOptions = getTableResponseOptions(tableDescriptionsQuery, tableName);

    return (
        <>
            <Label text="Ensemble">
                <Dropdown
                    options={ensembleOptions}
                    value={ensemble ? ensembleToString(ensemble) : ""}
                    onChange={(ensembleName) => handleEnsembleSelectionChange(ensembleName)}
                />
            </Label>
            <ApiStateWrapper
                apiResult={tableDescriptionsQuery}
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
            </ApiStateWrapper>
        </>
    );
}

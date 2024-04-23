import { StatisticFunction_api, VectorStatisticData_api } from "@api";
import { UseQueryResult } from "@tanstack/react-query";

import { FanchartStatisticOption, VectorSpec } from "../../typesAndEnums";

/**
    Helper function to create an array with pair of vector specification and loaded query data

    If query data is not valid, the vector specification and corresponding query data will not
    be included in the output array
 */
export function createLoadedVectorSpecificationAndDataArray<T>(
    vectorSpecifications: VectorSpec[],
    queryResults: UseQueryResult<T | null | undefined>[]
): { vectorSpecification: VectorSpec; data: T }[] {
    if (vectorSpecifications.length !== queryResults.length) {
        throw new Error(
            "Number of vector specifications and query results must be equal. Got vector specifications: " +
                vectorSpecifications.length +
                " and query results: " +
                queryResults.length +
                "."
        );
    }

    const output: { vectorSpecification: VectorSpec; data: T }[] = [];
    for (let i = 0; i < queryResults.length; ++i) {
        const result = queryResults[i];
        if (!result.data) continue;

        output.push({ vectorSpecification: vectorSpecifications[i], data: result.data });
    }

    return output;
}

/**
    Helper function to filter out the selected individual statistic options from the vector specification and statistics data array
 */
export function filterVectorSpecificationAndIndividualStatisticsDataArray(
    vectorSpecificationAndStatisticsData: { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[],
    selectedIndividualStatisticOptions: StatisticFunction_api[]
): { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[] {
    if (selectedIndividualStatisticOptions.length === 0) return [];

    const output = vectorSpecificationAndStatisticsData.map((v) => {
        const filteredValueObjects = v.data.value_objects.filter((vo) => {
            return selectedIndividualStatisticOptions.includes(vo.statistic_function);
        });
        return { vectorSpecification: v.vectorSpecification, data: { ...v.data, value_objects: filteredValueObjects } };
    });
    return output;
}

/**
    Helper function to filter out the selected fanchart statistic options from the vector specification and statistics data array
 */
export function filterVectorSpecificationAndFanchartStatisticsDataArray(
    vectorSpecificationAndStatisticsData: { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[],
    selectedFanchartStatisticOptions: FanchartStatisticOption[]
): { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[] {
    const includeStatisticFunctions: StatisticFunction_api[] = [];
    if (selectedFanchartStatisticOptions.includes(FanchartStatisticOption.MEAN))
        includeStatisticFunctions.push(StatisticFunction_api.MEAN);
    if (selectedFanchartStatisticOptions.includes(FanchartStatisticOption.MIN_MAX)) {
        includeStatisticFunctions.push(StatisticFunction_api.MIN);
        includeStatisticFunctions.push(StatisticFunction_api.MAX);
    }
    if (selectedFanchartStatisticOptions.includes(FanchartStatisticOption.P10_P90)) {
        includeStatisticFunctions.push(StatisticFunction_api.P10);
        includeStatisticFunctions.push(StatisticFunction_api.P90);
    }

    if (includeStatisticFunctions.length === 0) return [];

    const output = vectorSpecificationAndStatisticsData.map((v) => {
        const filteredValueObjects = v.data.value_objects.filter((vo) => {
            return includeStatisticFunctions.includes(vo.statistic_function);
        });
        return { vectorSpecification: v.vectorSpecification, data: { ...v.data, value_objects: filteredValueObjects } };
    });
    return output;
}

import { RelPermSpec } from "@modules/RelPerm/typesAndEnums";
import { UseQueryResult } from "@tanstack/react-query";

export function createLoadedRelPermSpecificationAndDataArray<T>(
    relPermSpecifications: RelPermSpec[],
    queryResults: UseQueryResult<T | null | undefined>[]
): { relPermSpecification: RelPermSpec; data: T }[] {
    if (relPermSpecifications.length !== queryResults.length) {
        throw new Error(
            "Number of relPerm specifications and query results must be equal. Got relPerm specifications: " +
                relPermSpecifications.length +
                " and query results: " +
                queryResults.length +
                "."
        );
    }

    const output: { relPermSpecification: RelPermSpec; data: T }[] = [];
    for (let i = 0; i < queryResults.length; ++i) {
        const result = queryResults[i];
        if (!result.data) continue;

        output.push({ relPermSpecification: relPermSpecifications[i], data: result.data });
    }

    return output;
}

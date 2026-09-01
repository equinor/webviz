import { useAtomValue } from "jotai";

import type { ViewStatusWriter } from "@framework/StatusWriter";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { FLUID_SPECIFIC_RESULT_NAMES, TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

import { indicesWithValuesAtom } from "../atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";

const FACIES_FRACTION_RESULT_NAME = "FACIES_FRACTION";
const FACIES_INDEX_COLUMN = "FACIES";

export function useMakeViewStatusWriterMessages(
    statusWriter: ViewStatusWriter,
    resultName: string | null,
    subplotBy: string,
    colorBy: string,
) {
    const queriesResult = useAtomValue(aggregatedTableDataQueriesAtom);
    const indicesWithValues = useAtomValue(indicesWithValuesAtom);

    usePropagateAllApiErrorsToStatusWriter(queriesResult.errors, statusWriter);

    for (const elm of indicesWithValues) {
        if (elm.values.length === 0) {
            statusWriter.addWarning(`Select at least one filter value for ${elm.indexColumn.valueOf()}`);
        }
    }

    if (
        resultName === FACIES_FRACTION_RESULT_NAME &&
        subplotBy !== FACIES_INDEX_COLUMN &&
        colorBy !== FACIES_INDEX_COLUMN
    ) {
        statusWriter.addWarning(
            "FACIES_FRACTION is only meaningful when FACIES is used as Subplot by or Color by; otherwise every fraction collapses to 1.",
        );
    }

    const requiredFluid = resultName !== null ? FLUID_SPECIFIC_RESULT_NAMES[resultName] : undefined;
    if (requiredFluid !== undefined) {
        const selectedFluids =
            indicesWithValues
                .find((elm) => elm.indexColumn === TableOriginKey.FLUID)
                ?.values.map((v) => String(v).toLowerCase()) ?? [];
        if (!selectedFluids.includes(requiredFluid)) {
            statusWriter.addWarning(
                `${resultName} is only defined for the "${requiredFluid}" fluid. Include it in the FLUID filter to see data.`,
            );
        }
    }
}

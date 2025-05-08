import { useAtomValue } from "jotai";

import type { ViewStatusWriter } from "@framework/StatusWriter";


import { showHistoricalAtom, showStatisticsAtom } from "../atoms/baseAtoms";
import {
    historicalVectorDataQueryAtom,
    statisticalVectorSensitivityDataQueryAtom,
    vectorDataQueryAtom,
} from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter) {
    const vectorDataQuery = useAtomValue(vectorDataQueryAtom);
    const statisticalVectorSensitivityDataQuery = useAtomValue(statisticalVectorSensitivityDataQueryAtom);
    const historicalVectorDataQuery = useAtomValue(historicalVectorDataQueryAtom);
    const showStatistics = useAtomValue(showStatisticsAtom);
    const showHistorical = useAtomValue(showHistoricalAtom);

    const isAnyQueryFetching =
        vectorDataQuery.isFetching ||
        statisticalVectorSensitivityDataQuery.isFetching ||
        historicalVectorDataQuery.isFetching;
    statusWriter.setLoading(isAnyQueryFetching);

    if (vectorDataQuery.isError) {
        statusWriter.addError("Realization data query has error state.");
    }
    if (showStatistics && statisticalVectorSensitivityDataQuery.isError) {
        statusWriter.addError("Statistics data per sensitivity query has error state.");
    }
    if (showHistorical && historicalVectorDataQuery.isError) {
        statusWriter.addWarning("Historical data query has error state.");
    }
}

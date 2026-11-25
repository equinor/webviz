import { useAtomValue } from "jotai";

import type { ViewStatusWriter } from "@framework/StatusWriter";
import {
    propagateApiErrorToStatusWriter,
    propagateQueryErrorToStatusWriter,
} from "@modules/_shared/utils/propagateApiErrorToStatusWriter";
import { propagateWarningsToStatusWriter } from "@modules/_shared/utils/propagateWarningsToStatusWriter";

import { showHistoricalAtom, showStatisticsAtom } from "../atoms/baseAtoms";
import {
    historicalVectorDataQueryAtom,
    statisticalVectorSensitivityDataQueryAtom,
    vectorDataQueryAtom,
    vectorDataWarningsAtom,
} from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter) {
    const vectorDataQuery = useAtomValue(vectorDataQueryAtom);
    const statisticalVectorSensitivityDataQuery = useAtomValue(statisticalVectorSensitivityDataQueryAtom);
    const vectorDataWarnings = useAtomValue(vectorDataWarningsAtom);
    const historicalVectorDataQuery = useAtomValue(historicalVectorDataQueryAtom);
    const showStatistics = useAtomValue(showStatisticsAtom);
    const showHistorical = useAtomValue(showHistoricalAtom);

    const isAnyQueryFetching =
        vectorDataQuery.isFetching ||
        statisticalVectorSensitivityDataQuery.isFetching ||
        historicalVectorDataQuery.isFetching;
    statusWriter.setLoading(isAnyQueryFetching);

    propagateQueryErrorToStatusWriter(vectorDataQuery, statusWriter);

    // Warnings reported by the back-end alongside the data (de-duplicated, as both queries may report the same)
    propagateWarningsToStatusWriter(vectorDataWarnings, statusWriter);

    // Conditional propagation of statistical query error
    const statisticalQueryError = showStatistics ? statisticalVectorSensitivityDataQuery.error : null;
    propagateApiErrorToStatusWriter(statisticalQueryError, statusWriter);

    // Conditional propagation of historical query error
    const historicalQueryError = showHistorical ? historicalVectorDataQuery.error : null;
    propagateApiErrorToStatusWriter(historicalQueryError, statusWriter);
}

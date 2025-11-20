import { useAtomValue } from "jotai";

import type { ViewStatusWriter } from "@framework/StatusWriter";
import {
    usePropagateApiErrorToStatusWriter,
    usePropagateQueryErrorToStatusWriter,
} from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

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

    usePropagateQueryErrorToStatusWriter(vectorDataQuery, statusWriter);

    // Conditional propagation of statistical query error
    const statisticalQueryError = showStatistics ? statisticalVectorSensitivityDataQuery.error : null;
    usePropagateApiErrorToStatusWriter(statisticalQueryError, statusWriter);

    // Conditional propagation of historical query error
    const historicalQueryError = showHistorical ? historicalVectorDataQuery.error : null;
    usePropagateApiErrorToStatusWriter(historicalQueryError, statusWriter);
}

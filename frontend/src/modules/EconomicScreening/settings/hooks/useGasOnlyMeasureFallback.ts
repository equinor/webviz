import { useEffect } from "react";

import { useAtom, useAtomValue } from "jotai";

import { CashFlowProfileType, EconomicMeasure } from "../../typesAndEnums";
import { cashFlowProfileTypeAtom, selectedMeasureAtom } from "../atoms/baseAtoms";
import { activeVectorListQueryAtom, hasOilProductionVectorAtom, salesGasStrategyAtom } from "../atoms/derivedAtoms";

/** Switches oil measures and profiles to their sales-gas counterparts when the ensemble has no oil vector. */
export function useGasOnlyMeasureFallback(): void {
    const [selectedMeasure, setSelectedMeasure] = useAtom(selectedMeasureAtom);
    const [cashFlowProfileType, setCashFlowProfileType] = useAtom(cashFlowProfileTypeAtom);
    const vectorListQuery = useAtomValue(activeVectorListQueryAtom);
    const hasOilProductionVector = useAtomValue(hasOilProductionVectorAtom);
    const salesGasStrategy = useAtomValue(salesGasStrategyAtom);

    useEffect(() => {
        if (vectorListQuery.isFetching || hasOilProductionVector || salesGasStrategy.kind === "UNAVAILABLE") {
            return;
        }
        if (selectedMeasure === EconomicMeasure.DISCOUNTED_OIL_VOLUME) {
            setSelectedMeasure(EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME);
        } else if (selectedMeasure === EconomicMeasure.UNDISCOUNTED_OIL_VOLUME) {
            setSelectedMeasure(EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME);
        }
        if (cashFlowProfileType === CashFlowProfileType.ANNUAL_OIL_VOLUME) {
            setCashFlowProfileType(CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME);
        }
    }, [
        cashFlowProfileType,
        hasOilProductionVector,
        salesGasStrategy.kind,
        selectedMeasure,
        setCashFlowProfileType,
        setSelectedMeasure,
        vectorListQuery.isFetching,
    ]);
}

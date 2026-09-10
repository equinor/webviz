import { atom } from "jotai";

import type { CostProfileEntry, EvaluationWindow } from "@modules/EconomicScreening/typesAndEnums";
import {
    DEFAULT_DISCOUNT_RATE_PERCENT,
    DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR,
    DiscountConvention,
    DistributionPlotType,
    EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";

export const discountRatePercentAtom = atom<number>(DEFAULT_DISCOUNT_RATE_PERCENT);
export const discountBaseYearAtom = atom<number | null>(null);
export const discountConventionAtom = atom<DiscountConvention>(DiscountConvention.MID_YEAR);
export const gasToOilEquivalentFactorAtom = atom<number>(DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR);

export const currencyAtom = atom<string>("USD");
export const oilPriceAtom = atom<number | null>(null);
export const oilPriceBasisAtom = atom<OilPriceBasis>(OilPriceBasis.PER_BBL);
export const gasPriceAtom = atom<number | null>(null);
export const gasPriceBasisAtom = atom<GasPriceBasis>(GasPriceBasis.PER_SM3);

export const costProfileAtom = atom<CostProfileEntry[]>([]);

export const evaluationWindowAtom = atom<EvaluationWindow>({ firstYear: null, lastYear: null });

export const selectedMeasureAtom = atom<EconomicMeasure>(EconomicMeasure.DISCOUNTED_OIL_VOLUME);
export const distributionPlotTypeAtom = atom<DistributionPlotType>(DistributionPlotType.HISTOGRAM);
export const showCashFlowPlotAtom = atom<boolean>(false);

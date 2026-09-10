import { atom } from "jotai";

import type {
    CostProfileEntry,
    EarlyValueConfiguration,
    EvaluationWindow,
} from "@modules/EconomicScreening/typesAndEnums";
import {
    DEFAULT_DISCOUNT_RATE_PERCENT,
    DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR,
    CashFlowProfileType,
    DiscountConvention,
    DistributionPlotType,
    EconomicMeasure,
    GasPriceBasis,
    InvestmentTiming,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";
import type { MissingComponentAssumptions } from "@modules/EconomicScreening/utils/vectorResolution";

export const discountRatePercentAtom = atom<number>(DEFAULT_DISCOUNT_RATE_PERCENT);
export const discountBaseYearAtom = atom<number | null>(null);
export const discountConventionAtom = atom<DiscountConvention>(DiscountConvention.MID_YEAR);
export const investmentTimingAtom = atom<InvestmentTiming>(InvestmentTiming.START_OF_YEAR);
export const gasToOilEquivalentFactorAtom = atom<number>(DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR);

export const currencyAtom = atom<string>("USD");
export const oilPriceAtom = atom<number | null>(null);
export const oilPriceBasisAtom = atom<OilPriceBasis>(OilPriceBasis.PER_BBL);
export const excludeOilRevenueAtom = atom<boolean>(false);
export const gasPriceAtom = atom<number | null>(null);
export const gasPriceBasisAtom = atom<GasPriceBasis>(GasPriceBasis.PER_SM3);
export const excludeGasRevenueAtom = atom<boolean>(false);

export const costProfileAtom = atom<CostProfileEntry[]>([]);
export const isCostProfileDraftValidAtom = atom<boolean>(true);

export const evaluationWindowAtom = atom<EvaluationWindow>({ firstYear: null, lastYear: null });
export const earlyValueConfigurationAtom = atom<EarlyValueConfiguration>({ enabled: false, endYear: null });

export const selectedMeasureAtom = atom<EconomicMeasure>(EconomicMeasure.DISCOUNTED_OIL_VOLUME);
export const distributionPlotTypeAtom = atom<DistributionPlotType>(DistributionPlotType.EXCEEDANCE);
export const showCashFlowPlotAtom = atom<boolean>(false);
export const cashFlowProfileTypeAtom = atom<CashFlowProfileType>(CashFlowProfileType.ANNUAL_OIL_VOLUME);

/** Explicit zero assumptions, keyed by the ensemble identity they apply to. */
export const missingComponentAssumptionsAtom = atom<Record<string, MissingComponentAssumptions>>({});

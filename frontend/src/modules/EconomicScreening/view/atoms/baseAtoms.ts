import { atom } from "jotai";

import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type {
    CostProfileEntry,
    DiscountAssumptions,
    EarlyValueConfiguration,
    EvaluationWindow,
    PriceAssumptions,
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
import type { SalesGasStrategy } from "@modules/EconomicScreening/utils/vectorResolution";

export const ensembleIdentAtom = atom<RegularEnsembleIdent | DeltaEnsembleIdent | null>(null);

export const salesGasStrategyAtom = atom<SalesGasStrategy>({ kind: "UNAVAILABLE" });

export const discountAssumptionsAtom = atom<DiscountAssumptions>({
    discountRatePercent: DEFAULT_DISCOUNT_RATE_PERCENT,
    baseYear: null,
    convention: DiscountConvention.MID_YEAR,
    investmentTiming: InvestmentTiming.START_OF_YEAR,
    gasToOilEquivalentFactor: DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR,
});

export const priceAssumptionsAtom = atom<PriceAssumptions>({
    currency: "USD",
    oilPrice: null,
    oilPriceBasis: OilPriceBasis.PER_BBL,
    excludeOilRevenue: false,
    gasPrice: null,
    gasPriceBasis: GasPriceBasis.PER_SM3,
    excludeGasRevenue: false,
});

export const costProfileAtom = atom<CostProfileEntry[]>([]);

export const evaluationWindowAtom = atom<EvaluationWindow>({ firstYear: null, lastYear: null });
export const earlyValueConfigurationAtom = atom<EarlyValueConfiguration>({ enabled: false, endYear: null });

export const selectedMeasureAtom = atom<EconomicMeasure>(EconomicMeasure.DISCOUNTED_OIL_VOLUME);

export const distributionPlotTypeAtom = atom<DistributionPlotType>(DistributionPlotType.EXCEEDANCE);

export const showCashFlowPlotAtom = atom<boolean>(false);
export const cashFlowProfileTypeAtom = atom<CashFlowProfileType>(CashFlowProfileType.ANNUAL_NET_CASH_FLOW);

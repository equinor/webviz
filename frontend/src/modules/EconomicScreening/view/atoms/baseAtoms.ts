import { atom } from "jotai";

import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type {
    CostProfileEntry,
    EarlyValueConfiguration,
    EconomicAssumptions,
    PriceAssumptions,
} from "@modules/EconomicScreening/typesAndEnums";
import {
    DEFAULT_DISCOUNT_RATE_PERCENT,
    CashFlowProfileType,
    Currency,
    DistributionPlotType,
    EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";
import type { SalesGasStrategy } from "@modules/EconomicScreening/utils/vectorResolution";

export const ensembleIdentAtom = atom<RegularEnsembleIdent | DeltaEnsembleIdent | null>(null);

export const hasOilProductionVectorAtom = atom<boolean>(false);
export const salesGasStrategyAtom = atom<SalesGasStrategy>({ kind: "UNAVAILABLE" });

export const economicAssumptionsAtom = atom<EconomicAssumptions>({
    discountRatePercent: DEFAULT_DISCOUNT_RATE_PERCENT,
    predictionStartYear: null,
});

export const priceAssumptionsAtom = atom<PriceAssumptions>({
    currency: Currency.USD,
    oilPrice: null,
    oilPriceBasis: OilPriceBasis.PER_BBL,
    gasPrice: null,
    gasPriceBasis: GasPriceBasis.PER_SM3,
});

export const costProfileAtom = atom<CostProfileEntry[]>([]);
export const isCostProfileDraftValidAtom = atom<boolean>(true);

export const earlyValueConfigurationAtom = atom<EarlyValueConfiguration>({ enabled: false, endYear: null });

export const selectedMeasureAtom = atom<EconomicMeasure>(EconomicMeasure.DISCOUNTED_OIL_VOLUME);

export const distributionPlotTypeAtom = atom<DistributionPlotType>(DistributionPlotType.EXCEEDANCE);

export const showCashFlowPlotAtom = atom<boolean>(false);
export const cashFlowProfileTypeAtom = atom<CashFlowProfileType>(CashFlowProfileType.ANNUAL_OIL_VOLUME);

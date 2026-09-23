import { atom } from "jotai";

import type { CostProfileEntry, EarlyValueConfiguration, SourceHorizon } from "@modules/EconomicScreening/typesAndEnums";
import {
    DEFAULT_DISCOUNT_RATE_PERCENT,
    CashFlowProfileType,
    Currency,
    DistributionPlotType,
    EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";
import type { MissingComponentAssumptions } from "@modules/EconomicScreening/utils/vectorResolution";

export const discountRatePercentAtom = atom<number>(DEFAULT_DISCOUNT_RATE_PERCENT);
export const predictionStartYearAtom = atom<number | null>(null);

export const currencyAtom = atom<Currency>(Currency.USD);
export const oilPriceAtom = atom<number | null>(null);
export const oilPriceBasisAtom = atom<OilPriceBasis>(OilPriceBasis.PER_BBL);
export const gasPriceAtom = atom<number | null>(null);
export const gasPriceBasisAtom = atom<GasPriceBasis>(GasPriceBasis.PER_SM3);

export const costProfileAtom = atom<CostProfileEntry[]>([]);
export const isCostProfileDraftValidAtom = atom<boolean>(true);

export const earlyValueConfigurationAtom = atom<EarlyValueConfiguration>({ enabled: false, endYear: null });

export const selectedMeasureAtom = atom<EconomicMeasure>(EconomicMeasure.DISCOUNTED_OIL_VOLUME);
export const distributionPlotTypeAtom = atom<DistributionPlotType>(DistributionPlotType.EXCEEDANCE);
export const showCashFlowPlotAtom = atom<boolean>(false);
export const cashFlowProfileTypeAtom = atom<CashFlowProfileType>(CashFlowProfileType.ANNUAL_OIL_VOLUME);

/** Explicit zero assumptions, keyed by the ensemble identity they apply to. */
export const missingComponentAssumptionsAtom = atom<Record<string, MissingComponentAssumptions>>({});

/** Source envelope received from the view, used to generate cost years. */
export const sourceHorizonAtom = atom<SourceHorizon>({ endYear: null, isLoading: false });

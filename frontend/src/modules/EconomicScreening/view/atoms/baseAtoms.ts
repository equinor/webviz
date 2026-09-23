import { atom } from "jotai";

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
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";
import { EMPTY_SOURCE_SNAPSHOT, type EconomicSourceSnapshot } from "@modules/EconomicScreening/utils/sourceSnapshot";

/** Read-only mirrors of the settings-to-view interface, written only by the interface effects. */
export const sourceSnapshotAtom = atom<EconomicSourceSnapshot>(EMPTY_SOURCE_SNAPSHOT);
export const realizationNumbersAtom = atom<number[] | null>(null);
export const constituentGasConsumptionWarningAtom = atom<string | null>(null);

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

export const resultModeAtom = atom<ResultMode>(ResultMode.DISTRIBUTION);
export const selectedMeasureAtom = atom<EconomicMeasure>(EconomicMeasure.DISCOUNTED_OIL_VOLUME);
export const distributionPlotTypeAtom = atom<DistributionPlotType>(DistributionPlotType.EXCEEDANCE);
export const cashFlowProfileTypeAtom = atom<CashFlowProfileType>(CashFlowProfileType.ANNUAL_OIL_VOLUME);
export const selectedRealizationAtom = atom<number | null>(null);

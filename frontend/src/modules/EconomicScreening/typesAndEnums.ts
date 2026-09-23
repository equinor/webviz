export enum EconomicMeasure {
    NPV = "NPV",
    IRR = "IRR",
    BREAK_EVEN_OIL_PRICE = "BREAK_EVEN_OIL_PRICE",
    DISCOUNTED_OIL_VOLUME = "DISCOUNTED_OIL_VOLUME",
    DISCOUNTED_SALES_GAS_VOLUME = "DISCOUNTED_SALES_GAS_VOLUME",
    DISCOUNTED_OIL_EQUIVALENTS = "DISCOUNTED_OIL_EQUIVALENTS",
    UNDISCOUNTED_OIL_VOLUME = "UNDISCOUNTED_OIL_VOLUME",
    UNDISCOUNTED_SALES_GAS_VOLUME = "UNDISCOUNTED_SALES_GAS_VOLUME",
}

export const EconomicMeasureEnumToStringMapping: Record<EconomicMeasure, string> = {
    [EconomicMeasure.NPV]: "Net present value",
    [EconomicMeasure.IRR]: "Internal rate of return",
    [EconomicMeasure.BREAK_EVEN_OIL_PRICE]: "Break-even oil price",
    [EconomicMeasure.DISCOUNTED_OIL_VOLUME]: "Discounted oil volume",
    [EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME]: "Discounted sales gas volume",
    [EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS]: "Discounted oil equivalents",
    [EconomicMeasure.UNDISCOUNTED_OIL_VOLUME]: "Oil volume (undiscounted)",
    [EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME]: "Sales gas volume (undiscounted)",
};

export enum EarlyEconomicMeasure {
    DISCOUNTED_OIL_VOLUME = "EARLY_DISCOUNTED_OIL_VOLUME",
    DISCOUNTED_SALES_GAS_VOLUME = "EARLY_DISCOUNTED_SALES_GAS_VOLUME",
    DISCOUNTED_CASH_FLOW = "EARLY_DISCOUNTED_CASH_FLOW",
}

export const EarlyEconomicMeasureEnumToStringMapping: Record<EarlyEconomicMeasure, string> = {
    [EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME]: "Early discounted oil volume",
    [EarlyEconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME]: "Early discounted sales gas volume",
    [EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW]: "Early discounted cash flow",
};

export enum BreakEvenSlopeDirection {
    POSITIVE = "POSITIVE",
    NEGATIVE = "NEGATIVE",
}

export enum IrrStatus {
    CONVERGED = "CONVERGED",
    NO_FINITE_ROOT = "NO_FINITE_ROOT",
    NON_CONVENTIONAL = "NON_CONVENTIONAL",
    OUT_OF_DOMAIN = "OUT_OF_DOMAIN",
}

export enum Currency {
    NOK = "NOK",
    USD = "USD",
}

export enum OilPriceBasis {
    PER_SM3 = "PER_SM3",
    PER_BBL = "PER_BBL",
}

export const OilPriceBasisEnumToStringMapping: Record<OilPriceBasis, string> = {
    [OilPriceBasis.PER_SM3]: "per Sm³",
    [OilPriceBasis.PER_BBL]: "per bbl",
};

export enum GasPriceBasis {
    PER_SM3 = "PER_SM3",
    PER_MSCF = "PER_MSCF",
}

export const GasPriceBasisEnumToStringMapping: Record<GasPriceBasis, string> = {
    [GasPriceBasis.PER_SM3]: "per Sm³",
    [GasPriceBasis.PER_MSCF]: "per Mscf",
};

export enum DistributionPlotType {
    EXCEEDANCE = "EXCEEDANCE",
    HISTOGRAM = "HISTOGRAM",
    BOX = "BOX",
}

export const DistributionPlotTypeEnumToStringMapping: Record<DistributionPlotType, string> = {
    [DistributionPlotType.EXCEEDANCE]: "Exceedance",
    [DistributionPlotType.HISTOGRAM]: "Histogram",
    [DistributionPlotType.BOX]: "Box plot",
};

export enum CashFlowProfileType {
    ANNUAL_OIL_VOLUME = "ANNUAL_OIL_VOLUME",
    ANNUAL_SALES_GAS_VOLUME = "ANNUAL_SALES_GAS_VOLUME",
    ANNUAL_NET_CASH_FLOW = "ANNUAL_NET_CASH_FLOW",
    CUMULATIVE_DISCOUNTED_CASH_FLOW = "CUMULATIVE_DISCOUNTED_CASH_FLOW",
}

export const CashFlowProfileTypeEnumToStringMapping: Record<CashFlowProfileType, string> = {
    [CashFlowProfileType.ANNUAL_OIL_VOLUME]: "Annual oil volume",
    [CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME]: "Annual sales gas volume",
    [CashFlowProfileType.ANNUAL_NET_CASH_FLOW]: "Annual net cash flow",
    [CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW]: "Cumulative discounted cash flow",
};

export enum ResultMode {
    DISTRIBUTION = "DISTRIBUTION",
    TIME_PROFILE = "TIME_PROFILE",
    ALL_RESULTS = "ALL_RESULTS",
}

export const ResultModeEnumToStringMapping: Record<ResultMode, string> = {
    [ResultMode.DISTRIBUTION]: "Distribution",
    [ResultMode.TIME_PROFILE]: "Time profile",
    [ResultMode.ALL_RESULTS]: "All results",
};

/** A displayed realization, tied to the ensemble it was chosen in. Null realization means Aggregate. */
export type RealizationSelection = {
    ensembleIdentString: string | null;
    realization: number | null;
};

/** Yearly CAPEX/OPEX. For a delta ensemble the values are interpreted as delta costs. */
export type CostProfileEntry = {
    year: number;
    capex: number;
    opex: number;
};

export type PriceAssumptions = {
    currency: Currency;
    /** Null means unspecified. Zero intentionally omits oil revenue. */
    oilPrice: number | null;
    oilPriceBasis: OilPriceBasis;
    /** Null means unspecified. Zero intentionally omits gas revenue. */
    gasPrice: number | null;
    gasPriceBasis: GasPriceBasis;
};

export type EconomicAssumptions = {
    discountRatePercent: number;
    /** Valuation and evaluation both start on 1 January of this year. Null until entered. */
    predictionStartYear: number | null;
};

/** Last year of the full-ensemble source envelope, used to generate cost years. */
export type SourceHorizon = {
    endYear: number | null;
    isLoading: boolean;
};

export type EarlyValueConfiguration = {
    enabled: boolean;
    endYear: number | null;
};

export const DEFAULT_DISCOUNT_RATE_PERCENT = 8;

/** SODIR convention, fixed: 1000 Sm³ gas equals 1 Sm³ oil equivalent, applied after unit conversion. */
export const DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR = 1000;

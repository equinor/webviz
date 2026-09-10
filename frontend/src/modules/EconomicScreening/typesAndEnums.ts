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

export enum DiscountConvention {
    MID_YEAR = "MID_YEAR",
    YEAR_END = "YEAR_END",
}

export const DiscountConventionEnumToStringMapping: Record<DiscountConvention, string> = {
    [DiscountConvention.MID_YEAR]: "Mid-year",
    [DiscountConvention.YEAR_END]: "Year-end",
};

export enum InvestmentTiming {
    START_OF_YEAR = "START_OF_YEAR",
    FOLLOW_ANNUAL_TIMING = "FOLLOW_ANNUAL_TIMING",
}

export const InvestmentTimingEnumToStringMapping: Record<InvestmentTiming, string> = {
    [InvestmentTiming.START_OF_YEAR]: "Start of year",
    [InvestmentTiming.FOLLOW_ANNUAL_TIMING]: "Follow annual timing",
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
    HISTOGRAM = "HISTOGRAM",
    BOX = "BOX",
}

export const DistributionPlotTypeEnumToStringMapping: Record<DistributionPlotType, string> = {
    [DistributionPlotType.HISTOGRAM]: "Histogram",
    [DistributionPlotType.BOX]: "Box plot",
};

/** Yearly CAPEX/OPEX. For a delta ensemble the values are interpreted as delta costs. */
export type CostProfileEntry = {
    year: number;
    capex: number;
    opex: number;
};

export type PriceAssumptions = {
    currency: string;
    oilPrice: number | null;
    oilPriceBasis: OilPriceBasis;
    gasPrice: number | null;
    gasPriceBasis: GasPriceBasis;
};

export type DiscountAssumptions = {
    discountRatePercent: number;
    /** Null means "use the first year of the evaluation window". */
    baseYear: number | null;
    convention: DiscountConvention;
    investmentTiming?: InvestmentTiming;
    /** Volume of gas equivalent to one volume of oil, in the gas volume unit of the source data. */
    gasToOilEquivalentFactor: number;
};

export type EvaluationWindow = {
    firstYear: number | null;
    lastYear: number | null;
};

export type EarlyValueConfiguration = {
    enabled: boolean;
    endYear: number | null;
};

export const DEFAULT_DISCOUNT_RATE_PERCENT = 8;

/** NPD/NOD convention: 1000 Sm³ gas equals 1 Sm³ oil equivalent. */
export const DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR = 1000;

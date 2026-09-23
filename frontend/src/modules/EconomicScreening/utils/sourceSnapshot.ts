import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { MonthlyProductionProfile } from "./monthlyProduction";
import type { SalesGasStrategy } from "./vectorResolution";

export enum SourceStatus {
    NO_ENSEMBLE = "NO_ENSEMBLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    NO_SOURCES = "NO_SOURCES",
    READY = "READY",
}

export type RealizationProfiles = {
    realization: number;
    oilProfile: MonthlyProductionProfile | null;
    salesGasProfile: MonthlyProductionProfile | null;
};

export type SalesGasDiagnostics = {
    hasSeries: boolean;
    /** True when gas consumption is available but zero in every realization. */
    hasZeroGasConsumption: boolean;
    isGasConsumptionMissing: boolean;
    isGasInjectionMissing: boolean;
    isGasConsumptionAssumedZero: boolean;
    isGasInjectionAssumedZero: boolean;
    incompleteInjectionRealizations: number[];
    incompleteConsumptionRealizations: number[];
};

/**
 * Assumption-independent production source for one ensemble. Profiles and the envelope end are only
 * present when every required source request for this ensemble has succeeded.
 */
export type EconomicSourceSnapshot = {
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null;
    status: SourceStatus;
    isFetching: boolean;
    queryError: string | null;
    salesGasStrategy: SalesGasStrategy;
    oilUnit: string;
    gasUnit: string;
    hasOilSeries: boolean;
    salesGas: SalesGasDiagnostics;
    /** Every fetched realization of the full ensemble, sorted by realization number. */
    realizationProfiles: RealizationProfiles[];
    /** Last supported month over the full ensemble and every required product. */
    envelopeEndMonthIndex: number | null;
};

export const NO_SALES_GAS_DIAGNOSTICS: SalesGasDiagnostics = {
    hasSeries: false,
    hasZeroGasConsumption: false,
    isGasConsumptionMissing: true,
    isGasInjectionMissing: true,
    isGasConsumptionAssumedZero: false,
    isGasInjectionAssumedZero: false,
    incompleteInjectionRealizations: [],
    incompleteConsumptionRealizations: [],
};

export const EMPTY_SOURCE_SNAPSHOT: EconomicSourceSnapshot = {
    ensembleIdent: null,
    status: SourceStatus.NO_ENSEMBLE,
    isFetching: false,
    queryError: null,
    salesGasStrategy: { kind: "UNAVAILABLE" },
    oilUnit: "",
    gasUnit: "",
    hasOilSeries: false,
    salesGas: NO_SALES_GAS_DIAGNOSTICS,
    realizationProfiles: [],
    envelopeEndMonthIndex: null,
};

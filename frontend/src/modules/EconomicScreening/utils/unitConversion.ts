import type { GasPriceBasis, OilPriceBasis } from "@modules/EconomicScreening/typesAndEnums";

const SM3_PER_STB = 0.158987294928;
const SM3_PER_SCF = 0.028316846592;
const SM3_PER_MSCF = 1000 * SM3_PER_SCF;

/** Size of one unit expressed in Sm³. */
const VOLUME_UNIT_IN_SM3: Record<string, number> = {
    SM3: 1,
    "SM³": 1,
    M3: 1,
    STB: SM3_PER_STB,
    BBL: SM3_PER_STB,
    RB: SM3_PER_STB,
    SCF: SM3_PER_SCF,
    MSCF: SM3_PER_MSCF,
    MMSCF: 1000 * SM3_PER_MSCF,
    KSM3: 1000,
    MSM3: 1e6,
};

const OIL_PRICE_BASIS_IN_SM3: Record<OilPriceBasis, number> = {
    PER_SM3: 1,
    PER_BBL: SM3_PER_STB,
};

const GAS_PRICE_BASIS_IN_SM3: Record<GasPriceBasis, number> = {
    PER_SM3: 1,
    PER_MSCF: SM3_PER_MSCF,
};

export function normalizeVolumeUnit(rawUnit: string): string {
    return rawUnit.trim().toUpperCase();
}

/**
 * Returns the size of one simulator volume unit in Sm³, or null when the unit is not recognised.
 */
export function volumeUnitInSm3(rawUnit: string): number | null {
    return VOLUME_UNIT_IN_SM3[normalizeVolumeUnit(rawUnit)] ?? null;
}

/**
 * Rescales a price given per `basis` into a price per unit of the simulator volume unit.
 */
export function convertOilPriceToSimulatorUnit(
    price: number,
    basis: OilPriceBasis,
    simulatorUnit: string,
): number | null {
    const simulatorUnitInSm3 = volumeUnitInSm3(simulatorUnit);
    if (simulatorUnitInSm3 === null) {
        return null;
    }
    return (price * simulatorUnitInSm3) / OIL_PRICE_BASIS_IN_SM3[basis];
}

export function convertGasPriceToSimulatorUnit(
    price: number,
    basis: GasPriceBasis,
    simulatorUnit: string,
): number | null {
    const simulatorUnitInSm3 = volumeUnitInSm3(simulatorUnit);
    if (simulatorUnitInSm3 === null) {
        return null;
    }
    return (price * simulatorUnitInSm3) / GAS_PRICE_BASIS_IN_SM3[basis];
}

/**
 * Translates "f Sm³ gas per Sm³ oil" into the divisor to apply to raw gas volumes so that the
 * result is an oil equivalent expressed in the oil vector's own unit.
 */
export function convertGasToOilEquivalentFactorToSimulatorUnit(
    factorSm3GasPerSm3Oil: number,
    oilSimulatorUnit: string,
    gasSimulatorUnit: string,
): number | null {
    const oilUnitInSm3 = volumeUnitInSm3(oilSimulatorUnit);
    const gasUnitInSm3 = volumeUnitInSm3(gasSimulatorUnit);
    if (oilUnitInSm3 === null || gasUnitInSm3 === null) {
        return null;
    }
    return (factorSm3GasPerSm3Oil * oilUnitInSm3) / gasUnitInSm3;
}

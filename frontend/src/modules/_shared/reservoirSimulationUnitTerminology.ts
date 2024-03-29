export type UnitSet = {
    [unit: string]: string;
};

export type ReservoirSimulationUnitTerminologyType = {
    [unitSystem: string]: UnitSet;
};

/**
 * Currently only valid option is the default "METRIC" (defined as in Eclipse E100)
 */
export const reservoirSimulationUnitTerminology: ReservoirSimulationUnitTerminologyType = {
    METRIC: {
        M: "m",
        M3: "m³",
        SECONDS: "seconds",
        DAYS: "days",
        YEARS: "years",
        "KG/M3": "kg/m³",
        BARSA: "bara",
        bars: "bar",
        K: "K",
        C: "\u00B0C",
        CP: "cP",
        MD: "mD",
        SM3: "Sm³",
        RM3: "Rm³",
        "SM3/DAY": "Sm³/day",
        "RM3/DAY": "Rm³/day",
        "CPR3/DAY/BARS": "Rm³\u00D7cP/day/bar",
        MDM: "mD\u00D7m",
        KG: "kg",
        "KG/DAY": "kg/day",
        "SM3/SM3": "Sm³/Sm³",
        "RM3/SM3": "Rm³/Sm³",
        "SM3/RM3": "Sm³/Rm³",
        "SM3/DAY/BARS": "Sm³/day/bar",
        "SM3/D/B": "Sm³/day/bar",
        KJ: "kJ",
        "KJ/DAY": "kJ/day",
        "SEC/D": "seconds/day",
    },
};

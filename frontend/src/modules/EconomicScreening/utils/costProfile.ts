import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";

export function validateCostProfile(costProfile: CostProfileEntry[], isDelta: boolean): string | null {
    const years = new Set<number>();
    for (const entry of costProfile) {
        if (years.has(entry.year)) {
            return "Each calendar year can appear only once.";
        }
        years.add(entry.year);
        if (!isDelta && (entry.capex < 0 || entry.opex < 0)) {
            return "Investment and operating costs must be zero or greater.";
        }
    }
    return null;
}

export function parseCostProfilePaste(text: string): { entries: CostProfileEntry[] } | { error: string } {
    const rows = text.replaceAll("\r", "").split("\n").filter(Boolean);
    const entries: CostProfileEntry[] = [];

    for (const row of rows) {
        const values = row.split("\t");
        if (values.length !== 3) {
            return { error: "Paste year, investment, and operating cost values in three tab-separated columns." };
        }

        const [yearText, capexText, opexText] = values;
        const year = Number(yearText);
        const capex = capexText.trim() === "" ? 0 : Number(capexText);
        const opex = opexText.trim() === "" ? 0 : Number(opexText);
        if (yearText.trim() === "" || !Number.isInteger(year) || !Number.isFinite(capex) || !Number.isFinite(opex)) {
            return { error: "Each pasted row needs a calendar year and numeric costs." };
        }
        entries.push({ year, capex, opex });
    }

    return { entries };
}

/** Pasted rows must name distinct generated years; their order does not matter. */
export function validatePastedCostYears(
    entries: CostProfileEntry[],
    startYear: number,
    endYear: number,
): string | null {
    const years = new Set<number>();
    for (const entry of entries) {
        if (entry.year < startYear || entry.year > endYear) {
            return `Pasted year ${entry.year} is outside the cost years ${startYear}-${endYear}.`;
        }
        if (years.has(entry.year)) {
            return `Pasted year ${entry.year} appears more than once.`;
        }
        years.add(entry.year);
    }
    return null;
}

/** Replaces the entry for a year; an all-zero entry is removed since blank cost cells mean zero. */
export function setCostEntry(costProfile: CostProfileEntry[], entry: CostProfileEntry): CostProfileEntry[] {
    const others = costProfile.filter((existing) => existing.year !== entry.year);
    const updated = entry.capex === 0 && entry.opex === 0 ? others : [...others, entry];
    return updated.sort((first, second) => first.year - second.year);
}

/** Stored entries with a non-zero cost outside the generated years. They are kept, but not used. */
export function getCostYearsOutsideRange(
    costProfile: CostProfileEntry[],
    startYear: number | null,
    endYear: number | null,
): number[] {
    return costProfile
        .filter((entry) => entry.capex !== 0 || entry.opex !== 0)
        .filter((entry) => startYear === null || endYear === null || entry.year < startYear || entry.year > endYear)
        .map((entry) => entry.year)
        .sort((first, second) => first - second);
}

/** Individual included entries decide; signed entries that cancel are still non-zero costs. */
export function hasIncludedNonZeroCost(costProfile: CostProfileEntry[], startYear: number, endYear: number): boolean {
    return costProfile.some(
        (entry) => entry.year >= startYear && entry.year <= endYear && (entry.capex !== 0 || entry.opex !== 0),
    );
}

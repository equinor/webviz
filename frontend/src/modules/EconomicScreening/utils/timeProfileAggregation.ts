import { computeQuantile } from "@modules/_shared/utils/math/statistics";

export type CashFlowProfile = {
    realization: number;
    years: number[];
    netCashFlow: number[] | null;
    cumulativeDiscountedCashFlow: number[] | null;
};

type ProfileBand = {
    median: number[];
    p90: number[];
    p10: number[];
};

export type CashFlowProfileAggregate = {
    realizations: number[];
    years: number[];
    annualNetCashFlow: ProfileBand;
    cumulativeDiscountedCashFlow: ProfileBand;
};

export type AnnualVolumeProfile = {
    realization: number;
    years: number[];
    values: number[];
    hasData: boolean;
};

export type AnnualVolumeProfileAggregate = ProfileBand & {
    realizations: number[];
    years: number[];
};

function makeBand(valuesByYear: number[][]): ProfileBand {
    return {
        median: valuesByYear.map((values) => computeQuantile(values, 0.5)),
        p90: valuesByYear.map((values) => computeQuantile(values, 0.1)),
        p10: valuesByYear.map((values) => computeQuantile(values, 0.9)),
    };
}

export function aggregateCashFlowProfiles(profiles: CashFlowProfile[]): CashFlowProfileAggregate | null {
    const completeProfiles = profiles.filter(
        (profile) =>
            profile.netCashFlow !== null &&
            profile.cumulativeDiscountedCashFlow !== null &&
            profile.years.length === profile.netCashFlow.length &&
            profile.years.length === profile.cumulativeDiscountedCashFlow.length,
    );
    if (completeProfiles.length === 0) {
        return null;
    }

    const years = [...new Set(completeProfiles.flatMap((profile) => profile.years))].sort(
        (left, right) => left - right,
    );
    const eligibleProfiles = completeProfiles.filter((profile) => {
        const profileYears = new Set(profile.years);
        return years.every((year) => profileYears.has(year));
    });
    if (eligibleProfiles.length === 0) {
        return null;
    }
    const annualValues = years.map((year) =>
        eligibleProfiles.map((profile) => profile.netCashFlow![profile.years.indexOf(year)]),
    );
    const cumulativeValues = years.map((year) =>
        eligibleProfiles.map((profile) => profile.cumulativeDiscountedCashFlow![profile.years.indexOf(year)]),
    );

    return {
        realizations: eligibleProfiles.map((profile) => profile.realization),
        years,
        annualNetCashFlow: makeBand(annualValues),
        cumulativeDiscountedCashFlow: makeBand(cumulativeValues),
    };
}

export function aggregateAnnualVolumeProfiles(profiles: AnnualVolumeProfile[]): AnnualVolumeProfileAggregate | null {
    const completeProfiles = profiles.filter(
        (profile) => profile.hasData && profile.years.length === profile.values.length,
    );
    if (completeProfiles.length === 0) {
        return null;
    }

    const years = [...new Set(completeProfiles.flatMap((profile) => profile.years))].sort(
        (left, right) => left - right,
    );
    const eligibleProfiles = completeProfiles.filter((profile) => {
        const profileYears = new Set(profile.years);
        return years.every((year) => profileYears.has(year));
    });
    if (eligibleProfiles.length === 0) {
        return null;
    }

    return {
        realizations: eligibleProfiles.map((profile) => profile.realization),
        years,
        ...makeBand(
            years.map((year) => eligibleProfiles.map((profile) => profile.values[profile.years.indexOf(year)])),
        ),
    };
}

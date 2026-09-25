import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import { computeDistributionSummary } from "@modules/EconomicScreening/utils/distributionAggregation";
import { getMeasureDisplayName, getMeasureDisplayScale } from "@modules/EconomicScreening/utils/measureAccessors";
import type { MonthlyRealizationEconomicResult } from "@modules/EconomicScreening/utils/monthlyEconomics";
import { monthIndexOf } from "@modules/EconomicScreening/utils/monthlyProduction";
import { formatMonthIndex } from "@modules/EconomicScreening/utils/setupReadiness";
import type { EvaluationHorizon } from "@modules/EconomicScreening/view/atoms/derivedAtoms";

export type EarlyValueComparisonProps = {
    results: MonthlyRealizationEconomicResult[];
    horizon: EvaluationHorizon;
    endYear: number;
    currency: string;
    /** Null shows the aggregate. */
    selectedRealization: number | null;
    isDelta: boolean;
};

type KeyedValue = { realization: number; value: number };

function finiteValues(
    results: MonthlyRealizationEconomicResult[],
    valueOf: (result: MonthlyRealizationEconomicResult) => number | null,
): KeyedValue[] {
    return results.flatMap((result) => {
        const value = valueOf(result);
        return value !== null && Number.isFinite(value) ? [{ realization: result.realization, value }] : [];
    });
}

/** Read-only comparison of the already computed early and full results; nothing is recalculated here. */
export function EarlyValueComparison(props: EarlyValueComparisonProps): React.ReactNode {
    const { horizon, endYear } = props;
    const earlyValues = finiteValues(props.results, (result) =>
        result.early && result.early.endYear === endYear ? result.early.npv : null,
    );
    const fullValues = finiteValues(props.results, (result) => result.npv);
    const scale = getMeasureDisplayScale(
        EconomicMeasure.NPV,
        [...earlyValues, ...fullValues].map((entry) => entry.value),
        props.currency,
    );
    const format = (value: number) => formatNumber(value / scale.factor, { numSignificantDigits: 6 });

    const earlyEndMonthIndex = Math.min(monthIndexOf(endYear, 12), horizon.endMonthIndex);
    const periodStart = `Jan ${horizon.startYear}`;
    const rows = [
        {
            key: "early",
            label: props.isDelta ? "Incremental early discounted cash flow" : "Early discounted cash flow",
            period: `${periodStart}-${formatMonthIndex(earlyEndMonthIndex)}`,
            values: earlyValues,
        },
        {
            key: "full",
            label: getMeasureDisplayName(EconomicMeasure.NPV, props.isDelta),
            period: `${periodStart}-${formatMonthIndex(horizon.endMonthIndex)}`,
            values: fullValues,
        },
    ];
    const isAggregate = props.selectedRealization === null;
    const valueHeader = isAggregate ? "P50" : `Realization ${props.selectedRealization}`;
    const cellClassName = "px-2xs py-3xs border-neutral-subtle border-b text-left align-top break-words";

    return (
        <section aria-label="Early value comparison" className="gap-y-3xs flex flex-col">
            <span className="text-body-xs text-subtle">
                Early value through {endYear} | Valuation 1 January {horizon.startYear} | Currency {props.currency}
            </span>
            {/* A wrapping table, so narrow views keep every value visible instead of scrolling it away. */}
            <table className="text-body-xs w-full table-fixed border-collapse">
                <thead>
                    <tr>
                        <th className={cellClassName}>Result</th>
                        <th className={cellClassName}>Period</th>
                        <th className={cellClassName}>
                            {valueHeader} [{scale.unit}]
                        </th>
                        {isAggregate && (
                            <th className={cellClassName} title="Valid realizations / selected realizations">
                                Valid / selected
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const summary = isAggregate
                            ? computeDistributionSummary(row.values.map((entry) => entry.value))
                            : null;
                        const selectedValue = isAggregate
                            ? undefined
                            : row.values.find((entry) => entry.realization === props.selectedRealization)?.value;
                        const value = isAggregate ? summary?.median : selectedValue;
                        return (
                            <tr key={row.key}>
                                <td className={cellClassName}>{row.label}</td>
                                <td className={cellClassName}>{row.period}</td>
                                <td className={`${cellClassName} tabular-nums`}>
                                    {value === undefined ? (
                                        <span className="font-light">Unavailable</span>
                                    ) : (
                                        format(value)
                                    )}
                                </td>
                                {isAggregate && (
                                    <td className={cellClassName}>
                                        {row.values.length}/{props.results.length}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {isAggregate && (
                <span className="text-body-xs text-subtle">
                    Each P50 is taken over its own valid realizations, so the two values need not come from the same
                    realization.
                </span>
            )}
        </section>
    );
}

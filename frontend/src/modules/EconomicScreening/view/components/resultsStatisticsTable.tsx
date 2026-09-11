import { Table } from "@lib/components/Table";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import type { BreakEvenTargetCount } from "@modules/EconomicScreening/utils/distributionAggregation";
import { computeDistributionSummary, countValuesAboveThreshold } from "@modules/EconomicScreening/utils/distributionAggregation";
import type { RealizationEconomicResult } from "@modules/EconomicScreening/utils/economicCalculations";
import type { MeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";
import {
    getMeasureDisplayName,
    getMeasureDisplayScale,
    getMeasureUnavailableReason,
} from "@modules/EconomicScreening/utils/measureAccessors";

export type ResultsStatisticsTableProps = {
    measure: EconomicMeasure;
    measureValues: MeasureValues;
    results: RealizationEconomicResult[];
    unit: string;
    breakEvenTargetCount: BreakEvenTargetCount | null;
    isDelta: boolean;
};

function formatStatistic(value: number, scaleFactor: number): string {
    return formatNumber(value / scaleFactor, { numSignificantDigits: 4 });
}

export function ResultsStatisticsTable(props: ResultsStatisticsTableProps): React.ReactNode {
    const summary = computeDistributionSummary(props.measureValues.values);
    const positiveNpvCount =
        props.measure === EconomicMeasure.NPV ? countValuesAboveThreshold(props.measureValues.values, 0) : null;
    const displayScale = getMeasureDisplayScale(props.measure, props.measureValues.values, props.unit);

    return (
        <div className="gap-y-2xs flex flex-col">
            <Table.Root size="small" compact>
                <Table.Head>
                    <Table.Row>
                        <Table.Cell colKey="measure">Measure</Table.Cell>
                        <Table.Cell colKey="unit">Unit</Table.Cell>
                        <Table.Cell colKey="mean">Mean</Table.Cell>
                        <Table.Cell colKey="p90" title="P90: 90% of valid realizations exceed this value.">
                            P90
                        </Table.Cell>
                        <Table.Cell colKey="p50">P50</Table.Cell>
                        <Table.Cell colKey="p10" title="P10: 10% of valid realizations exceed this value.">
                            P10
                        </Table.Cell>
                        <Table.Cell colKey="count" title="Valid realizations / selected realizations">
                            Valid / selected
                        </Table.Cell>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    <Table.Row>
                        <Table.Cell>{getMeasureDisplayName(props.measure, props.isDelta)}</Table.Cell>
                        <Table.Cell>{displayScale.unit}</Table.Cell>
                        {summary ? (
                            <>
                                <Table.Cell>{formatStatistic(summary.mean, displayScale.factor)}</Table.Cell>
                                <Table.Cell>{formatStatistic(summary.p90, displayScale.factor)}</Table.Cell>
                                <Table.Cell>{formatStatistic(summary.median, displayScale.factor)}</Table.Cell>
                                <Table.Cell>{formatStatistic(summary.p10, displayScale.factor)}</Table.Cell>
                                <Table.Cell title={`${summary.count} valid of ${props.results.length} selected realizations`}>
                                    {summary.count}/{props.results.length}
                                </Table.Cell>
                            </>
                        ) : (
                            <Table.Cell colSpan={5}>
                                <span className="font-light">{getMeasureUnavailableReason(props.results, props.measure)}</span>
                            </Table.Cell>
                        )}
                    </Table.Row>
                </Table.Body>
            </Table.Root>
            {positiveNpvCount && (
                <span
                    className="text-body-xs text-subtle"
                    title="Fraction of valid realizations with NPV strictly above zero; this is not a probability of commercial success."
                >
                    Positive NPV: {positiveNpvCount.countAbove}/{positiveNpvCount.validCount}
                </span>
            )}
            {props.measure === EconomicMeasure.BREAK_EVEN_OIL_PRICE && props.breakEvenTargetCount && (
                <span className="text-body-xs text-subtle">
                    Positive NPV at target price: {props.breakEvenTargetCount.positiveCount}/
                    {props.breakEvenTargetCount.validCount}
                </span>
            )}
        </div>
    );
}

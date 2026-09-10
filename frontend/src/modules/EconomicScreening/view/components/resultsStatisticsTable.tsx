import { Table } from "@lib/components/Table";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import type { BreakEvenTargetCount } from "@modules/EconomicScreening/utils/distributionAggregation";
import { computeDistributionSummary, countValuesAboveThreshold } from "@modules/EconomicScreening/utils/distributionAggregation";
import type { RealizationEconomicResult } from "@modules/EconomicScreening/utils/economicCalculations";
import type { MeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";
import { getMeasureDisplayName, getMeasureUnavailableReason } from "@modules/EconomicScreening/utils/measureAccessors";

export type ResultsStatisticsTableProps = {
    measure: EconomicMeasure;
    measureValues: MeasureValues;
    results: RealizationEconomicResult[];
    unit: string;
    breakEvenTargetCount: BreakEvenTargetCount | null;
};

function formatStatistic(value: number): string {
    return formatNumber(value, { numSignificantDigits: 4 });
}

export function ResultsStatisticsTable(props: ResultsStatisticsTableProps): React.ReactNode {
    const summary = computeDistributionSummary(props.measureValues.values);
    const positiveNpvCount =
        props.measure === EconomicMeasure.NPV ? countValuesAboveThreshold(props.measureValues.values, 0) : null;

    return (
        <div className="gap-y-2xs flex flex-col">
            <Table.Root size="small" compact>
                <Table.Head>
                    <Table.Row>
                        <Table.Cell colKey="measure">Measure</Table.Cell>
                        <Table.Cell colKey="unit">Unit</Table.Cell>
                        <Table.Cell colKey="mean">Mean</Table.Cell>
                        <Table.Cell colKey="p90">P90</Table.Cell>
                        <Table.Cell colKey="p50">P50</Table.Cell>
                        <Table.Cell colKey="p10">P10</Table.Cell>
                        <Table.Cell colKey="count">Realizations</Table.Cell>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    <Table.Row>
                        <Table.Cell>{getMeasureDisplayName(props.measure)}</Table.Cell>
                        <Table.Cell>{props.unit}</Table.Cell>
                        {summary ? (
                            <>
                                <Table.Cell>{formatStatistic(summary.mean)}</Table.Cell>
                                <Table.Cell>{formatStatistic(summary.p90)}</Table.Cell>
                                <Table.Cell>{formatStatistic(summary.median)}</Table.Cell>
                                <Table.Cell>{formatStatistic(summary.p10)}</Table.Cell>
                                <Table.Cell>{summary.count}</Table.Cell>
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
                <span className="text-body-xs text-subtle">
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

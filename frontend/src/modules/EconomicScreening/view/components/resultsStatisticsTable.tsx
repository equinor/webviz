import { Table } from "@lib/components/Table";
import { computeQuantile } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import type { RealizationEconomicResult } from "@modules/EconomicScreening/utils/economicCalculations";
import type { MeasureUnitContext } from "@modules/EconomicScreening/utils/measureAccessors";
import {
    getMeasureDisplayName,
    getMeasureUnit,
    getMeasureValues,
} from "@modules/EconomicScreening/utils/measureAccessors";

export type ResultsStatisticsTableProps = {
    results: RealizationEconomicResult[];
    unitContext: MeasureUnitContext;
};

function formatStatistic(value: number): string {
    return formatNumber(value, { numSignificantDigits: 4 });
}

export function ResultsStatisticsTable(props: ResultsStatisticsTableProps): React.ReactNode {
    return (
        <Table.Root size="small" compact>
            <Table.Head>
                <Table.Row>
                    <Table.Cell colKey="measure">Measure</Table.Cell>
                    <Table.Cell colKey="unit">Unit</Table.Cell>
                    <Table.Cell colKey="mean">Mean</Table.Cell>
                    <Table.Cell colKey="p90">P90</Table.Cell>
                    <Table.Cell colKey="p50">P50</Table.Cell>
                    <Table.Cell colKey="p10">P10</Table.Cell>
                    <Table.Cell colKey="min">Min</Table.Cell>
                    <Table.Cell colKey="max">Max</Table.Cell>
                    <Table.Cell colKey="count">Realizations</Table.Cell>
                </Table.Row>
            </Table.Head>
            <Table.Body>
                {Object.values(EconomicMeasure).map((measure) => {
                    const { values } = getMeasureValues(props.results, measure);
                    const unit = getMeasureUnit(measure, props.unitContext);

                    if (values.length === 0) {
                        return (
                            <Table.Row key={measure}>
                                <Table.Cell>{getMeasureDisplayName(measure)}</Table.Cell>
                                <Table.Cell>{unit}</Table.Cell>
                                <Table.Cell colSpan={7}>
                                    <span className="font-light">Not available</span>
                                </Table.Cell>
                            </Table.Row>
                        );
                    }

                    const mean = values.reduce((acc, value) => acc + value, 0) / values.length;

                    return (
                        <Table.Row key={measure}>
                            <Table.Cell>{getMeasureDisplayName(measure)}</Table.Cell>
                            <Table.Cell>{unit}</Table.Cell>
                            <Table.Cell>{formatStatistic(mean)}</Table.Cell>
                            <Table.Cell>{formatStatistic(computeQuantile(values, 0.1))}</Table.Cell>
                            <Table.Cell>{formatStatistic(computeQuantile(values, 0.5))}</Table.Cell>
                            <Table.Cell>{formatStatistic(computeQuantile(values, 0.9))}</Table.Cell>
                            <Table.Cell>{formatStatistic(Math.min(...values))}</Table.Cell>
                            <Table.Cell>{formatStatistic(Math.max(...values))}</Table.Cell>
                            <Table.Cell>{values.length}</Table.Cell>
                        </Table.Row>
                    );
                })}
            </Table.Body>
        </Table.Root>
    );
}

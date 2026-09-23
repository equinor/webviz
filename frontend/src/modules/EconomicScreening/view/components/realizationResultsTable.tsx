import { Table } from "@lib/components/Table";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import type { MeasureUnitContext } from "@modules/EconomicScreening/utils/measureAccessors";
import {
    getMeasureDisplayName,
    getMeasureDisplayScale,
    getMeasureUnit,
    getMeasureValues,
} from "@modules/EconomicScreening/utils/measureAccessors";
import type { MonthlyRealizationEconomicResult } from "@modules/EconomicScreening/utils/monthlyEconomics";

export type RealizationResultsTableProps = {
    results: MonthlyRealizationEconomicResult[];
    unitContext: MeasureUnitContext;
    selectedRealization: number | null;
    isDelta: boolean;
};

function formatValue(value: number | undefined, scaleFactor: number): string {
    return value === undefined ? "Unavailable" : formatNumber(value / scaleFactor, { numSignificantDigits: 4 });
}

export function RealizationResultsTable(props: RealizationResultsTableProps): React.ReactNode {
    const valuesByMeasure = new Map(
        Object.values(EconomicMeasure).map((measure) => [
            measure,
            new Map(
                getMeasureValues(props.results, measure, props.unitContext).realizations.map((realization, index) => [
                    realization,
                    getMeasureValues(props.results, measure, props.unitContext).values[index],
                ]),
            ),
        ]),
    );
    const displayScaleByMeasure = new Map(
        Object.values(EconomicMeasure).map((measure) => {
            const measureValues = getMeasureValues(props.results, measure, props.unitContext).values;
            return [
                measure,
                getMeasureDisplayScale(measure, measureValues, getMeasureUnit(measure, props.unitContext)),
            ];
        }),
    );

    return (
        <div className="h-full overflow-x-auto">
            <Table.Root
                size="small"
                compact
                maxHeight="100%"
                rowSelection={props.selectedRealization?.toString() ?? null}
            >
                <Table.Head>
                    <Table.Row>
                        <Table.Cell colKey="realization">Realization</Table.Cell>
                        {Object.values(EconomicMeasure).map((measure) => (
                            <Table.Cell key={measure} colKey={measure}>
                                {getMeasureDisplayName(measure, props.isDelta)} [
                                {displayScaleByMeasure.get(measure)?.unit ?? getMeasureUnit(measure, props.unitContext)}
                                ]
                            </Table.Cell>
                        ))}
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {props.results.map((result) => {
                        const isSelected = result.realization === props.selectedRealization;
                        // Only the Settings-selected row is marked selectable, so it is highlighted but clicks change nothing.
                        return (
                            <Table.Row
                                key={result.realization}
                                rowKey={result.realization.toString()}
                                selectable={isSelected}
                                aria-current={isSelected ? "true" : undefined}
                            >
                                <Table.Cell>{result.realization}</Table.Cell>
                                {Object.values(EconomicMeasure).map((measure) => (
                                    <Table.Cell key={measure}>
                                        {formatValue(
                                            valuesByMeasure.get(measure)?.get(result.realization),
                                            displayScaleByMeasure.get(measure)?.factor ?? 1,
                                        )}
                                    </Table.Cell>
                                ))}
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table.Root>
        </div>
    );
}

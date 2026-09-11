import { Collapsible } from "@lib/components/Collapsible";
import { Table } from "@lib/components/Table";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import type { RealizationEconomicResult } from "@modules/EconomicScreening/utils/economicCalculations";
import type { MeasureUnitContext } from "@modules/EconomicScreening/utils/measureAccessors";
import {
    getMeasureDisplayName,
    getMeasureDisplayScale,
    getMeasureUnit,
    getMeasureValues,
} from "@modules/EconomicScreening/utils/measureAccessors";

export type RealizationResultsTableProps = {
    results: RealizationEconomicResult[];
    unitContext: MeasureUnitContext;
    selectedRealization: number | null;
    onSelectedRealizationChange: (realization: number | null) => void;
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
            return [measure, getMeasureDisplayScale(measure, measureValues, getMeasureUnit(measure, props.unitContext))];
        }),
    );

    return (
        <Collapsible.Group title="All results">
            <Collapsible.Content layoutClassName="overflow-x-auto">
                <Table.Root
                    size="small"
                    compact
                    maxHeight={220}
                    selectable
                    rowSelection={props.selectedRealization?.toString() ?? null}
                    onChangeRowSelection={(rowKey) => props.onSelectedRealizationChange(rowKey === null ? null : Number(rowKey))}
                >
                    <Table.Head>
                        <Table.Row>
                            <Table.Cell colKey="realization">Realization</Table.Cell>
                            {Object.values(EconomicMeasure).map((measure) => (
                                <Table.Cell key={measure} colKey={measure}>
                                    {getMeasureDisplayName(measure, props.isDelta)} [
                                    {displayScaleByMeasure.get(measure)?.unit ?? getMeasureUnit(measure, props.unitContext)}]
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    </Table.Head>
                    <Table.Body>
                        {props.results.map((result) => (
                            <Table.Row key={result.realization} rowKey={result.realization.toString()}>
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
                        ))}
                    </Table.Body>
                </Table.Root>
            </Collapsible.Content>
        </Collapsible.Group>
    );
}
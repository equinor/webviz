import type { ReactNode } from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { Combobox } from "@lib/components/Combobox";
import type { ComboboxGroup } from "@lib/components/Combobox/types";
import { Setting } from "@lib/components/Setting";

import {
    CashFlowProfileType,
    CashFlowProfileTypeEnumToStringMapping,
    DistributionPlotType,
    DistributionPlotTypeEnumToStringMapping,
    EconomicMeasure,
    EconomicMeasureEnumToStringMapping,
    ResultMode,
    ResultModeEnumToStringMapping,
} from "../../../typesAndEnums";
import {
    cashFlowProfileTypeAtom,
    distributionPlotTypeAtom,
    resultModeAtom,
    selectedMeasureAtom,
} from "../../atoms/baseAtoms";
import { displayedRealizationAtom } from "../../atoms/derivedAtoms";
import { selectedRealizationAtom, validSelectedEnsembleIdentAtom } from "../../atoms/persistableFixableAtoms";
import { validRealizationNumbersAtom } from "../../atoms/sourceQueryAtoms";
import { MEASURE_DESCRIPTIONS, REALIZATION_HELP, RESULTS_HELP } from "../../helpTexts";
import type { SectionStateProps } from "../../settingsSections";
import { NamedRadioGroup } from "../namedRadioGroup";

const DISTRIBUTION_PLOT_TYPE_ITEMS = Object.values(DistributionPlotType).map((value) => ({
    value,
    label: DistributionPlotTypeEnumToStringMapping[value],
}));

const MEASURE_GROUPS: { title: string; measures: EconomicMeasure[] }[] = [
    {
        title: "Volumes",
        measures: [
            EconomicMeasure.DISCOUNTED_OIL_VOLUME,
            EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME,
            EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS,
            EconomicMeasure.UNDISCOUNTED_OIL_VOLUME,
            EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME,
        ],
    },
    {
        title: "Financial",
        measures: [EconomicMeasure.NPV, EconomicMeasure.IRR, EconomicMeasure.BREAK_EVEN_OIL_PRICE],
    },
];

const MEASURE_ITEMS: ComboboxGroup<EconomicMeasure>[] = MEASURE_GROUPS.map((group) => ({
    value: group.title,
    items: group.measures.map((measure) => ({
        value: measure,
        label: EconomicMeasureEnumToStringMapping[measure],
        description: MEASURE_DESCRIPTIONS[measure],
    })),
}));

export type ResultsSectionProps = {
    sectionProps: SectionStateProps;
};

export function ResultsSection(props: ResultsSectionProps): ReactNode {
    const selectedEnsembleIdent = useAtomValue(validSelectedEnsembleIdentAtom);
    const [resultMode, setResultMode] = useAtom(resultModeAtom);
    const [selectedMeasure, setSelectedMeasure] = useAtom(selectedMeasureAtom);
    const [distributionPlotType, setDistributionPlotType] = useAtom(distributionPlotTypeAtom);
    const [cashFlowProfileType, setCashFlowProfileType] = useAtom(cashFlowProfileTypeAtom);
    const setSelectedRealization = useSetAtom(selectedRealizationAtom);
    const displayedRealization = useAtomValue(displayedRealizationAtom);
    const validRealizationNumbers = useAtomValue(validRealizationNumbersAtom);

    function handleRealizationChange(realization: number | null) {
        setSelectedRealization({
            ensembleIdentString: selectedEnsembleIdent?.toString() ?? null,
            realization,
        });
    }

    const realizationItems = [...(validRealizationNumbers ?? [])]
        .sort((first, second) => first - second)
        .map((realization) => ({ value: realization, label: realization.toString() }));

    return (
        <Setting.Section {...props.sectionProps}>
            <Setting.Field label="Show" help={{ title: "Results", content: RESULTS_HELP }} stacked>
                <NamedRadioGroup
                    value={resultMode}
                    options={Object.values(ResultMode).map((value) => ({
                        value,
                        label: ResultModeEnumToStringMapping[value],
                    }))}
                    onValueChange={setResultMode}
                />
            </Setting.Field>
            {resultMode === ResultMode.DISTRIBUTION && (
                <>
                    <Setting.Field label="Measure" stacked>
                        <Combobox<EconomicMeasure>
                            items={MEASURE_ITEMS}
                            value={selectedMeasure}
                            onValueChange={(value) => value !== null && setSelectedMeasure(value)}
                        />
                    </Setting.Field>
                    <Setting.Field label="Plot type" stacked>
                        <Combobox<DistributionPlotType>
                            items={DISTRIBUTION_PLOT_TYPE_ITEMS}
                            value={distributionPlotType}
                            onValueChange={(value) => value !== null && setDistributionPlotType(value)}
                        />
                    </Setting.Field>
                </>
            )}
            {resultMode === ResultMode.TIME_PROFILE && (
                <Setting.Field label="Time profile" stacked>
                    <Combobox<CashFlowProfileType>
                        items={Object.values(CashFlowProfileType).map((value) => ({
                            value,
                            label: CashFlowProfileTypeEnumToStringMapping[value],
                        }))}
                        value={cashFlowProfileType}
                        onValueChange={(value) => value !== null && setCashFlowProfileType(value)}
                    />
                </Setting.Field>
            )}
            {resultMode !== ResultMode.DISTRIBUTION && (
                <Setting.Field label="Realization" help={{ title: "Realization", content: REALIZATION_HELP }} stacked>
                    <Combobox<number>
                        items={realizationItems}
                        value={displayedRealization}
                        onValueChange={handleRealizationChange}
                        showClearAllButton
                        placeholder="Aggregate"
                    />
                </Setting.Field>
            )}
        </Setting.Section>
    );
}

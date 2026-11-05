import type { ReactNode } from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import type { Interfaces } from "../../../interfaces";
import { getFieldIssueText } from "../../../utils/setupReadiness";
import { CalculationHelpDialog } from "../../../view/components/calculationHelpDialog";
import { discountRatePercentAtom, predictionStartYearAtom } from "../../atoms/baseAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationAtom } from "../../atoms/persistableFixableAtoms";
import {
    evaluationHorizonStateAtom,
    isSourceLoadingAtom,
    predictionStartYearSuggestionsAtom,
} from "../../atoms/sourceSnapshotAtoms";
import { DISCOUNT_RATE_HELP, EVALUATION_START_HELP } from "../../helpTexts";
import { NUMBER_INPUT_DEBOUNCE_MS, setupFieldClassName, type SettingsSectionProps } from "../../settingsSections";
import { PredictionYearSelector } from "../predictionYearSelector";

export type DataAndValuationSectionProps = SettingsSectionProps & {
    workbenchSession: ModuleSettingsProps<Interfaces>["workbenchSession"];
};

export function DataAndValuationSection(props: DataAndValuationSectionProps): ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const ensembleRealizationFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const setSelectedRealization = useSetAtom(selectedRealizationAtom);
    const [discountRatePercent, setDiscountRatePercent] = useAtom(discountRatePercentAtom);
    const [predictionStartYear, setPredictionStartYear] = useAtom(predictionStartYearAtom);
    const evaluationHorizon = useAtomValue(evaluationHorizonStateAtom);
    const isSourceLoading = useAtomValue(isSourceLoadingAtom);
    const predictionStartYearSuggestions = useAtomValue(predictionStartYearSuggestionsAtom);
    const selectedEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);

    const [immediateDiscountRate, setImmediateDiscountRate] = useDebouncedOnChange(
        discountRatePercent,
        (newValue: number) => setDiscountRatePercent(newValue),
        NUMBER_INPUT_DEBOUNCE_MS,
    );

    function handleEnsembleChange(newEnsembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        setSelectedRealization({ ensembleIdentString: newEnsembleIdent.toString(), realization: null });
    }

    const ensembleIssue = getFieldIssueText(props.readiness, "ensemble");

    return (
        <Setting.Section {...props.sectionProps}>
            <div className="flex justify-end">
                <CalculationHelpDialog />
            </div>
            <Setting.Field
                label="Ensemble"
                annotations={[
                    ...selectedEnsembleIdentAnnotations,
                    ...(ensembleIssue ? [{ type: "warning" as const, message: ensembleIssue }] : []),
                ]}
                contentClassName={setupFieldClassName("ensemble")}
                stacked
            >
                <EnsembleDropdown
                    ensembles={ensembleSet.getEnsembleArray()}
                    allowDeltaEnsembles={true}
                    value={selectedEnsembleIdent.value}
                    ensembleRealizationFilterFunction={ensembleRealizationFilterFunc}
                    onValueChange={handleEnsembleChange}
                />
            </Setting.Field>
            <Setting.Field
                label="Evaluation start"
                help={{ title: "Evaluation start", content: EVALUATION_START_HELP }}
                contentClassName={`${setupFieldClassName("predictionYear")} flex flex-col gap-y-3xs`}
                warningAnnotation={getFieldIssueText(props.readiness, "predictionYear")}
                stacked
            >
                <>
                    <PredictionYearSelector
                        value={predictionStartYear}
                        suggestedYears={predictionStartYearSuggestions}
                        isLoading={isSourceLoading}
                        onValueChange={setPredictionStartYear}
                    />
                    {predictionStartYear !== null && evaluationHorizon.status !== "START_AFTER_END" && (
                        <span className="text-body-xs text-subtle">Also the valuation date.</span>
                    )}
                </>
            </Setting.Field>
            <Setting.Field
                label="Discount rate [%]"
                stacked
                contentClassName="max-w-40"
                help={{ title: "Discount rate", content: DISCOUNT_RATE_HELP }}
            >
                <NumberInput
                    value={immediateDiscountRate}
                    layoutClassName="[&_input]:text-right"
                    min={0}
                    max={25}
                    step={1}
                    onValueChange={(newValue) => setImmediateDiscountRate(newValue ?? 0)}
                />
            </Setting.Field>
        </Setting.Section>
    );
}

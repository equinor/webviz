import { useEffect, useRef, useState, type ReactNode } from "react";

import { useAtomValue } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { ModuleSettingsProps } from "@framework/Module";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { Setting } from "@lib/components/Setting";

import type { Interfaces } from "../interfaces";
import { CashFlowProfileTypeEnumToStringMapping, ResultMode } from "../typesAndEnums";
import { getResultRequirement, REQUIREMENT_NEEDS } from "../utils/eligibility";
import { getMeasureDisplayName } from "../utils/measureAccessors";
import { getSetupReadiness, type SetupField } from "../utils/setupReadiness";

import {
    cashFlowProfileTypeAtom,
    costDraftStatusAtom,
    costProfileAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    missingComponentAssumptionsAtom,
    oilPriceAtom,
    resultModeAtom,
    selectedMeasureAtom,
} from "./atoms/baseAtoms";
import { activeVectorListQueryAtom, hasOilProductionVectorAtom } from "./atoms/derivedAtoms";
import { validSelectedEnsembleIdentAtom } from "./atoms/persistableFixableAtoms";
import {
    evaluationHorizonStateAtom,
    selectedProductSupportAtom,
    sourceSnapshotAtom,
} from "./atoms/sourceSnapshotAtoms";
import { CostsSection } from "./components/sections/costsSection";
import { DataAndValuationSection } from "./components/sections/dataAndValuationSection";
import { EarlyCashFlowComparisonSection } from "./components/sections/earlyCashFlowComparisonSection";
import { PricesSection } from "./components/sections/pricesSection";
import { ResultsSection } from "./components/sections/resultsSection";
import { SetupSummary } from "./components/setupSummary";
import { useGasOnlyMeasureFallback } from "./hooks/useGasOnlyMeasureFallback";
import { FIELD_SECTIONS, SettingsSection, setupFieldClassName } from "./settingsSections";

export function Settings(props: ModuleSettingsProps<Interfaces>): ReactNode {
    const settingsRef = useRef<HTMLDivElement>(null);
    const selectedMeasure = useAtomValue(selectedMeasureAtom);
    const cashFlowProfileType = useAtomValue(cashFlowProfileTypeAtom);
    const resultMode = useAtomValue(resultModeAtom);
    const requirement = getResultRequirement(resultMode, selectedMeasure, cashFlowProfileType);
    const needs = REQUIREMENT_NEEDS[requirement];
    const needsPrices = needs.oilRevenue || needs.gasRevenue;
    const needsCosts = needs.validCostDraft;

    // Prices and costs start closed unless the selected result needs them.
    const [closedSections, setClosedSections] = useState<SettingsSection[]>(() => [
        ...(needsPrices ? [] : [SettingsSection.PRICES]),
        ...(needsCosts ? [] : [SettingsSection.COSTS]),
    ]);
    const [previousNeeds, setPreviousNeeds] = useState({ needsPrices, needsCosts });
    const [focusTarget, setFocusTarget] = useState<SetupField | null>(null);

    // Opens a section once when the selected result starts needing it; closing it again is respected.
    if (needsPrices !== previousNeeds.needsPrices || needsCosts !== previousNeeds.needsCosts) {
        const toOpen = [
            ...(needsPrices && !previousNeeds.needsPrices ? [SettingsSection.PRICES] : []),
            ...(needsCosts && !previousNeeds.needsCosts ? [SettingsSection.COSTS] : []),
        ];
        setPreviousNeeds({ needsPrices, needsCosts });
        if (toOpen.length > 0) {
            setClosedSections((current) => current.filter((section) => !toOpen.includes(section)));
        }
    }

    useEffect(() => {
        if (!focusTarget) return;
        const frame = requestAnimationFrame(() => {
            const field = settingsRef.current?.querySelector(`.${setupFieldClassName(focusTarget)}`);
            const input =
                field?.querySelector<HTMLElement>("input, [role=checkbox]") ??
                field?.querySelector<HTMLElement>("button");
            input?.focus();
            input?.scrollIntoView({ block: "center" });
            setFocusTarget(null);
        });
        return () => cancelAnimationFrame(frame);
    }, [focusTarget]);

    function sectionProps(title: SettingsSection) {
        return {
            title,
            open: !closedSections.includes(title),
            onOpenChange: (open: boolean) =>
                setClosedSections((current) =>
                    open ? current.filter((section) => section !== title) : [...current, title],
                ),
        };
    }

    useGasOnlyMeasureFallback();

    const selectedEnsembleIdent = useAtomValue(validSelectedEnsembleIdentAtom);
    const earlyValueConfiguration = useAtomValue(earlyValueConfigurationAtom);
    const oilPrice = useAtomValue(oilPriceAtom);
    const gasPrice = useAtomValue(gasPriceAtom);
    const costProfile = useAtomValue(costProfileAtom);
    const costDraftStatus = useAtomValue(costDraftStatusAtom);
    const missingComponentAssumptionsByEnsemble = useAtomValue(missingComponentAssumptionsAtom);
    const evaluationHorizon = useAtomValue(evaluationHorizonStateAtom);
    const sourceSnapshot = useAtomValue(sourceSnapshotAtom);
    const selectedProductSupport = useAtomValue(selectedProductSupportAtom);
    const vectorListQuery = useAtomValue(activeVectorListQueryAtom);
    const hasOilProductionVector = useAtomValue(hasOilProductionVectorAtom);

    const isDeltaEnsembleSelected =
        selectedEnsembleIdent !== null && isEnsembleIdentOfType(selectedEnsembleIdent, DeltaEnsembleIdent);
    const selectedMissingComponentAssumptions =
        missingComponentAssumptionsByEnsemble[selectedEnsembleIdent?.toString() ?? ""];

    const setupReadiness = getSetupReadiness({
        hasEnsemble: selectedEnsembleIdent !== null,
        vectorListStatus: vectorListQuery.isError ? "ERROR" : vectorListQuery.isSuccess ? "READY" : "LOADING",
        snapshot: sourceSnapshot,
        hasOilVector: hasOilProductionVector,
        productSupport: selectedProductSupport,
        missingComponentAssumptions: selectedMissingComponentAssumptions,
        evaluationHorizon,
        oilPrice,
        gasPrice,
        costProfile,
        costDraftStatus,
        earlyValue: earlyValueConfiguration,
        requirement,
    });
    const resultLabel =
        resultMode === ResultMode.TIME_PROFILE
            ? CashFlowProfileTypeEnumToStringMapping[cashFlowProfileType].toLowerCase()
            : resultMode === ResultMode.ALL_RESULTS
              ? "all results"
              : getMeasureDisplayName(selectedMeasure, isDeltaEnsembleSelected).toLowerCase();

    return (
        <div ref={settingsRef} className="flex h-full min-h-0 min-w-0 flex-col [&_input]:scroll-mt-12">
            <SetupSummary
                readiness={setupReadiness}
                resultLabel={resultLabel}
                onIssueClick={(field) => {
                    setClosedSections((current) => current.filter((section) => section !== FIELD_SECTIONS[field]));
                    setFocusTarget(field);
                }}
            />
            <Setting.ScrollArea className="flex-1">
                <Setting.Panel>
                    <DataAndValuationSection
                        sectionProps={sectionProps(SettingsSection.DATA_AND_VALUATION)}
                        readiness={setupReadiness}
                        workbenchSession={props.workbenchSession}
                    />
                    <PricesSection sectionProps={sectionProps(SettingsSection.PRICES)} readiness={setupReadiness} />
                    <CostsSection sectionProps={sectionProps(SettingsSection.COSTS)} readiness={setupReadiness} />
                    <ResultsSection sectionProps={sectionProps(SettingsSection.RESULTS)} />
                    <EarlyCashFlowComparisonSection
                        sectionProps={sectionProps(SettingsSection.EARLY_CASH_FLOW_COMPARISON)}
                        readiness={setupReadiness}
                    />
                </Setting.Panel>
            </Setting.ScrollArea>
        </div>
    );
}

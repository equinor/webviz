import { useState } from "react";

import { CostProfileEditor } from "@modules/EconomicScreening/settings/components/costProfileEditor";
import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";
import { resolveEvaluationHorizon } from "@modules/EconomicScreening/utils/evaluationHorizon";
import { monthIndexOf } from "@modules/EconomicScreening/utils/monthlyProduction";
import { SourceStatus } from "@modules/EconomicScreening/utils/sourceSnapshot";

const DEFAULT_COST_PROFILE: CostProfileEntry[] = [{ year: 2020, capex: 100, opex: 0 }];

export function CostProfileEditorHarness({
    initialCostProfile = DEFAULT_COST_PROFILE,
    isDelta = false,
    startYear = 2020,
    endYear = 2022,
    ensembleKey = "regular-a",
    isHorizonLoading = false,
}: {
    initialCostProfile?: CostProfileEntry[];
    isDelta?: boolean;
    startYear?: number | null;
    endYear?: number | null;
    ensembleKey?: string;
    isHorizonLoading?: boolean;
}) {
    const [costProfile, setCostProfile] = useState<CostProfileEntry[]>(initialCostProfile);
    const [isReady, setIsReady] = useState(true);

    return (
        <>
            <CostProfileEditor
                value={costProfile}
                currency="USD"
                isDelta={isDelta}
                horizon={resolveEvaluationHorizon(startYear, {
                    status: isHorizonLoading && endYear === null ? SourceStatus.LOADING : SourceStatus.READY,
                    envelopeEndMonthIndex: endYear === null ? null : monthIndexOf(endYear, 12),
                })}
                ensembleKey={ensembleKey}
                isSourceLoading={isHorizonLoading}
                onValueChange={setCostProfile}
                onValidityChange={setIsReady}
            />
            <output data-testid="cost-schedule-ready">{isReady ? "ready" : "pending"}</output>
            <output data-testid="committed-cost-profile">{JSON.stringify(costProfile)}</output>
        </>
    );
}

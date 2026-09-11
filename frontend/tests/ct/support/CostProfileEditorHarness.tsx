import { useState } from "react";

import { CostProfileEditor } from "@modules/EconomicScreening/settings/components/costProfileEditor";
import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";

const DEFAULT_COST_PROFILE: CostProfileEntry[] = [{ year: 2020, capex: 100, opex: 0 }];

export function CostProfileEditorHarness({
    initialCostProfile = DEFAULT_COST_PROFILE,
    isDelta = false,
}: {
    initialCostProfile?: CostProfileEntry[];
    isDelta?: boolean;
}) {
    const [costProfile, setCostProfile] = useState<CostProfileEntry[]>(initialCostProfile);
    const [isReady, setIsReady] = useState(true);

    return (
        <>
            <CostProfileEditor
                value={costProfile}
                currency="USD"
                isDelta={isDelta}
                evaluationWindow={{ firstYear: null, lastYear: null }}
                onValueChange={setCostProfile}
                onValidityChange={setIsReady}
            />
            <output data-testid="cost-schedule-ready">{isReady ? "ready" : "pending"}</output>
            <output data-testid="committed-cost-year">{costProfile[0]?.year ?? "none"}</output>
        </>
    );
}

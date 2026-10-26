import type { QcCheckDefinition } from "../QcCheck";
import type { QcCheckStepDefinition } from "../QcCheckStep";

// TEMPORARY - for exercising the QC panel's realization-status rendering (success/failure/
// exception/excluded) end to end. Not a real check - remove once no longer needed.

type DummyCheckMetrics = {
    note: string;
};

const RANDOM_OUTCOMES = ["success", "failure", "exception"] as const;

function randomOutcome(): (typeof RANDOM_OUTCOMES)[number] {
    return RANDOM_OUTCOMES[Math.floor(Math.random() * RANDOM_OUTCOMES.length)];
}

// Both steps share this factory - step 2 never has to special-case "excluded" itself, since the
// runtime only carries a realization into step 2 once step 1 has reported it a "success" (any
// realization step 1 reported "failure"/"exception" for renders as "excluded" in step 2 for free).
function makeRandomStep(name: string): QcCheckStepDefinition<DummyCheckMetrics, void> {
    return {
        name,
        async run(context) {
            for (const realization of context.realizations) {
                const outcome = randomOutcome();
                if (outcome === "success") {
                    context.reportRealizationResult(realization, {
                        kind: "success",
                        metrics: { note: `${name}: randomly succeeded` },
                    });
                } else if (outcome === "failure") {
                    context.reportRealizationResult(realization, {
                        kind: "failure",
                        metrics: { note: `${name}: randomly failed` },
                        reason: "Randomly generated failure for testing.",
                    });
                } else {
                    context.reportRealizationResult(realization, {
                        kind: "exception",
                        errorMessage: "Randomly generated exception for testing.",
                    });
                }
            }
        },
    };
}

export const DummyRandomCheckStep1 = makeRandomStep("Random step 1");
export const DummyRandomCheckStep2 = makeRandomStep("Random step 2");

export const DummyRandomCheck: QcCheckDefinition<void> = {
    name: "Dummy random check (temporary/test)",
    defaultParams: undefined,
    steps: [DummyRandomCheckStep1, DummyRandomCheckStep2],
};

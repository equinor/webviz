import { isEqual } from "lodash";
import { v4 } from "uuid";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { UserDeltaEnsembleSetting, UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";

import type { EnsembleIdentWithCaseName, InternalDeltaEnsembleSetting, InternalRegularEnsembleSetting } from "./types";

/**
 * Make array of UserEnsembleSetting objects from the internal type.
 */
export function makeUserEnsembleSettingsFromInternal(
    internalEnsembleSettings: InternalRegularEnsembleSetting[],
): UserEnsembleSetting[] {
    return internalEnsembleSettings.map((item) => ({
        ensembleIdent: item.ensembleIdent,
        customName: item.customName,
        color: item.color,
    }));
}

/**
 * Make array of UserDeltaEnsembleSetting objects from the internal type.
 *
 * Exclude invalid delta ensembles (those without comparison or reference ensembles).
 */
export function makeValidUserDeltaEnsembleSettingsFromInternal(
    internalDeltaEnsembleSettings: InternalDeltaEnsembleSetting[],
): UserDeltaEnsembleSetting[] {
    const validDeltaEnsembles: UserDeltaEnsembleSetting[] = [];
    for (const deltaEnsemble of internalDeltaEnsembleSettings) {
        if (!deltaEnsemble.comparisonEnsembleIdent || !deltaEnsemble.referenceEnsembleIdent) {
            continue;
        }

        // Ensure no duplicate delta ensembles
        if (
            validDeltaEnsembles.some(
                (elm) =>
                    isEqual(elm.comparisonEnsembleIdent, deltaEnsemble.comparisonEnsembleIdent) &&
                    isEqual(elm.referenceEnsembleIdent, deltaEnsemble.referenceEnsembleIdent),
            )
        ) {
            continue;
        }

        validDeltaEnsembles.push({
            comparisonEnsembleIdent: deltaEnsemble.comparisonEnsembleIdent,
            referenceEnsembleIdent: deltaEnsemble.referenceEnsembleIdent,
            color: deltaEnsemble.color,
            customName: deltaEnsemble.customName,
        });
    }
    return validDeltaEnsembles;
}

export function makeRegularEnsembleSettingsFromEnsembleSet(ensembleSet: EnsembleSet): InternalRegularEnsembleSetting[] {
    const items: InternalRegularEnsembleSetting[] = [];

    for (const ensemble of ensembleSet.getRegularEnsembleArray()) {
        items.push({
            ensembleIdent: ensemble.getIdent(),
            caseName: ensemble.getCaseName(),
            customName: ensemble.getCustomName(),
            color: ensemble.getColor(),
        });
    }

    return items;
}

export function makeDeltaEnsembleSettingsFromEnsembleSet(ensembleSet: EnsembleSet): InternalDeltaEnsembleSetting[] {
    const items: InternalDeltaEnsembleSetting[] = [];

    for (const ensemble of ensembleSet.getDeltaEnsembleArray()) {
        items.push({
            comparisonEnsembleIdent: ensemble.getComparisonEnsembleIdent(),
            referenceEnsembleIdent: ensemble.getReferenceEnsembleIdent(),
            uuid: v4(),
            color: ensemble.getColor(),
            customName: ensemble.getCustomName(),
        });
    }

    return items;
}

export function makeSelectableEnsemblesForDeltaFromEnsembleSet(ensembleSet: EnsembleSet): EnsembleIdentWithCaseName[] {
    const items: EnsembleIdentWithCaseName[] = [];

    // Collect all regular ensembles
    const ensembleIdentsToSkip = new Set();
    for (const ensemble of ensembleSet.getRegularEnsembleArray()) {
        items.push({ ensembleIdent: ensemble.getIdent(), caseName: ensemble.getCaseName() });
        ensembleIdentsToSkip.add(ensemble.getIdent().toString());
    }

    // Collect comparison and reference ensembles from delta ensembles, skipping those already included
    for (const deltaEnsemble of ensembleSet.getDeltaEnsembleArray()) {
        const compAndRefEnsInfo: EnsembleIdentWithCaseName[] = [
            {
                ensembleIdent: deltaEnsemble.getComparisonEnsembleIdent(),
                caseName: deltaEnsemble.getComparisonEnsembleCaseName(),
            },
            {
                ensembleIdent: deltaEnsemble.getReferenceEnsembleIdent(),
                caseName: deltaEnsemble.getReferenceEnsembleCaseName(),
            },
        ];

        for (const { ensembleIdent, caseName } of compAndRefEnsInfo) {
            const identStr = ensembleIdent.toString();
            if (!ensembleIdentsToSkip.has(identStr)) {
                ensembleIdentsToSkip.add(identStr);
                items.push({ ensembleIdent, caseName });
            }
        }
    }

    return items;
}

export function makeHashFromSelectedEnsembles(
    selectedRegularEnsembles: InternalRegularEnsembleSetting[],
    selectedDeltaEnsembles: InternalDeltaEnsembleSetting[],
): string {
    const regularHash = selectedRegularEnsembles
        .map((item) => `${item.customName}~@@~${item.ensembleIdent.toString()}~@@~${item.color}`)
        .join(",");

    const deltaHash = selectedDeltaEnsembles
        .map((item) => `${item.customName}~@@~${makeHashFromDeltaEnsemble(item)}~@@~${item.color}`)
        .join(",");

    return `${regularHash}|${deltaHash}`;
}

export function makeHashFromDeltaEnsemble(deltaEnsemble: InternalDeltaEnsembleSetting): string {
    const comparisonEnsembleIdentString = deltaEnsemble.comparisonEnsembleIdent?.toString() ?? "null";
    const referenceEnsembleIdentString = deltaEnsemble.referenceEnsembleIdent?.toString() ?? "null";
    return `${comparisonEnsembleIdentString}~&&~${referenceEnsembleIdentString}`;
}

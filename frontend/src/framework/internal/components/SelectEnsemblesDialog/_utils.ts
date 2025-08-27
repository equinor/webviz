import { v4 } from "uuid";

import type { EnsembleSet } from "@framework/EnsembleSet";

import type { InternalDeltaEnsembleSetting, InternalRegularEnsembleSetting } from "./types";

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

export function makeHashFromSelectedEnsembles(
    selectedRegularEnsembles: InternalRegularEnsembleSetting[],
    selectedDeltaEnsembles: InternalDeltaEnsembleSetting[],
): string {
    const regularHash = selectedRegularEnsembles
        .map((item) => item.ensembleIdent.toString())
        .sort()
        .join(",");

    const deltaHash = selectedDeltaEnsembles
        .map((item) => makeHashFromDeltaEnsemble(item))
        .sort()
        .join(",");

    return `${regularHash}|${deltaHash}`;
}

export function makeHashFromDeltaEnsemble(deltaEnsemble: InternalDeltaEnsembleSetting): string {
    return `${deltaEnsemble.comparisonEnsembleIdent.toString()}~&&~${deltaEnsemble.referenceEnsembleIdent.toString()}`;
}

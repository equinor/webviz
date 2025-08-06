import { v4 } from "uuid";

import type { EnsembleSet } from "@framework/EnsembleSet";

import type {
    ExploredRegularEnsembleInfo,
    InternalDeltaEnsembleSetting,
    InternalRegularEnsembleSetting,
} from "./types";

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

export function makePreviouslyExploredRegularEnsembleInfosFromEnsembleSet(
    ensembleSet: EnsembleSet,
): ExploredRegularEnsembleInfo[] {
    const items: ExploredRegularEnsembleInfo[] = [];

    const selectedRegularEnsembleIdents = ensembleSet.getRegularEnsembleArray().map((ens) => ens.getIdent());
    for (const deltaEnsemble of ensembleSet.getDeltaEnsembleArray()) {
        if (!selectedRegularEnsembleIdents.includes(deltaEnsemble.getComparisonEnsembleIdent())) {
            items.push({
                ensembleIdent: deltaEnsemble.getComparisonEnsembleIdent(),
                caseName: deltaEnsemble.getComparisonEnsembleCaseName(),
            });
        }
        if (!selectedRegularEnsembleIdents.includes(deltaEnsemble.getReferenceEnsembleIdent())) {
            items.push({
                ensembleIdent: deltaEnsemble.getReferenceEnsembleIdent(),
                caseName: deltaEnsemble.getReferenceEnsembleCaseName(),
            });
        }
    }

    return items;
}

export function makeHashFromSelectedEnsembles(
    selectedRegularEnsembles: InternalRegularEnsembleSetting[],
    selectedDeltaEnsembles: InternalDeltaEnsembleSetting[],
): string {
    const regularHash = selectedRegularEnsembles
        .map((item) => `${item.customName}~@@~${item.ensembleIdent.toString()}`)
        .sort()
        .join(",");

    const deltaHash = selectedDeltaEnsembles
        .map((item) => `${item.customName}~@@~${makeHashFromDeltaEnsemble(item)}`)
        .sort()
        .join(",");

    return `${regularHash}|${deltaHash}`;
}

export function makeHashFromDeltaEnsemble(deltaEnsemble: InternalDeltaEnsembleSetting): string {
    const comparisonEnsembleIdentString = deltaEnsemble.comparisonEnsembleIdent?.toString() || "null";
    const referenceEnsembleIdentString = deltaEnsemble.referenceEnsembleIdent?.toString() || "null";
    return `${comparisonEnsembleIdentString}~&&~${referenceEnsembleIdentString}`;
}

import type { BaseEnsembleItem } from "./types";

export function isSameEnsembleItem(first: BaseEnsembleItem | null, second: BaseEnsembleItem | null): boolean {
    if (!first || !second) return false;

    return first.caseUuid === second.caseUuid && first.ensembleName === second.ensembleName;
}

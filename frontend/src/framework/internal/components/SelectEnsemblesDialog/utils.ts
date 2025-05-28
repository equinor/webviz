import type { BaseEnsembleItem } from "./types";

export function isSameEnsembleItem(ensemble1?: BaseEnsembleItem | null, ensemble2?: BaseEnsembleItem | null): boolean {
    if (!ensemble1 || !ensemble2) return false;

    return ensemble1.caseUuid === ensemble2.caseUuid && ensemble1.ensembleName === ensemble2.ensembleName;
}

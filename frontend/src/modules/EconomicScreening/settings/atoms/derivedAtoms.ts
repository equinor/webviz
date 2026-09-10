import { atom } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import type { SalesGasStrategy } from "@modules/EconomicScreening/utils/vectorResolution";
import { determineSalesGasStrategy, OIL_PRODUCTION_VECTOR } from "@modules/EconomicScreening/utils/vectorResolution";

import { selectedEnsembleIdentAtom } from "./persistableFixableAtoms";
import { deltaEnsembleVectorListQueryAtom, regularEnsembleVectorListQueryAtom } from "./queryAtoms";

export const isSelectedEnsembleDeltaAtom = atom<boolean>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    return Boolean(selectedEnsembleIdent && isEnsembleIdentOfType(selectedEnsembleIdent, DeltaEnsembleIdent));
});

export const activeVectorListQueryAtom = atom((get) => {
    return get(isSelectedEnsembleDeltaAtom)
        ? get(deltaEnsembleVectorListQueryAtom)
        : get(regularEnsembleVectorListQueryAtom);
});

export const availableVectorNamesAtom = atom<string[]>((get) => {
    return get(activeVectorListQueryAtom).data?.map((vector) => vector.name) ?? [];
});

export const hasOilProductionVectorAtom = atom<boolean>((get) => {
    return get(availableVectorNamesAtom).includes(OIL_PRODUCTION_VECTOR);
});

export const salesGasStrategyAtom = atom<SalesGasStrategy>((get) => {
    return determineSalesGasStrategy(get(availableVectorNamesAtom));
});

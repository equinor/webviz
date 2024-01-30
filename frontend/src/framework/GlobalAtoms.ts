import { EnsembleSet } from "@framework/EnsembleSet";

import { atom } from "jotai";

export const EnsembleSetAtom = atom<EnsembleSet>(new EnsembleSet([]));

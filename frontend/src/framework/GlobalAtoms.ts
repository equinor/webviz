import { EnsembleSet } from "@framework/EnsembleSet";

import { isEqual } from "lodash";

import { atomWithCompare } from "./AtomStoreMaster";

export const EnsembleSetAtom = atomWithCompare<EnsembleSet>(new EnsembleSet([]), (prev, next) => isEqual(prev, next));

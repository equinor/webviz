import { EnsembleSet } from "@framework/EnsembleSet";

import { atom } from "jotai";
import { isEqual } from "lodash";

import { EnsembleRealizationFilterFunction } from "./WorkbenchSession";
import { atomWithCompare } from "./utils/atomUtils";

export const EnsembleSetAtom = atomWithCompare<EnsembleSet>(new EnsembleSet([]), isEqual);

export const EnsembleRealizationFilterFunctionAtom = atom<EnsembleRealizationFilterFunction | null>(null);

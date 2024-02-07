import { EnsembleSet } from "@framework/EnsembleSet";

import { isEqual } from "lodash";

import { atomWithCompare } from "./utils/atomUtils";

export const EnsembleSetAtom = atomWithCompare<EnsembleSet>(new EnsembleSet([]), isEqual);

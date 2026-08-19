import { atom } from "jotai";

import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

export const selectedIndexValueCriteriaAtom = atom<IndexValueCriteria>(IndexValueCriteria.REQUIRE_EQUALITY);

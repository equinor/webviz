import { atom } from "jotai";

import { InplaceVolumesStatistic_api } from "@api";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

export const selectedTableTypeAtom = atom<TableType>(TableType.STATISTICAL);
export const selectedStatisticOptionsAtom = atom<InplaceVolumesStatistic_api[]>(
    Object.values(InplaceVolumesStatistic_api),
);
export const selectedIndexValueCriteriaAtom = atom<IndexValueCriteria>(IndexValueCriteria.REQUIRE_EQUALITY);

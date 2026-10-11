import { atom } from "jotai";

import { InplaceVolumesStatistic_api } from "@api";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableType } from "@modules/_shared/InplaceVolumes/types";
import { StatisticsLayout } from "@modules/InplaceVolumesTable/types";

export const selectedTableTypeAtom = atom<TableType>(TableType.STATISTICAL);
export const selectedStatisticsLayoutAtom = atom<StatisticsLayout>(StatisticsLayout.RESPONSES_AS_COLUMNS);
export const selectedStatisticOptionsAtom = atom<InplaceVolumesStatistic_api[]>(
    Object.values(InplaceVolumesStatistic_api),
);
export const selectedIndexValueCriteriaAtom = atom<IndexValueCriteria>(IndexValueCriteria.REQUIRE_EQUALITY);

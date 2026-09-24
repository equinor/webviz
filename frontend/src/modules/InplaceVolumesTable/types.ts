import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";

export type InplaceVolumesFilterSelections = Omit<InplaceVolumesFilterSettings, "allowIndicesValuesIntersection"> & {
    areSelectedTablesComparable: boolean;
};

// ! The string values are persisted in sessions and templates; never rename them
export enum StatisticsLayout {
    RESPONSES_AS_COLUMNS = "RESPONSES_AS_COLUMNS",
    RESPONSES_AS_ROWS = "RESPONSES_AS_ROWS",
}

export const StatisticsLayoutToStringMapping: Record<StatisticsLayout, string> = {
    [StatisticsLayout.RESPONSES_AS_COLUMNS]: "Responses as columns",
    [StatisticsLayout.RESPONSES_AS_ROWS]: "Responses as rows",
};

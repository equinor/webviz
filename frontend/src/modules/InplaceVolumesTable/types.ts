import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";

export type InplaceVolumesFilterSelections = Omit<InplaceVolumesFilterSettings, "allowIndicesValuesIntersection"> & {
    areSelectedTablesComparable: boolean;
};

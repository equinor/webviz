import type { InplaceVolumetricsFilterSettings } from "@framework/types/inplaceVolumetricsFilterSettings";

export type InplaceVolumetricsFilterSelections = Omit<
    InplaceVolumetricsFilterSettings,
    "allowIdentifierValuesIntersection"
> & {
    areSelectedTablesComparable: boolean;
};

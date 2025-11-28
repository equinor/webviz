import type { SimplifiedWellboreHeader } from "@lib/utils/wellboreTypes";

export type WellboreSelectionDialogProps = {
    open: boolean;
    wellbores: SimplifiedWellboreHeader[];
    selectedWellbores: SimplifiedWellboreHeader[];
    onSelectionChange: (wellbores: SimplifiedWellboreHeader[]) => void;
    onClose: () => void;
};

export type WellGroup = {
    wellUuid: string;
    uniqueWellIdentifier: string;
    wellbores: SimplifiedWellboreHeader[];
    // Enhanced with completion info
    hasPerforations: boolean;
    hasScreens: boolean;
    completionTypes: string[];
};

export type BlockGroup = {
    blockName: string;
    wells: WellGroup[];
    totalWellbores: number;
    hasPerforations: boolean;
    hasScreens: boolean;
    completionTypes: string[];
};

export type FilterState = {
    searchText: string;
    purposes: string[];
    statuses: string[];
    // Completion filters
    completionTypes: string[]; // ["perforated", "screened", "none"]
    completionDetails: string[]; // Combined perforation modes and "Screen"
};

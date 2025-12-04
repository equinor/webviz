import type { SelectOption } from "@lib/components/Select";

import type { FilterState } from "./types";

export interface FilterConfig {
    key: keyof Omit<FilterState, "searchText">;
    label: string;
    placeholder: string;
    badgeColorClass: string;
    badgeHoverClass: string;
    getBadgeLabel?: (value: string) => string;
}

export const FILTER_CONFIGS: FilterConfig[] = [
    {
        key: "purposes",
        label: "Purpose",
        placeholder: "All purposes",
        badgeColorClass: "bg-blue-100 text-blue-800",
        badgeHoverClass: "hover:bg-blue-200",
    },
    {
        key: "statuses",
        label: "Status",
        placeholder: "All statuses",
        badgeColorClass: "bg-green-100 text-green-800",
        badgeHoverClass: "hover:bg-green-200",
    },
    {
        key: "completionTypes",
        label: "Completion Type",
        placeholder: "All types",
        badgeColorClass: "bg-purple-100 text-purple-800",
        badgeHoverClass: "hover:bg-purple-200",
        getBadgeLabel: () => "Completion",
    },
    {
        key: "completionDetails",
        label: "Completion Details",
        placeholder: "All details",
        badgeColorClass: "bg-blue-100 text-blue-800",
        badgeHoverClass: "hover:bg-blue-200",
        getBadgeLabel: (value: string) => (value === "Screen" ? "Screen" : `Perf: ${value}`),
    },
];

export interface FilterOptionsConfig {
    purposes: SelectOption[];
    statuses: SelectOption[];
    completionTypes: SelectOption[];
    completionDetails: SelectOption[];
}

export interface FilterUniqueValuesConfig {
    purposes: string[];
    statuses: string[];
    completionTypes: string[];
    completionDetails: string[];
}

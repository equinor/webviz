import type React from "react";

import { Clear, Search, FilterAlt } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Input } from "@lib/components/Input";

import { FilterBadge } from "./FilterBadge";
import { FILTER_CONFIGS, type FilterOptionsConfig, type FilterUniqueValuesConfig } from "./filterConfig";
import { FilterSelect } from "./FilterSelect";
import type { FilterState } from "./types";

interface FilterControlsProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    showFilters: boolean;
    setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
    filterOptions: FilterOptionsConfig;
    uniqueValues: FilterUniqueValuesConfig;
}

export function FilterControls({
    filters,
    setFilters,
    showFilters,
    setShowFilters,
    filterOptions,
    uniqueValues,
}: FilterControlsProps) {
    const totalActiveFilters =
        filters.purposes.length +
        filters.statuses.length +
        filters.completionTypes.length +
        filters.completionDetails.length;

    const hasActiveFilters = totalActiveFilters > 0;

    return (
        <>
            {/* Search and Filter Controls */}
            <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                    <Input
                        placeholder="Search wellbores, wells, purpose, or status..."
                        value={filters.searchText}
                        onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
                        startAdornment={<Search fontSize="small" />}
                        endAdornment={
                            filters.searchText && (
                                <Clear
                                    fontSize="small"
                                    className="cursor-pointer"
                                    onClick={() => setFilters((prev) => ({ ...prev, searchText: "" }))}
                                />
                            )
                        }
                    />
                </div>
                <Button
                    variant="outlined"
                    startIcon={<FilterAlt fontSize="small" />}
                    onClick={() => setShowFilters(!showFilters)}
                    color={hasActiveFilters ? "primary" : undefined}
                >
                    Filters {hasActiveFilters && `(${totalActiveFilters})`}
                </Button>
            </div>

            {/* Active Filter Badges */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-1">
                    {FILTER_CONFIGS.map((config) =>
                        filters[config.key].map((value) => (
                            <FilterBadge
                                key={`${config.key}-${value}`}
                                value={config.getBadgeLabel ? config.getBadgeLabel(value) : value}
                                label={config.label}
                                colorClass={config.badgeColorClass}
                                hoverClass={config.badgeHoverClass}
                                onRemove={() =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        [config.key]: prev[config.key].filter((item: string) => item !== value),
                                    }))
                                }
                            />
                        )),
                    )}
                </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
                <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg border">
                    {FILTER_CONFIGS.map((config) => (
                        <FilterSelect
                            key={config.key}
                            label={config.label}
                            value={filters[config.key]}
                            options={filterOptions[config.key]}
                            placeholder={config.placeholder}
                            uniqueValues={uniqueValues[config.key]}
                            onChange={(values: string[]) => setFilters((prev) => ({ ...prev, [config.key]: values }))}
                            onClear={() => setFilters((prev) => ({ ...prev, [config.key]: [] }))}
                        />
                    ))}
                    {/* Clear All */}
                    <div className="flex flex-col justify-end">
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                                setFilters({
                                    searchText: "",
                                    purposes: [],
                                    statuses: [],
                                    completionTypes: [],
                                    completionDetails: [],
                                })
                            }
                            className="text-gray-500 hover:text-gray-700"
                        >
                            Clear All Filters
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

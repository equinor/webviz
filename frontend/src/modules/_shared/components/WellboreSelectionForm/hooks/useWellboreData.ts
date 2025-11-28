import React from "react";

import type { SimplifiedWellboreHeader } from "@lib/utils/wellboreTypes";

import type { WellGroup, BlockGroup, FilterState } from "../types";
import { extractBlockFromWellName } from "../utils";

export function useWellboreData(wellbores: SimplifiedWellboreHeader[], filters: FilterState) {
    // Group wellbores by blocks, then by wells, and add completion info
    const blockGroups = React.useMemo(() => {
        // First group by wells (existing logic)
        const wellGroups = new Map<string, WellGroup>();

        wellbores.forEach((wellbore) => {
            const wellUuid = wellbore.wellUuid;
            if (!wellGroups.has(wellUuid)) {
                wellGroups.set(wellUuid, {
                    wellUuid,
                    uniqueWellIdentifier: wellbore.uniqueWellIdentifier,
                    wellbores: [],
                    hasPerforations: false,
                    hasScreens: false,
                    completionTypes: [],
                });
            }
            const group = wellGroups.get(wellUuid)!;
            group.wellbores.push(wellbore);

            // Update group completion info based on simplified perforationAndScreens
            const hasScreens = wellbore.perforationAndScreens.includes("Screen");
            const hasPerforations = wellbore.perforationAndScreens.some((item) => item !== "Screen");
            if (hasPerforations) group.hasPerforations = true;
            if (hasScreens) group.hasScreens = true;
        });

        // Set completion types for each well group
        wellGroups.forEach((group) => {
            const completionTypes = [];
            if (group.hasPerforations) completionTypes.push("perforated");
            if (group.hasScreens) completionTypes.push("screened");
            if (!group.hasPerforations && !group.hasScreens) completionTypes.push("none");
            group.completionTypes = completionTypes;
        });

        // Now group wells by blocks
        const blocks = new Map<string, BlockGroup>();

        Array.from(wellGroups.values()).forEach((wellGroup) => {
            const blockName = extractBlockFromWellName(wellGroup.uniqueWellIdentifier);

            if (!blocks.has(blockName)) {
                blocks.set(blockName, {
                    blockName,
                    wells: [],
                    totalWellbores: 0,
                    hasPerforations: false,
                    hasScreens: false,
                    completionTypes: [],
                });
            }

            const blockGroup = blocks.get(blockName)!;
            blockGroup.wells.push(wellGroup);
            blockGroup.totalWellbores += wellGroup.wellbores.length;

            // Aggregate completion info at block level
            if (wellGroup.hasPerforations) blockGroup.hasPerforations = true;
            if (wellGroup.hasScreens) blockGroup.hasScreens = true;
        });

        // Set completion types for each block group
        blocks.forEach((blockGroup) => {
            const completionTypes = [];
            if (blockGroup.hasPerforations) completionTypes.push("perforated");
            if (blockGroup.hasScreens) completionTypes.push("screened");
            if (!blockGroup.hasPerforations && !blockGroup.hasScreens) completionTypes.push("none");
            blockGroup.completionTypes = completionTypes;

            // Sort wells within each block
            blockGroup.wells.sort((a, b) => a.uniqueWellIdentifier.localeCompare(b.uniqueWellIdentifier));
        });

        return Array.from(blocks.values()).sort((a, b) => {
            // Sort "Other" block last, then alphabetically
            if (a.blockName === "Other" && b.blockName !== "Other") return 1;
            if (b.blockName === "Other" && a.blockName !== "Other") return -1;
            return a.blockName.localeCompare(b.blockName);
        });
    }, [wellbores]);

    // Get unique purposes and statuses for filters
    const { uniquePurposes, uniqueStatuses, uniqueCompletionTypes, uniqueCompletionDetails } = React.useMemo(() => {
        const purposes = new Set<string>();
        const statuses = new Set<string>();
        const completionTypes = new Set<string>();
        const completionDetails = new Set<string>();

        wellbores.forEach((wellbore) => {
            if (wellbore.wellborePurpose) purposes.add(wellbore.wellborePurpose);
            if (wellbore.wellboreStatus) statuses.add(wellbore.wellboreStatus);

            // Completion type analysis using simplified perforationAndScreens
            const hasScreens = wellbore.perforationAndScreens.includes("Screen");
            const hasPerforations = wellbore.perforationAndScreens.some((item) => item !== "Screen");

            if (hasPerforations) completionTypes.add("perforated");
            if (hasScreens) completionTypes.add("screened");
            if (!hasPerforations && !hasScreens) completionTypes.add("none");

            // All completion details (perforations and screens combined)
            wellbore.perforationAndScreens.forEach((item) => {
                completionDetails.add(item);
            });
        });

        return {
            uniquePurposes: Array.from(purposes).sort(),
            uniqueStatuses: Array.from(statuses).sort(),
            uniqueCompletionTypes: Array.from(completionTypes).sort(),
            uniqueCompletionDetails: Array.from(completionDetails).sort(),
        };
    }, [wellbores]);

    // Filter wellbores based on current filters
    const filteredBlockGroups = React.useMemo(() => {
        return blockGroups
            .map((blockGroup) => {
                const filteredWells = blockGroup.wells
                    .map((wellGroup) => {
                        return {
                            ...wellGroup,
                            wellbores: wellGroup.wellbores.filter((wellbore) => {
                                // Search text filter
                                if (filters.searchText) {
                                    const searchLower = filters.searchText.toLowerCase();
                                    const matchesSearch =
                                        wellbore.uniqueWellboreIdentifier.toLowerCase().includes(searchLower) ||
                                        wellbore.uniqueWellIdentifier.toLowerCase().includes(searchLower) ||
                                        wellbore.wellborePurpose?.toLowerCase().includes(searchLower) ||
                                        wellbore.wellboreStatus?.toLowerCase().includes(searchLower) ||
                                        blockGroup.blockName.toLowerCase().includes(searchLower); // Also search block names

                                    if (!matchesSearch) return false;
                                }

                                // Purpose filter
                                if (
                                    filters.purposes.length > 0 &&
                                    !filters.purposes.includes(wellbore.wellborePurpose)
                                ) {
                                    return false;
                                }

                                // Status filter
                                if (
                                    filters.statuses.length > 0 &&
                                    !filters.statuses.includes(wellbore.wellboreStatus)
                                ) {
                                    return false;
                                }

                                // Completion type filter (applied at wellbore level)
                                if (filters.completionTypes.length > 0) {
                                    const hasScreens = wellbore.perforationAndScreens.includes("Screen");
                                    const hasPerforations = wellbore.perforationAndScreens.some(
                                        (item) => item !== "Screen",
                                    );

                                    const hasMatchingCompletionType = filters.completionTypes.some((type) => {
                                        if (type === "perforated") return hasPerforations;
                                        if (type === "screened") return hasScreens;
                                        if (type === "none") return !hasPerforations && !hasScreens;
                                        return false;
                                    });

                                    if (!hasMatchingCompletionType) return false;
                                }

                                // Completion details filter (combined perforations and screens)
                                if (filters.completionDetails.length > 0) {
                                    const hasMatchingCompletionDetail = wellbore.perforationAndScreens.some(
                                        (detail: string) => filters.completionDetails.includes(detail),
                                    );
                                    if (!hasMatchingCompletionDetail) return false;
                                }

                                return true;
                            }),
                        };
                    })
                    .filter((wellGroup) => wellGroup.wellbores.length > 0);

                // Return block with filtered wells, but only if it has wells with wellbores
                return {
                    ...blockGroup,
                    wells: filteredWells,
                    totalWellbores: filteredWells.reduce((sum, well) => sum + well.wellbores.length, 0),
                };
            })
            .filter((blockGroup) => blockGroup.wells.length > 0);
    }, [blockGroups, filters]);

    const allFilteredWellbores = React.useMemo(
        () => filteredBlockGroups.flatMap((blockGroup) => blockGroup.wells.flatMap((wellGroup) => wellGroup.wellbores)),
        [filteredBlockGroups],
    );

    return {
        blockGroups,
        filteredBlockGroups,
        allFilteredWellbores,
        uniquePurposes,
        uniqueStatuses,
        uniqueCompletionTypes,
        uniqueCompletionDetails,
    };
}

import React from "react";

import { Close } from "@mui/icons-material";

import type { CaseInfo_api } from "@api";
import { edsDateRangeToEpochMsRange } from "@framework/utils/edsDateUtils";
import { Button } from "@lib/newComponents/Button";
import { Combobox } from "@lib/newComponents/Combobox";
import { DateRangePicker } from "@lib/newComponents/DateRangePicker";
import type { DateRange } from "@lib/newComponents/DateRangePicker/dateRangePicker";
import { Table } from "@lib/newComponents/Table";
import type { TextInputProps } from "@lib/newComponents/TextInput";
import { TextInput } from "@lib/newComponents/TextInput";

export type CaseTableFilterState = {
    name?: string;
    description?: string;
    author?: string;
    status?: string[];
    dateRange?: DateRange | null;
    model?: string[];
    revision?: string[];
};

export type CaseTableFilterRowProps = {
    caseData: CaseInfo_api[] | undefined;
    filterState: CaseTableFilterState;

    disableAuthorFilter?: boolean;
    disableStatusFilter?: boolean;

    onFilterStateChange: (
        filterKey: keyof CaseTableFilterState,
        newValue: CaseTableFilterState[typeof filterKey],
    ) => void;
};

export function CaseTableFilterRow(props: CaseTableFilterRowProps): React.ReactNode {
    const statusOptions = React.useMemo(() => {
        if (!props.caseData) return [];

        const uniqueStatuses = [...new Set(props.caseData.map((c) => c.status))];

        return uniqueStatuses.map((elm) => ({ label: elm, value: elm }));
    }, [props.caseData]);

    const casesModelNames = React.useMemo(() => {
        if (!props.caseData) {
            return [];
        }

        const modelNames = new Set<string>();
        for (const c of props.caseData) {
            if (c.modelName) {
                modelNames.add(c.modelName);
            }
        }

        return Array.from(modelNames)
            .sort()
            .map((elm) => ({ label: elm, value: elm }));
    }, [props.caseData]);

    const casesModelRevisions = React.useMemo(() => {
        if (!props.caseData) {
            return [];
        }

        const modelRevisions = new Set<string>();
        for (const c of props.caseData) {
            if (c.modelRevision) {
                modelRevisions.add(c.modelRevision);
            }
        }

        return Array.from(modelRevisions)
            .sort()
            .map((elm) => ({ label: elm, value: elm }));
    }, [props.caseData]);

    return (
        <Table.Row layoutClassName="font-normal!" sortable={false}>
            <Table.Cell noPadding></Table.Cell>
            <Table.Cell noPadding>
                <FilterInput
                    value={props.filterState["name"]}
                    onValueChange={(v) => props.onFilterStateChange("name", v)}
                />
            </Table.Cell>
            <Table.Cell noPadding>
                <FilterInput
                    value={props.filterState["description"]}
                    onValueChange={(v) => props.onFilterStateChange("description", v)}
                />
            </Table.Cell>
            <Table.Cell noPadding>
                <FilterInput
                    value={props.filterState["author"]}
                    disabled={props.disableAuthorFilter}
                    onValueChange={(v) => props.onFilterStateChange("author", v)}
                />
            </Table.Cell>
            <Table.Cell noPadding>
                <Combobox
                    value={props.filterState["status"] ?? []}
                    items={statusOptions}
                    disabled={props.disableStatusFilter}
                    multiple
                    selectionMode="count"
                    onValueChange={(v) => props.onFilterStateChange("status", v)}
                />
            </Table.Cell>
            <Table.Cell noPadding>
                <DateRangePicker
                    layoutClassName="overflow-hidden"
                    value={props.filterState["dateRange"] ?? { from: null, to: null }}
                    onChange={(v) => props.onFilterStateChange("dateRange", v)}
                />
            </Table.Cell>
            <Table.Cell noPadding>
                <Combobox
                    value={props.filterState["model"] ?? []}
                    items={casesModelNames}
                    multiple
                    selectionMode="count"
                    onValueChange={(v) => props.onFilterStateChange("model", v)}
                />
            </Table.Cell>
            <Table.Cell noPadding>
                <Combobox
                    value={props.filterState["revision"] ?? []}
                    items={casesModelRevisions}
                    multiple
                    selectionMode="count"
                    onValueChange={(v) => props.onFilterStateChange("revision", v)}
                />
            </Table.Cell>
        </Table.Row>
    );
}

/**
 * This is copy of default filter render component from Table, with added possibility to disable the input
 * and adjusted wrapper class name to fit adjust the height to match the other filter components in the case table.
 *
 * Note: End-adornment is similar to the one in TagInput for consistency in table.
 */
function FilterInput(props: TextInputProps) {
    return (
        <TextInput
            {...props}
            layoutClassName="h-full"
            placeholder="Filter ..."
            endAdornment={
                <Button
                    title="Clear filter"
                    onClick={(evt) => props.onValueChange?.("", evt as any)}
                    iconOnly
                    variant="ghost"
                    tone="neutral"
                    size="small"
                >
                    <Close fontSize="inherit" />
                </Button>
            }
        />
    );
}

export function useCaseDataFilter(caseData: CaseInfo_api[] | undefined, filterState: CaseTableFilterState) {
    return React.useMemo(
        function applyCaseDataFilter() {
            if (!caseData) return [];
            if (Object.values(filterState).every((fs) => fs == null)) return caseData;

            return caseData.filter((c) => applyFilter(c, filterState));
        },
        [caseData, filterState],
    );
}

function applyFilter(caseInfo: CaseInfo_api, filterState: CaseTableFilterState): boolean {
    for (const [key, filterValue] of Object.entries(filterState)) {
        if (filterValue == null) continue;

        const filterResult = applyFilterValue(caseInfo, key as keyof CaseTableFilterState, filterValue);

        if (filterResult === false) {
            return false;
        }
    }

    return true;
}

function applyFilterValue(
    caseInfo: CaseInfo_api,
    key: keyof CaseTableFilterState,
    filterValue: CaseTableFilterState[typeof key],
): boolean {
    if (!filterValue) return true;

    switch (key) {
        case "name":
            return predicateCaseNameAndIdFilter(filterValue as string, caseInfo.name, caseInfo.uuid);
        case "description":
            return predicateFilterString(filterValue as string, caseInfo.description);
        case "author":
            return predicateFilterString(filterValue as string, caseInfo.user);
        case "status":
            return predicateSelectionFilter(filterValue as string[], caseInfo.status);
        case "dateRange":
            return predicateDateRangePick(filterValue as DateRange, caseInfo.updatedAtUtcMs);
        case "model":
            return predicateSelectionFilter(filterValue as string[], caseInfo.modelName);
        case "revision":
            return predicateSelectionFilter(filterValue as string[], caseInfo.modelRevision);
    }
}

function predicateFilterString(filterValue: string, dataValue: string) {
    const lowerValue = dataValue.toLowerCase();
    const filterString = filterValue.toLowerCase();

    return lowerValue.includes(filterString);
}

function predicateCaseNameAndIdFilter(filterValue: string, dataValue: string, caseId: string): boolean {
    const caseNameAndId = `${dataValue} - ${caseId}`.toLowerCase();
    filterValue = filterValue.toLowerCase();

    // Case name and id is full string, check if filterValue is a substring
    if (caseNameAndId.includes(filterValue)) return true;
    return caseNameAndId === filterValue;
}

function predicateSelectionFilter(filterValues: string[], dataValue: string | null): boolean {
    if (typeof dataValue !== "string") return false;
    if (!filterValues || filterValues.length === 0) return true;

    return filterValues.some((filterValue) => filterValue.toLowerCase() === dataValue.toLowerCase());
}

function predicateDateRangePick(dateRange: { from: Date | null; to: Date | null }, dataValue: number): boolean {
    const epochMsRange = edsDateRangeToEpochMsRange(dateRange);

    if (!epochMsRange) {
        return true;
    }
    if (epochMsRange.from && epochMsRange.to) {
        return dataValue >= epochMsRange.from && dataValue <= epochMsRange.to;
    }
    if (epochMsRange.from) {
        return dataValue >= epochMsRange.from;
    }
    if (epochMsRange.to) {
        return dataValue <= epochMsRange.to;
    }

    // Not expected to reach this point
    return false;
}

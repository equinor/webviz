import { DateRangePicker } from "@equinor/eds-core-react";
import { Close } from "@mui/icons-material";

import { Input } from "@lib/components/Input";
import type { TableColumns } from "@lib/components/Table/types";
import { TagPicker } from "@lib/components/TagPicker";
import type { CaseInfo_api } from "src/api/autogen/types.gen";

import type { CaseRowData } from "./_types";
import { UserAvatar } from "./userAvatar";

// TODO: Replace with util for date when introduces in Anders' PR
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
};

export function storeStateInLocalStorage(stateName: string, value: string) {
    localStorage.setItem(stateName, value);
}

export function readInitialStateFromLocalStorage(stateName: string): string {
    const storedState = localStorage.getItem(stateName);
    if (storedState && typeof storedState === "string") {
        return storedState;
    }
    return "";
}

/**
 * Creates the table columns for the case selection table.
 *
 * Note: The row data caseId is not used as a column, but is used as a unique identifier for each row.
 */
export function makeCaseTableColumns(
    statusOptions: string[],
    disabledFilterComponents: { disableAuthorComponent: boolean; disableStatusComponent: boolean },
): TableColumns<CaseRowData> {
    return [
        {
            label: "Name / id",
            _type: "data",
            columnId: "caseName",
            sizeInPercent: 30,
            renderData: (value, row) => (
                <div title={`${value} - ${row.caseId}`} className="p-1 flex items-center">
                    {value} <span className="text-xs text-slate-500"> {` - ${row.caseId}`}</span>
                </div>
            ),
            filter: {
                predicate: (filterValue: string, dataValue: string, _: any, rowData: CaseRowData) =>
                    predicateCaseNameAndIdFilter(filterValue, dataValue, _, rowData),
            },
        },
        { label: "Description", _type: "data", columnId: "description", sizeInPercent: 20 },
        {
            label: "Author",
            _type: "data",
            columnId: "author",
            sizeInPercent: 15,
            filter: {
                render: (props) => (
                    // NOTE: Awaiting disable parameter for filter in table code, until then copy of defaultFilter input is render here
                    <Input
                        type="text"
                        value={props.value ?? ""}
                        disabled={disabledFilterComponents.disableAuthorComponent}
                        placeholder="Filter ..."
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            props.onFilterChange(e.target.value || null)
                        }
                        endAdornment={
                            <div
                                className="cursor-pointer text-gray-600 hover:text-gray-500 text-sm"
                                onClick={() => props.onFilterChange(null)}
                            >
                                <Close fontSize="inherit" />
                            </div>
                        }
                        wrapperStyle={{
                            fontWeight: "normal",
                            fontSize: "0.25rem",
                        }}
                    />
                ),
            },
            renderData: (value, row) => (
                <div className="p-1 flex justify-center">
                    <UserAvatar key={row.caseId} userEmail={`${value}@equinor.com`} />
                    <span
                        className="min-w-0 text-ellipsis overflow-hidden whitespace-nowrap w-full block"
                        title={value}
                    >
                        {value}
                    </span>
                </div>
            ),
        },
        {
            label: "Status",
            _type: "data",
            columnId: "status",
            sizeInPercent: 15,
            filter: {
                render: (props) => (
                    <TagPicker
                        value={(props.value as string[]) ?? []}
                        showTags={false}
                        tags={statusOptions.map((elm) => ({ label: elm, value: elm }))}
                        disabled={disabledFilterComponents.disableStatusComponent}
                        onChange={(selectedItems) => props.onFilterChange(selectedItems)}
                    />
                ),
                predicate: (selectedItems: string[], dataValue) => predicateStatusSelection(selectedItems, dataValue),
            },
        },
        {
            label: "Date",
            _type: "data",
            columnId: "dateUtcMs",
            sizeInPercent: 20,
            formatValue: (value) => new Date(value).toLocaleDateString(undefined, DATE_FORMAT),
            filter: {
                render: (props) => (
                    <DateRangePicker
                        className='overflow-hidden [&_[class*="Icon"]]:h-3.5'
                        {...props}
                        onChange={props.onFilterChange}
                    />
                ),
                predicate: (filterValue, dataValue) => predicateDateRangePick(filterValue, dataValue),
            },
        },
    ];
}

export function makeCaseRowData(apiData: CaseInfo_api[]): CaseRowData[] {
    return apiData.map((item) => ({
        caseId: item.uuid,
        caseName: item.name,
        description: item.description,
        author: item.user,
        status: item.status,
        dateUtcMs: item.updatedAtUtcMs,
    }));
}

function predicateCaseNameAndIdFilter(filterValue: string, dataValue: string, _: any, rowData: CaseRowData): boolean {
    const caseNameAndId = `${dataValue} - ${rowData.caseId}`.toLowerCase();
    filterValue = filterValue.toLowerCase();

    // Case name and id is full string, check if filterValue is a substring
    if (caseNameAndId.includes(filterValue)) return true;
    return caseNameAndId === filterValue;
}

function predicateStatusSelection(filterValues: string[], dataValue: string): boolean {
    if (typeof dataValue !== "string") return true;
    if (!filterValues || filterValues.length === 0) return true;

    return filterValues.some((filterValue) => filterValue.toLowerCase() === dataValue.toLowerCase());
}

function predicateDateRangePick(dateRange: { from: Date; to: Date }, dataValue: number): boolean {
    return dataValue >= dateRange.from.getTime() && dataValue <= dateRange.to.getTime();
}

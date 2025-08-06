import React from "react";

import { inRange } from "lodash";

import type { ModuleViewProps } from "@framework/Module";
import { Button } from "@lib/components/Button";
import type { TableHeading } from "@lib/components/Table/table";
import { Table as Table2 } from "@lib/components/Table2";
import type {
    TableFilters,
    ColumnDefMap,
    ColumnFilterImplementationProps,
    TableSorting,
    TableRowData,
} from "@lib/components/Table2/types";
import { SortDirection } from "@lib/components/Table2/types";
import { ToggleButton } from "@lib/components/ToggleButton";

import type { Interfaces } from "./interfaces";

// TODO: Typing class so you can narrow down the values passed to format/filter functions
// type TableColumnData = {
//     "col1.1": string;
//     col3: number;
//     "col1.2": string;
//     "col1.3": string;
// };

const TABLE_DEFINITION: ColumnDefMap = {
    id: {
        label: "id",
        sizeInPercent: 10,
        sortable: false,
    },
    col1: {
        label: "Sub-columns",
        sizeInPercent: 40,
        subColumns: {
            "col1.1": {
                label: "Column 1.1",
                sizeInPercent: 50,
                formatValue: (s) => (s as string).toUpperCase(),
            },
            "col1.2": {
                label: "Column 1.2",
                sizeInPercent: 50,
            },
        },
    },
    theNumbers: {
        label: "Numbers",
        sizeInPercent: 15,
        filter: {
            render: (props) => <RangeFilter {...props} />,
            predicate(dataValue: string | number | null, filterValue: number[]) {
                if (typeof dataValue !== "number") return false;
                if (!Array.isArray(filterValue)) return false;

                const min = filterValue[0] ?? Number.NEGATIVE_INFINITY;
                const max = filterValue[1] ?? Number.POSITIVE_INFINITY;

                return !inRange(dataValue, min, max + 1);
            },
        },

        formatStyle(value: number) {
            const percentage = value / 12;

            return {
                backgroundColor: `hsl(0, 70%, ${percentage}%)`,
                color: percentage < 60 ? "white" : "black",
            };
        },
    },
    theTags: {
        label: "Tags",
        sizeInPercent: 35,
        renderData: (value) => <Tags tags={value} />,
    },
};

// ! I changed the key from "subHeading to "subColumns"; this is a super hacky replacement of the keys back to the legacy
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TABLE_DEFINITION_LEGACY: TableHeading = JSON.parse(
    JSON.stringify(TABLE_DEFINITION).replaceAll('"subColumns":', '"subHeading":'),
);

function RangeFilter(props: ColumnFilterImplementationProps<[number?, number?]>) {
    const value = (props.value ?? []) as [min: number, max: number];

    return (
        <div className="bg-white grid grid-cols-2 gap-1 h-full font-normal w-fit">
            <input
                className="h-full min-w-0"
                value={value[0] ?? ""}
                placeholder="Min"
                type="number"
                max={value[1]}
                onChange={(e) => {
                    if (!e.target.value) {
                        props.onFilterChange([undefined, value[1]]);
                    } else {
                        props.onFilterChange([e.target.valueAsNumber, value[1]]);
                    }
                }}
            />

            <input
                className="h-full min-w-0"
                value={value[1] ?? ""}
                placeholder="Max"
                type="number"
                min={value[0]}
                onChange={(e) => {
                    if (!e.target.value) {
                        props.onFilterChange([value[0], undefined]);
                    } else {
                        props.onFilterChange([value[0], e.target.valueAsNumber]);
                    }
                }}
            />
        </div>
    );
}

function Tags(props: { tags: string[] }): React.ReactNode {
    const tagColors = {
        Tag1: "bg-red-600",
        Tag2: "bg-blue-600",
        Tag3: "bg-green-600",
        Tag4: "bg-yellow-600",
        Tag5: "bg-purple-600",
        Tag6: "bg-pink-600",
    };

    return (
        <div className="flex flex-wrap gap-1 items-center">
            {props.tags.map((t, i) => (
                <div
                    key={t + i}
                    className={tagColors[t as keyof typeof tagColors] + " rounded-xl px-2 py-1 text-xs text-white"}
                >
                    {t}
                </div>
            ))}
        </div>
    );
}

export const View = (props: ModuleViewProps<Interfaces>) => {
    const alternateColColors = props.viewContext.useSettingsToViewInterfaceValue("alternateColColors");
    const allowMultiSelect = props.viewContext.useSettingsToViewInterfaceValue("allowMultiSelect");
    const tableData = props.viewContext.useSettingsToViewInterfaceValue("tableData");

    const [tableSortingState, setTableSortingState] = React.useState<TableSorting>([]);
    const [tableFilterState, setTableFilterState] = React.useState<TableFilters>({});

    const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
    const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

    const [usingTheCoolFilters, setUsingTheCoolFilters] = React.useState(false);

    function handleFilterUpdate(newFilter: TableFilters) {
        setUsingTheCoolFilters(false);
        setTableFilterState(newFilter);
    }

    return (
        <div className="h-full w-full flex flex-col">
            {/* 
            <h3 className="mt-6 font-extrabold text-lg">New (un-controlled)</h3>
            <Table2
                rowIdentifier="id"
                height={300}
                columnDefMap={TABLE_DEFINITION}
                rows={tableData as TableRowData<ColumnDefMap>[]}
                alternatingColumnColors={alternateColColors}
                selectable
                multiSelect={allowMultiSelect}
                // Listening to the internal changes, and make them update the controlled component
                onSortingChange={setTableSortingState}
                onFiltersChange={handleFilterUpdate}
                onSelectedRowsChange={setSelectedRows}
                onRowHover={setHoveredItem}
            />
             */}

            <h3 className="mt-6 font-extrabold text-lg">New (controlled)</h3>

            <div className="flex">
                <Button
                    onClick={() => {
                        setTableSortingState((prev) =>
                            prev.map((s) => ({
                                ...s,
                                direction: s.direction === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC,
                            })),
                        );
                    }}
                >
                    Flip all sorting
                </Button>
                <ToggleButton
                    active={usingTheCoolFilters}
                    onToggle={(active: boolean) => {
                        if (!active) {
                            setUsingTheCoolFilters(false);
                            setTableFilterState({});
                        } else {
                            setUsingTheCoolFilters(true);
                            setTableFilterState({
                                "col1.1": "69",
                                col3: [420, 666],
                            });
                        }
                    }}
                >
                    Use the cool filters
                </ToggleButton>
            </div>

            <Table2
                rowIdentifier="id"
                height={300}
                columnDefMap={TABLE_DEFINITION}
                rows={tableData as TableRowData<ColumnDefMap>[]}
                alternatingColumnColors={alternateColColors}
                sorting={tableSortingState}
                filters={tableFilterState}
                selectable
                multiSelect={allowMultiSelect}
                onSortingChange={setTableSortingState}
                onFiltersChange={handleFilterUpdate}
                onSelectedRowsChange={setSelectedRows}
                onRowHover={setHoveredItem}
            />

            <div className="mt-4 text-xs italic text-right text-gray-600 flex justify-between">
                <span>Hovered: {hoveredItem ?? "None"}</span>

                <span>{selectedRows?.length ?? 0} row(s) selected</span>
            </div>
        </div>
    );
};

View.displayName = "View";

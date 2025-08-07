import React from "react";

import { inRange } from "lodash";

import type { ModuleViewProps } from "@framework/Module";
import { Button } from "@lib/components/Button";
import { Table } from "@lib/components/Table2";
import type {
    TableFilters,
    ColumnFilterImplementationProps,
    TableSorting,
    TableColumns,
} from "@lib/components/Table2/types";
import { SortDirection } from "@lib/components/Table2/types";
import { ToggleButton } from "@lib/components/ToggleButton";

import type { ExampleTabularData } from "./atoms";
import type { Interfaces } from "./interfaces";

const TABLE_COLUMNS: TableColumns<ExampleTabularData> = [
    {
        _type: "data",
        columnId: "id",
        label: "ID",
        sizeInPercent: 10,
        sortable: false,
        filter: {
            // As an example; you can keep the default rendering (string input), but specify your own predicate
            predicate(filterValue: string, dataValue) {
                filterValue = filterValue.toLowerCase();

                if (!/^row-\d+$/.test(filterValue)) return true;
                return filterValue === dataValue;
            },
        },
    },
    {
        _type: "group",
        columnId: "col1",
        label: "Sub-columns",
        sizeInPercent: 40,
        subColumns: [
            {
                _type: "data",
                columnId: "col1.1",
                label: "Column 1.1",
                sizeInPercent: 50,
                formatValue: (s) => (s as string).toUpperCase(),
            },
            {
                _type: "data",
                columnId: "col1.2",
                label: "Column 1.2",
                sizeInPercent: 50,
                filter: false,
            },
        ],
    },
    {
        _type: "data",
        columnId: "theNumbers",
        label: "Numbers",
        sizeInPercent: 15,
        filter: {
            render: (props) => <RangeFilter {...props} />,
            // We cannot infer the filter value's type (since it wholly dependent on the render)
            predicate(filterValue: number[], dataValue) {
                if (typeof dataValue !== "number") return true;
                if (!Array.isArray(filterValue)) return true;

                const min = filterValue[0] ?? Number.NEGATIVE_INFINITY;
                const max = filterValue[1] ?? Number.POSITIVE_INFINITY;

                return !inRange(dataValue, min, max + 1);
            },
        },

        formatStyle(value) {
            const percentage = value / 12;

            return {
                backgroundColor: `hsl(0, 70%, ${percentage}%)`,
                color: percentage < 60 ? "white" : "black",
            };
        },
    },
    {
        _type: "data",
        columnId: "theTags",
        label: "Tags",
        sizeInPercent: 35,
        renderData: (value) => <Tags tags={value} />,
    },
];

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
            <Table
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
                                theNumbers: [420, 666],
                            });
                        }
                    }}
                >
                    Use the cool filters
                </ToggleButton>
            </div>

            <Table
                rowIdentifier="id"
                height={300}
                columns={TABLE_COLUMNS}
                rows={tableData}
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

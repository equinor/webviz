import React from "react";

import { inRange, random, range } from "lodash";

import { Button } from "@lib/components/Button";
import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";
import { Table, type TableHeading, type TableRow } from "@lib/components/Table/table";
import { Table as Table2 } from "@lib/components/Table2";
import type {
    TableFilters,
    ColumnDefMap,
    ColumnFilterImplementationProps,
    TableSorting,
} from "@lib/components/Table2/types";
import { SortDirection } from "@lib/components/Table2/types";
import { ToggleButton } from "@lib/components/ToggleButton";

// TODO: Typing class so you can narrow down the values passed to format/filter functions
// type TableColumnData = {
//     "col1.1": string;
//     col3: number;
//     "col1.2": string;
//     "col1.3": string;
// };

const TABLE_DEFINITION: ColumnDefMap = {
    col1: {
        label: "Column 1",
        sizeInPercent: 30,
        subColumns: {
            "col1.1": {
                label: "Column 1.1",
                sizeInPercent: 100,
                formatValue: (s) => (s as string).toUpperCase(),
            },
        },
    },
    col3: {
        label: "Col-3",
        sizeInPercent: 10,
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
    },
    col2: {
        label: "Column 2",
        sizeInPercent: 40,
        subColumns: {
            "col1.X": {
                label: "Column 1.X",
                sizeInPercent: 90,
                subColumns: {
                    "col1.2": { label: "Column 1.2", sizeInPercent: 50 },
                    "col1.3": { label: "Column 1.3", sizeInPercent: 50 },
                },
            },
        },
    },
};

// ! I changed the key from "subHeading to "subColumns"; this is a super hacky replacement of the keys back to the legacy
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

export const View = () => {
    const [alternateCols, setAlternateCols] = React.useState(false);
    const [allowMultiSelect, setAllowMultiSelect] = React.useState(false);

    const [data, setData] = React.useState<TableRow<typeof TABLE_DEFINITION>[]>(
        range(1, 1000).map((i) => ({
            "col1.1": `Row ${i}, Column 1.1`,
            "col1.2": `Row ${i}, Column 1.2`,
            "col1.3": `Row ${i}, Column 1.3`,
            col3: random(0, 1000),
        })),
    );

    function addMoreRows() {
        setData((prev) => {
            return [
                ...prev,
                ...range(1, 10).map((i) => ({
                    "col1.1": `Row ${i + prev.length}, Column 1.1`,
                    "col1.2": `Row ${i + prev.length}, Column 1.2`,
                    "col1.3": `Row ${i + prev.length}, Column 1.3`,
                    col3: random(0, 1000),
                })),
            ];
        });
    }

    const [tableSortingState, setTableSortingState] = React.useState<TableSorting>([]);
    const [tableFilterState, setTableFilterState] = React.useState<TableFilters>({});
    const [usingTheCoolFilters, setUsingTheCoolFilters] = React.useState(false);

    function handleFilterUpdate(newFilter: TableFilters) {
        setUsingTheCoolFilters(false);
        setTableFilterState(newFilter);
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex gap-2 items-center">
                <Button onClick={addMoreRows}> AddData </Button>
                <Label text="Alternating columns" position="left">
                    <Switch checked={alternateCols} onChange={(e) => setAlternateCols(e.target.checked)} />
                </Label>
                <Label text="Multi-select" position="left">
                    <Switch checked={allowMultiSelect} onChange={(e) => setAllowMultiSelect(e.target.checked)} />
                </Label>
            </div>

            <h3 className="mt-6 font-extrabold text-lg">Legacy</h3>
            <Table
                height={300}
                headings={TABLE_DEFINITION_LEGACY}
                data={data}
                alternatingColumnColors={alternateCols}
            />

            <h3 className="mt-6 font-extrabold text-lg">New (un-controlled)</h3>
            <Table2
                height={300}
                columnDefMap={TABLE_DEFINITION}
                rows={data}
                alternatingColumnColors={alternateCols}
                multiSelect={allowMultiSelect}
            />

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
                height={300}
                columnDefMap={TABLE_DEFINITION}
                rows={data}
                alternatingColumnColors={alternateCols}
                sorting={tableSortingState}
                filters={tableFilterState}
                multiSelect={allowMultiSelect}
                onSortingChange={setTableSortingState}
                onFiltersChange={handleFilterUpdate}
            />
        </div>
    );
};

View.displayName = "View";

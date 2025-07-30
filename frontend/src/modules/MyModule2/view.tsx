import React from "react";

import { random, range } from "lodash";

import { Button } from "@lib/components/Button";
import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";
import type { TableHeading, TableRow } from "@lib/components/Table/table";
import { Table } from "@lib/components/Table/table";
import { Table as Table2 } from "@lib/components/Table2";
import type { ColumnDefMap } from "@lib/components/Table2/types";

// type TableDataTypes = {
//     col1: never;
//     "col1.1": string;
//     "col1.2": string;
//     col2: string;
//     col3: string;
//     col4: string;
// };

export const View = () => {
    const [alternateCols, setAlternateCols] = React.useState(false);

    const heading: TableHeading | ColumnDefMap = {
        col1: {
            label: "Column 1",
            sizeInPercent: 30,
            subColumns: {
                "col1.1": {
                    label: "Column 1.1",
                    sizeInPercent: 100,
                    filter: true,
                    formatValue: (s) => (s as string).toUpperCase(),
                },
            },

            subHeading: {
                "col1.1": {
                    label: "Column 1.1",
                    sizeInPercent: 10,
                    formatValue: (s) => (s as string).toUpperCase(),
                },
            },
        },
        col3: {
            label: "Column 3",
            sizeInPercent: 10,
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
            subHeading: {
                "col1.X": {
                    label: "Column 1.X",
                    sizeInPercent: 90,
                    subHeading: {
                        "col1.2": { label: "Column 1.2", sizeInPercent: 50 },
                        "col1.3": { label: "Column 1.3", sizeInPercent: 50 },
                    },
                },
            },
        },
    };

    const [data, setData] = React.useState<TableRow<typeof heading>[]>([
        {
            "col1.1": "Row 1, Column 1.1",
            "col1.2": "Row 1, Column 1.2",
            "col1.3": "Row 1, Column 1.3",
            // col2: "Row 1, Column 2",
            col3: random(0, 1000),
        },
        {
            "col1.1": "Row 2, Column 1.1",
            "col1.2": "Row 2, Column 1.2",
            "col1.3": "Row 2, Column 1.3",
            // col2: "Row 2, Column 2",
            col3: random(0, 1000),
        },
    ]);

    function addMoreRows() {
        setData((prev) => {
            return [
                ...prev,
                ...range(0, 10).map((i) => ({
                    "col1.1": `Row ${i + prev.length}, Column 1.1`,
                    "col1.2": `Row ${i + prev.length}, Column 1.2`,
                    "col1.3": `Row ${i + prev.length}, Column 1.3`,
                    // col2: `Row ${i + prev.length}, Column 2`,
                    // col3: `Row ${i + prev.length}, Column 3`,
                    col3: random(0, 1000),
                })),
            ];
        });
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div>
                <Label text="Use alternating column colors">
                    <Switch checked={alternateCols} onChange={(e) => setAlternateCols(e.target.checked)} />
                </Label>

                <Button onClick={addMoreRows}> AddData </Button>
            </div>

            <h3 className="mt-6 font-extrabold text-lg">Legacy</h3>
            <Table height={300} headings={heading} data={data} alternatingColumnColors={alternateCols} />

            <h3 className="mt-6 font-extrabold text-lg">New (un-controlled)</h3>
            <Table2 height={300} columnDefMap={heading} rows={data} alternatingColumnColors={alternateCols} />
        </div>
    );
};

View.displayName = "View";

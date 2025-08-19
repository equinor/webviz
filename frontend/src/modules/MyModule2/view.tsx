import React from "react";

import { range } from "lodash";

import { Dropdown } from "@lib/components/Dropdown";
import { Select } from "@lib/components/Select";
import type { TableHeading, TableRow } from "@lib/components/Table/table";
import { Table } from "@lib/components/Table/table";
import type { TableSelectOption } from "@lib/components/TableSelect";
import { TableSelect } from "@lib/components/TableSelect";
import { TagPicker } from "@lib/components/TagPicker";

export const View = () => {
    const itemsRange = range(0, 30);

    const heading: TableHeading = {
        col1: {
            label: "Column 1",
            sizeInPercent: 60,
            subHeading: {
                "col1.1": {
                    label: "Column 1.1",
                    sizeInPercent: 20,
                },
                "col1.2": {
                    label: "Column 1.2",
                    sizeInPercent: 80,
                },
            },
        },
        col2: {
            label: "Column 2",
            sizeInPercent: 40,
        },
    };

    const options = itemsRange.map((n) => ({
        label: "Item " + n,
        value: "item_" + n,
    }));

    const tableSelectOptions: TableSelectOption[] = itemsRange.map((n) => ({
        id: "item_" + n,
        values: [{ label: "ipsum" + n }, { label: "bar" + n }],
    }));

    const tableData: TableRow<typeof heading>[] = itemsRange.map((n) => ({
        "col1.1": `Row ${n}, Column 1.1`,
        "col1.2": `Row ${n}, Column 1.2`,
        col2: `Row ${n}, Column 2`,
    }));

    const [value, setValue] = React.useState<string | null>(null);

    return (
        <div className="h-full w-full flex flex-col justify-center [&_thead]:hidden">
            <div className="mt-4 gap-5 grid grid-cols-2">
                <div className="border-4 col-span-2">
                    <Table height={400} headings={heading} data={tableData} />
                </div>

                <Dropdown value={value} options={options} onChange={setValue} />

                <TagPicker tags={options} value={[]} />

                <Select size={6} options={options} />

                <TableSelect size={6} options={tableSelectOptions} headerLabels={["lorem", "foo"]} />
            </div>
        </div>
    );
};

View.displayName = "View";

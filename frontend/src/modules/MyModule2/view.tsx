import { Table, TableHeading, TableRow } from "@lib/components/Table/table";

export const View = () => {
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

    const data: TableRow<typeof heading>[] = [
        {
            "col1.1": "Row 1, Column 1.1",
            "col1.2": "Row 1, Column 1.2",
            col2: "Row 1, Column 2",
        },
        {
            "col1.1": "Row 2, Column 1.1",
            "col1.2": "Row 2, Column 1.2",
            col2: "Row 2, Column 2",
        },
    ];

    return (
        <div className="h-full w-full flex flex-col">
            <Table headings={heading} data={data} />
        </div>
    );
};

View.displayName = "View";

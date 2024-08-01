import { ModuleViewProps } from "@framework/Module";
import { Table, TableHeading, TableRow } from "@lib/components/Table/table";

import { SettingsToViewInterface, State } from "./state";

export const View = (props: ModuleViewProps<State, SettingsToViewInterface>) => {
    const text = props.viewContext.useSettingsToViewInterfaceValue("text");
    const derivedText = props.viewContext.useSettingsToViewInterfaceValue("derivedText");

    const heading: TableHeading = {
        col1: {
            label: "Column 1",
            sizeInPercent: 30,
            subHeading: {
                "col1.1": {
                    label: "Column 1.1",
                    sizeInPercent: 50,
                },
                "col1.2": {
                    label: "Column 1.2",
                    sizeInPercent: 50,
                },
            },
        },
        col2: {
            label: "Column 2",
            sizeInPercent: 70,
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

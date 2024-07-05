import { ModuleViewProps } from "@framework/Module";
import { Table } from "@lib/components/Table";
import { TableHeading } from "@lib/components/Table/table";

import { SettingsToViewInterface } from "../settingsToViewInterface";

export function View(props: ModuleViewProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultName = props.viewContext.useSettingsToViewInterfaceValue("resultName");

    const headings: TableHeading = {
        ensemble: {
            label: "Ensemble",
            sizeInPercent: 20,
        },
        tableName: {
            label: "Table Name",
            sizeInPercent: 20,
        },
    };

    const data = [
        {
            ensemble: 1,
            tableName: "Table 1",
        },
        {
            ensemble: 2,
            tableName: "Table 2",
        },
    ];

    return <Table headings={headings} data={data} />;
}

import type { ColumnType } from "@modules/_shared/InplaceVolumes/Table";

export type TableHeading = {
    label: string;
    hoverText?: string;
    sortable?: boolean;
    sizeInPercent: number;
    subHeading?: TableColumnsConfig;
    columnType?: ColumnType;
};

export type TableColumnsConfig = { [key: string]: TableHeading };
export type TableRow<T extends TableColumnsConfig> = {
    __id: string;
} & {
    [key in keyof T]: string | number | null;
};

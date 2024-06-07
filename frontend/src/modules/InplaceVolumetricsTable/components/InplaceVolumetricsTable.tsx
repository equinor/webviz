import React from "react";

import { Table, TableHeading } from "@lib/components/Table/table";

// TODO: move to types?
export type InplaceVolumetricTableContent = {
    ensemble: string;
    source: string;
    columns: Record<string, number[]>;
};

export interface InplaceVolumetricsTableProps {
    inplaceVolumetricsDataset: InplaceVolumetricTableContent[];
}

enum ValidTableColumns {
    STOIIP = "STOIIP",
    GIIP = "GIIP",
    ASSOCIATEDOIL = "ASSOCIATEDOIL",
    ASSOCIATEDGAS = "ASSOCIATEDGAS",
    STOIIP_TOTAL = "STOIIP_TOTAL",
    GIIP_TOTAL = "GIIP_TOTAL",
    BULK = "BULK",
    PORV = "PORV",
    HCPV = "HCPV",
    PORO = "PORO",
    SW = "SW",
    BO = "BO",
    BG = "BG",
}

function createTableHeadingFromDataset(dataset: any): TableHeading {
    const tableHeading: TableHeading = {};

    // TODO: Add logic to create table heading from dataset
    for (const key in dataset) {
        tableHeading[key] = { label: key, sizeInPercent: 9 };
    }
    return tableHeading;
}

function createRowDataFromDataset(dataset: any): any[] {
    const rowData: any[] = [];

    for (let i = 0; i < dataset.length; i++) {
        continue;
    }
    return rowData;
}

const InplaceVolumetricsTable: React.FC<InplaceVolumetricsTableProps> = (props) => {
    const tableHeading = createTableHeadingFromDataset(props.inplaceVolumetricsDataset);
    const rowData = createRowDataFromDataset(props.inplaceVolumetricsDataset);

    return <Table headings={tableHeading} data={rowData} />;
};

export default InplaceVolumetricsTable;

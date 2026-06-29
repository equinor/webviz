import type { Meta, StoryObj } from "@storybook/react";

import { Table } from "..";

import { TableCompositions } from ".";

const meta: Meta<typeof TableCompositions.CopyCellValue> = {
    title: "Components/Table/Compositions/CopyCellValue",
    component: TableCompositions.CopyCellValue,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
};

export default meta;

export const Default: StoryObj<{ value: number | string }> = {
    args: { value: "Hello World" },
    render: (args) => (
        <Table.Root>
            <Table.Head>
                <Table.Column>Value</Table.Column>
            </Table.Head>
            <Table.Row>
                <Table.Cell>
                    <TableCompositions.CopyCellValue onCopyRequested={() => String(args.value)}>
                        {args.value}
                    </TableCompositions.CopyCellValue>
                </Table.Cell>
            </Table.Row>
        </Table.Root>
    ),
};

import type { Meta, StoryObj } from "@storybook/react";

import { Table } from "..";

import { TableCompositions } from "./index";

type TRowData = { id: number; name: string; value: number; description: string };
const sampleData = Array.from<any, TRowData>({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    value: Math.floor(Math.random() * 1000),
    description: `Description for item ${i + 1}`,
}));

const meta: Meta<typeof TableCompositions.VirtualizedRows> = {
    title: "Components/Table/Compositions/VirtualizedRows",
    component: TableCompositions.VirtualizedRows,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component:
                    "A component that maps a set of row data to a list of virtualized rows, using the `<Virtualization />` component. Must be placed inside a `<Table.Body />` component. The `rowHeight` prop is only needed if your rendered rows override the default heights",
            },
        },
    },
    tags: ["autodocs"],
    decorators: [
        // ! Can't get the layout and stuff to stretch horizontally in a nice way, so hard-coding some sizes here
        (Story) => (
            <div className="w-[80vw] max-w-[850px]">
                <Story />
            </div>
        ),
    ],
    render(args) {
        return (
            <Table.Root maxHeight="50vh" fixed>
                <Table.Head sticky>
                    <Table.Column colKey="id">Id</Table.Column>
                    <Table.Column colKey="name">Name</Table.Column>
                    <Table.Column colKey="value">Value</Table.Column>
                    <Table.Column colKey="description">Description</Table.Column>
                </Table.Head>
                <Table.Body>
                    <TableCompositions.VirtualizedRows rows={args.rows as TRowData[]}>
                        {(row) => (
                            <Table.Row key={row.id}>
                                <Table.Cell colKey="id">{row.id}</Table.Cell>
                                <Table.Cell colKey="name">{row.name}</Table.Cell>
                                <Table.Cell colKey="value">{row.value}</Table.Cell>
                                <Table.Cell colKey="description">{row.description}</Table.Cell>
                            </Table.Row>
                        )}
                    </TableCompositions.VirtualizedRows>
                </Table.Body>
                <Table.Foot sticky>
                    <Table.Row>
                        <Table.Cell colSpan={4}>Total items: 10000</Table.Cell>
                    </Table.Row>
                </Table.Foot>
            </Table.Root>
        );
    },
} satisfies Meta<typeof TableCompositions.VirtualizedRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        rows: sampleData,
        // rowHeight: 40,
    },
};

// export const SmallDataset: Story = {
//     args: {
//         data: sampleData.slice(0, 100),
//     },
// };

// export const CustomRowHeight: Story = {
//     args: {
//         data: sampleData,
//     },
// };

// export const CompactView: Story = {
//     args: {
//         data: sampleData,
//     },
// };

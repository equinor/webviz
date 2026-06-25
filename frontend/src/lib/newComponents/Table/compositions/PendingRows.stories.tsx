import type { Meta, StoryObj } from "@storybook/react";

import { Table } from "..";

import type { PendingRowsProps } from "./index";
import { TableCompositions } from "./index";

const meta: Meta<typeof TableCompositions.PendingRows> = {
    title: "Components/Table/Compositions/PendingRows",
    component: TableCompositions.PendingRows,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component:
                    "A component that renders one or more skeleton rows to be used during loading states. Must be placed inside a `<Table.Body />` component.",
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        rowCount: {
            control: "select",
            options: ["fill", 3, 5, 10, 20],
        },
    },
    args: {
        rowCount: 5,
    },
    decorators: [
        // ! Can't get the layout and stuff to stretch horizontally in a nice way, so hard-coding some sizes here
        (Story) => (
            <div className="w-[80vw] max-w-[850px]">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof TableCompositions.PendingRows>;

export const Default: Story = {
    render: (args) => (
        <Table.Root layoutClassName="w-full">
            <Table.Head sticky>
                <Table.Column colKey="id">ID</Table.Column>
                <Table.Column colKey="name">Name</Table.Column>
                <Table.Column colKey="email">Email</Table.Column>
            </Table.Head>
            <Table.Body>
                <TableCompositions.PendingRows {...args} />
            </Table.Body>
            <Table.Foot sticky>
                <Table.Row>
                    <Table.Cell colSpan={3}>
                        Total items: <i className="font-light">Loading...</i>
                    </Table.Cell>
                </Table.Row>
            </Table.Foot>
        </Table.Root>
    ),
};

export const Fill: StoryObj<PendingRowsProps & { height: number }> = {
    args: { rowCount: "fill", height: 400 },
    parameters: {
        docs: {
            description: {
                story: 'Setting rowCount to `"fill"` will automatically render as many rows as can fit in the available vertical space, based on the row height.',
            },
        },
    },

    render: ({ height, ...args }) => (
        <div className="w-full resize overflow-hidden" style={{ height }}>
            <Table.Root layoutClassName="w-full h-full">
                <Table.Head sticky>
                    <Table.Column colKey="id">ID</Table.Column>
                    <Table.Column colKey="name">Name</Table.Column>
                    <Table.Column colKey="email">Email</Table.Column>
                </Table.Head>
                <Table.Body>
                    <TableCompositions.PendingRows {...args} />
                </Table.Body>
                <Table.Foot sticky>
                    <Table.Row>
                        <Table.Cell colSpan={3}>
                            Total items: <i className="font-light">Loading...</i>
                        </Table.Cell>
                    </Table.Row>
                </Table.Foot>
            </Table.Root>
        </div>
    ),
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const IndividualRows: StoryObj<{}> = {
    parameters: {
        docs: {
            description: {
                story: "If only a single row is needed, the `<PendingRow />` composition can be used",
            },
        },
    },
    render: () => (
        <Table.Root layoutClassName="w-full">
            <Table.Head sticky>
                <Table.Column colKey="id">ID</Table.Column>
                <Table.Column colKey="name">Name</Table.Column>
                <Table.Column colKey="email">Email</Table.Column>
            </Table.Head>
            <Table.Body>
                <Table.Row>
                    <Table.Cell>0</Table.Cell>
                    <Table.Cell>Grace Wilson</Table.Cell>
                    <Table.Cell>wilson.g@example.com</Table.Cell>
                </Table.Row>

                {/* ———————————————————————— */}
                <TableCompositions.PendingRow />
                {/* ———————————————————————— */}

                <Table.Row>
                    <Table.Cell>2</Table.Cell>
                    <Table.Cell>Jack Anderson</Table.Cell>
                    <Table.Cell>andersoj@example.com</Table.Cell>
                </Table.Row>
                <Table.Row>
                    <Table.Cell>3</Table.Cell>
                    <Table.Cell>Alice Johnson</Table.Cell>
                    <Table.Cell>ajohnson@example.com</Table.Cell>
                </Table.Row>
            </Table.Body>
            <Table.Foot sticky>
                <Table.Row>
                    <Table.Cell colSpan={3}>
                        Total items: <i className="font-light">Loading...</i>
                    </Table.Cell>
                </Table.Row>
            </Table.Foot>
        </Table.Root>
    ),
};

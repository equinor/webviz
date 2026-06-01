import React from "react";

import { DragIndicator } from "@mui/icons-material";
import type { Meta, StoryObj } from "@storybook/react";
import { flatMap, orderBy, range } from "lodash";

import { SortableList } from "@lib/components/SortableList";
import { arrayMove } from "@lib/utils/arrays";

import { Banner } from "../Banner";
import { Typography } from "../Typography";
import { Virtualization } from "../Virtualization";

import { TableCompositions } from "./compositions";
import { SortDirection } from "./typesAndEnums";

import { Table } from ".";

type TExampleData = { id: number; email: string; name: string };
const EXAMPLE_DATA: TExampleData[] = [
    { id: 0, name: "Grace Wilson", email: "wilson.g@example.com" },
    { id: 1, name: "David Brown", email: "d.brown@example.com" },
    { id: 2, name: "Jack Anderson", email: "andersoj@example.com" },
    { id: 3, name: "Alice Johnson", email: "ajohnson@example.com" },
    { id: 4, name: "Henry Moore", email: "moore.h@example.com" },
    { id: 5, name: "Iris Taylor", email: "t.iris@example.com" },
    { id: 6, name: "Bob Smith", email: "smithb@example.com" },
    { id: 7, name: "Emma Davis", email: "e.davis@example.com" },
    { id: 8, name: "Carol Williams", email: "c.williams@example.com" },
    { id: 9, name: "Frank Miller", email: "millerf@example.com" },
];

type SortingConf = {
    [colKey: string]: SortDirection;
};

const meta: Meta<typeof Table.Root> = {
    title: "Components/Table",
    component: Table.Root,
    tags: ["autodocs"],
    parameters: {
        layout: "centered",
    },
    argTypes: {
        sortable: { control: "boolean" },
        selectable: { control: "boolean" },
        size: { control: "select", options: ["small", "default", "large"] },
    },

    decorators: [
        (Story) => {
            return (
                // TODO: Can't get the layout and stuff to stretch horizontally in a nice way, so hard-coding some sizes here
                <div className="flex h-full w-[80vw] max-w-[850px] items-center">
                    <Story />
                </div>
            );
        },
        // Add state variables to keep track of sorting and selection state
        function SortableAndSelectable(Story, ctx) {
            const [tableSortingState, setTableSortingState] = React.useState<SortingConf>({});
            const [selectedRow, setSelectedRow] = React.useState<string | null>(null);

            function handleChangeSortDirection(colKey: string, direction: SortDirection) {
                setTableSortingState({ [colKey]: direction });
            }

            return (
                <>
                    <Story
                        args={{
                            ...ctx.args,
                            currentSort: tableSortingState,
                            selectedRow: selectedRow,
                            onRowSelect: setSelectedRow,
                            onChangeSortDirection: handleChangeSortDirection,
                        }}
                    />

                    {(ctx.args.sortable || ctx.args.selectable) && (
                        <Banner layoutClassName="mt-horizontal-md gap-vertical-3xs flex rounded bg-gray-100 p-4 text-sm fixed py-vertical-2xs px-horizontal-2xs">
                            {ctx.args.sortable && (
                                <Typography family="body" size="xs" as="p">
                                    <strong>Sort State:</strong> {JSON.stringify(tableSortingState, null, 2)}
                                </Typography>
                            )}

                            {ctx.args.selectable && (
                                <Typography family="body" size="xs" as="p">
                                    <strong>Selected Row:</strong> {selectedRow ?? "None"}
                                </Typography>
                            )}
                        </Banner>
                    )}
                </>
            );
        },
    ],
};

export default meta;
type Story = StoryObj<typeof Table.Root>;

export const Default: Story = {
    render: (args) => (
        <Table.Root layoutClassName="w-full" {...args}>
            <Table.Head>
                <Table.Column colKey="id">ID</Table.Column>
                <Table.Column colKey="name">Name</Table.Column>
                <Table.Column colKey="email">Email</Table.Column>
            </Table.Head>
            <Table.Body>
                <Table.Row rowKey="0">
                    <Table.Cell>0</Table.Cell>
                    <Table.Cell>Grace Wilson</Table.Cell>
                    <Table.Cell>wilson.g@example.com</Table.Cell>
                </Table.Row>
                <Table.Row rowKey="1">
                    <Table.Cell>1</Table.Cell>
                    <Table.Cell>David Brown</Table.Cell>
                    <Table.Cell>d.brown@example.com</Table.Cell>
                </Table.Row>
                <Table.Row rowKey="2">
                    <Table.Cell>2</Table.Cell>
                    <Table.Cell>Jack Anderson</Table.Cell>
                    <Table.Cell>andersoj@example.com</Table.Cell>
                </Table.Row>
            </Table.Body>
            <Table.Foot>
                <Table.Row>
                    <Table.Cell colSpan={3}>Total items: 3</Table.Cell>
                </Table.Row>
            </Table.Foot>
        </Table.Root>
    ),
};

export const NoData: Story = {
    parameters: {
        docs: {
            description: {
                story: 'If a table body is empty, it will automatically render a "No data" row',
            },
        },
    },
    render: (args) => (
        <Table.Root layoutClassName="w-full" {...args}>
            <Table.Head>
                <Table.Column colKey="id">ID</Table.Column>
                <Table.Column colKey="name">Name</Table.Column>
                <Table.Column colKey="email">Email</Table.Column>
            </Table.Head>
            <Table.Body>{/* Left empty */}</Table.Body>
        </Table.Root>
    ),
};

export const Sorting: Story = {
    args: { sortable: true },
    render: function SortingComp(args) {
        const sortedTableData = React.useMemo(() => {
            const [key, direction] = Object.entries(args.currentSort ?? {})[0] ?? [];

            if (!direction || direction === SortDirection.NONE) return EXAMPLE_DATA;

            return orderBy(EXAMPLE_DATA, key, direction);
        }, [args.currentSort]);

        return (
            <Table.Root {...args} layoutClassName="w-[80vw]">
                <Table.Head>
                    <Table.Column colKey="id">ID</Table.Column>
                    <Table.Column colKey="name">Name</Table.Column>
                    <Table.Column colKey="email">Email</Table.Column>
                </Table.Head>
                <Table.Body>
                    <ExampleTableDataRows data={sortedTableData} />
                </Table.Body>
            </Table.Root>
        );
    },
};

export const NestedHeaders: Story = {
    args: { sortable: true },
    render: function SortingComp(args) {
        return (
            <Table.Root layoutClassName="w-[80vw]" {...args}>
                <Table.Head>
                    <Table.Column colKey="id">ID</Table.Column>
                    <Table.Column>
                        User Information
                        <Table.Column>
                            Name
                            <Table.Column colKey="firstName">First Name</Table.Column>
                            <Table.Column colKey="lastName">Last Name</Table.Column>
                        </Table.Column>
                        <Table.Column>
                            Contact
                            <Table.Column colKey="email">Email</Table.Column>
                            <Table.Column>
                                Phone
                                <Table.Column colKey="mobile">Mobile</Table.Column>
                                <Table.Column colKey="landline">Landline</Table.Column>
                            </Table.Column>
                        </Table.Column>
                    </Table.Column>
                    <Table.Column>
                        Metadata
                        <Table.Column>
                            Timestamps
                            <Table.Column>
                                Created
                                <Table.Column colKey="createdDate">Date</Table.Column>
                                <Table.Column colKey="createdTime">Time</Table.Column>
                            </Table.Column>
                            <Table.Column colKey="modified">Modified</Table.Column>
                        </Table.Column>
                        <Table.Column colKey="status">Status</Table.Column>
                    </Table.Column>
                </Table.Head>

                <Table.Body>
                    <Table.Row rowKey="0">
                        <Table.Cell>0</Table.Cell>
                        <Table.Cell>Grace</Table.Cell>
                        <Table.Cell>Wilson</Table.Cell>
                        <Table.Cell>wilson.g@example.com</Table.Cell>
                        <Table.Cell>+1-555-0100</Table.Cell>
                        <Table.Cell>+1-555-0101</Table.Cell>
                        <Table.Cell>2024-01-15</Table.Cell>
                        <Table.Cell>09:30:00</Table.Cell>
                        <Table.Cell>2024-01-20</Table.Cell>
                        <Table.Cell>Active</Table.Cell>
                    </Table.Row>
                </Table.Body>
            </Table.Root>
        );
    },
};

export const Compact: Story = {
    args: { compact: true },
    render: (args) => (
        <Table.Root layoutClassName="w-[80vw]" {...args}>
            <Table.Head>
                <Table.Column colKey="id">ID</Table.Column>
                <Table.Column colKey="name">Name</Table.Column>
                <Table.Column colKey="email">Email</Table.Column>
            </Table.Head>
            <Table.Body>
                <ExampleTableDataRows data={EXAMPLE_DATA} />
            </Table.Body>
        </Table.Root>
    ),
};

export const Overflow: Story = {
    args: { compact: true },
    render: (args) => (
        <Table.Root layoutClassName="w-full max-h-[50vh] overflow-auto" {...args}>
            <Table.Head sticky>
                <Table.Column colKey="id">ID</Table.Column>
                <Table.Column colKey="name">Name</Table.Column>
                <Table.Column colKey="email">Email</Table.Column>
            </Table.Head>
            <Table.Body>
                {/* {range(0, 100)} */}
                {/* TODO: Virtualization */}
                <ExampleTableDataRows data={EXAMPLE_DATA} />
                <ExampleTableDataRows data={EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * 1 }))} />
                <ExampleTableDataRows data={EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * 2 }))} />
                <ExampleTableDataRows data={EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * 3 }))} />
                <ExampleTableDataRows data={EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * 4 }))} />
                <ExampleTableDataRows data={EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * 5 }))} />
                <ExampleTableDataRows data={EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * 6 }))} />
                <ExampleTableDataRows data={EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * 7 }))} />
                <ExampleTableDataRows data={EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * 8 }))} />
                <ExampleTableDataRows data={EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * 9 }))} />
            </Table.Body>
            <Table.Foot sticky>
                <Table.Row>
                    <Table.Cell colSpan={3}>Total items: 100</Table.Cell>
                </Table.Row>
            </Table.Foot>
        </Table.Root>
    ),
};

export const WithVirtualization: Story = {
    args: { compact: true },

    render: function WithVirtualizationComp(args) {
        const tableWrapperRef = React.useRef(null);
        const exampleData = React.useMemo(
            () =>
                flatMap<TExampleData>(
                    range(0, 1000).map((i) => EXAMPLE_DATA.map((c) => ({ ...c, id: c.id + EXAMPLE_DATA.length * i }))),
                ),
            [],
        );

        return (
            <Table.Root
                layoutClassName="w-full max-h-[50vh] overflow-auto"
                {...args}
                fixed
                overflowWrapperRef={tableWrapperRef}
            >
                <Table.Head sticky>
                    <Table.Column width={20} colKey="id">
                        ID
                    </Table.Column>
                    <Table.Column width={60} colKey="name">
                        Name
                    </Table.Column>
                    <Table.Column width={60} colKey="email">
                        Email
                    </Table.Column>
                </Table.Head>
                <Table.Body>
                    <Virtualization
                        containerRef={tableWrapperRef}
                        direction="vertical"
                        items={exampleData}
                        placeholderComponent="tr"
                        itemSize={{ small: 29, default: 33, large: 37 }[args.size ?? "default"]}
                        renderItem={(datum: TExampleData) => (
                            <Table.Row key={datum.id} rowKey={String(datum.id)}>
                                <Table.Cell>{datum.id}</Table.Cell>
                                <Table.Cell>{datum.name}</Table.Cell>
                                <Table.Cell>{datum.email}</Table.Cell>
                            </Table.Row>
                        )}
                    />
                </Table.Body>
                <Table.Foot sticky>
                    <Table.Row>
                        <Table.Cell colSpan={3}>Total items: {exampleData.length}</Table.Cell>
                    </Table.Row>
                </Table.Foot>
            </Table.Root>
        );
    },
};

export const WithSortableList: Story = {
    name: "With SortableList",
    render: function DraggableComponent(args) {
        const tableBodyRef = React.useRef<HTMLTableSectionElement | null>(null);

        const [orderedData, setOrderedData] = React.useState(EXAMPLE_DATA);

        function handleItemMoved(movedItemId: string, position: number) {
            setOrderedData((prev) => {
                const oldPos = prev.findIndex((d) => d.id === Number(movedItemId));
                return arrayMove(prev, oldPos, position);
            });
        }

        return (
            <SortableList className="w-full" isMoveAllowed={() => true} onItemMoved={handleItemMoved}>
                <SortableList.ScrollContainer>
                    <Table.Root layoutClassName="table-fixed" {...args}>
                        <SortableList.NoDropZone>
                            <Table.Head>
                                {/* Add column to show the drag indicator, and explicitly make it unsortable */}
                                <Table.Column width={1} colKey="handle" sortable={false} />
                                <Table.Column colKey="id">ID</Table.Column>
                                <Table.Column colKey="name">Name</Table.Column>
                                <Table.Column colKey="email">Email</Table.Column>
                            </Table.Head>
                        </SortableList.NoDropZone>
                        <SortableList.Content>
                            <Table.Body ref={tableBodyRef}>
                                {orderedData.map((datum) => (
                                    <SortableList.Item key={datum.id} id={String(datum.id)}>
                                        <Table.Row rowKey={String(datum.id)}>
                                            <Table.Cell>
                                                <SortableList.DragHandle className="flex items-center justify-center">
                                                    <DragIndicator fontSize="inherit" className="pointer-events-none" />
                                                </SortableList.DragHandle>
                                            </Table.Cell>
                                            <Table.Cell>{datum.id}</Table.Cell>
                                            <Table.Cell>{datum.name}</Table.Cell>
                                            <Table.Cell>{datum.email}</Table.Cell>
                                        </Table.Row>
                                    </SortableList.Item>
                                ))}
                            </Table.Body>
                        </SortableList.Content>
                    </Table.Root>
                </SortableList.ScrollContainer>
            </SortableList>
        );
    },
};

export const CompositionPendingRows: Story = {
    name: "Composition – PendingRows",
    parameters: {
        docs: {
            description: {
                story: 'This composition renders 1 or more skeleton rows, that can be used while data is being fetched. Use `rowCount="fill"` to fill available space or pass a number for a specific count of skeleton rows.',
            },
        },
    },
    argTypes: {
        height: { control: "number" },
        // @ts-expect-error Custom arg for this specific story
        rowCount: {
            control: "select",
            options: ["fill", 3, 5, 10, 20],
        },
    },
    args: {
        height: 400,
        // @ts-expect-error Custom arg for this specific story
        rowCount: "fill" as "fill" | number,
    },

    render: ({
        height,
        // @ts-expect-error Custom arg for this specific story
        rowCount,
        ...args
    }) => (
        <div className="w-full resize overflow-hidden" style={{ height }}>
            <Table.Root layoutClassName="w-full h-full" {...args}>
                <Table.Head sticky>
                    <Table.Column colKey="id">ID</Table.Column>
                    <Table.Column colKey="name">Name</Table.Column>
                    <Table.Column colKey="email">Email</Table.Column>
                </Table.Head>
                <Table.Body>
                    <TableCompositions.PendingRows rowCount={rowCount} />
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

function ExampleTableDataRows(props: { data: readonly TExampleData[] }): React.ReactNode {
    return props.data.map((datum, i) => (
        <Table.Row rowKey={String(datum.id)} key={datum.id ?? i}>
            {Object.values(datum).map((v) => (
                <Table.Cell key={v}>{v}</Table.Cell>
            ))}
        </Table.Row>
    ));
}

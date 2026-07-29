import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import type { SmartNodeSelectorSelection } from "./smartNodeSelector";

import { SmartNodeSelector } from "./index";

const wellTreeData = [
    {
        id: "field-a",
        name: "Field A",
        children: [
            {
                id: "well-a1",
                name: "Well A1",
                children: [
                    { id: "well-a1-op", name: "OP" },
                    { id: "well-a1-wa", name: "WA" },
                ],
            },
            {
                id: "well-a2",
                name: "Well A2",
                children: [
                    { id: "well-a2-op", name: "OP" },
                    { id: "well-a2-wa", name: "WA" },
                ],
            },
        ],
    },
    {
        id: "field-b",
        name: "Field B",
        children: [
            {
                id: "well-b1",
                name: "Well B1",
                children: [{ id: "well-b1-op", name: "OP" }],
            },
            {
                id: "well-b2",
                name: "Well B2",
                children: [{ id: "well-b2-op", name: "OP" }],
            },
        ],
    },
];

const flatTreeData = [
    { id: "alpha", name: "Alpha" },
    { id: "beta", name: "Beta" },
    { id: "gamma", name: "Gamma" },
    { id: "delta", name: "Delta" },
    { id: "epsilon", name: "Epsilon" },
];

const withPortalRoot = (Story: React.ComponentType) => (
    <>
        <Story />
        <div id="portal-root" />
    </>
);

const meta: Meta<typeof SmartNodeSelector> = {
    title: "Components/SmartNodeSelector",
    component: SmartNodeSelector,
    parameters: {
        layout: "padded",
    },
    tags: ["autodocs"],
    decorators: [withPortalRoot],
    argTypes: {
        placeholder: { control: "text" },
        maxNumSelectedNodes: { control: "number" },
        showSuggestions: { control: "boolean" },
        lineBreakAfterTag: { control: "boolean" },
        caseInsensitiveMatching: { control: "boolean" },
        delimiter: { control: "text" },
    },
};

export default meta;
type Story = StoryObj<typeof SmartNodeSelector>;

export const Default: Story = {
    args: {
        data: wellTreeData,
        placeholder: "Add new tag...",
    },
};

export const WithPreselectedTags: Story = {
    args: {
        data: wellTreeData,
        selectedTags: ["Field A:Well A1:OP", "Field B:Well B1:OP"],
    },
};

export const MaxTwoSelections: Story = {
    args: {
        data: wellTreeData,
        maxNumSelectedNodes: 2,
    },
};

export const SingleSelection: Story = {
    args: {
        data: wellTreeData,
        maxNumSelectedNodes: 1,
        placeholder: "Pick a well...",
    },
};

export const FlatData: Story = {
    args: {
        data: flatTreeData,
        placeholder: "Type to search...",
    },
};

export const NoSuggestions: Story = {
    args: {
        data: wellTreeData,
        showSuggestions: false,
    },
};

export const LineBreakAfterTag: Story = {
    args: {
        data: wellTreeData,
        lineBreakAfterTag: true,
        selectedTags: ["Field A:Well A1:OP", "Field A:Well A2:WA", "Field B:Well B1:OP"],
    },
};

export const CaseInsensitiveMatching: Story = {
    args: {
        data: wellTreeData,
        caseInsensitiveMatching: true,
    },
};

function WithChangeCallbackRender(args: React.ComponentProps<typeof SmartNodeSelector>) {
    const [selection, setSelection] = React.useState<SmartNodeSelectorSelection>({
        selectedTags: [],
        selectedNodes: [],
        selectedIds: [],
    });

    return (
        <div className="flex flex-col gap-4">
            <SmartNodeSelector {...args} onValueChange={setSelection} />
            <div className="text-neutral-strong text-body-sm p-2xs rounded border">
                <div>
                    <strong>Selected nodes:</strong>{" "}
                    {selection.selectedNodes.length > 0 ? selection.selectedNodes.join(", ") : "none"}
                </div>
                <div>
                    <strong>Selected IDs:</strong>{" "}
                    {selection.selectedIds.length > 0 ? selection.selectedIds.join(", ") : "none"}
                </div>
            </div>
        </div>
    );
}

export const WithChangeCallback: Story = {
    render: (args) => <WithChangeCallbackRender {...args} />,
    args: {
        data: wellTreeData,
    },
};

export const CustomDelimiter: Story = {
    args: {
        data: [
            {
                name: "Region 1",
                children: [
                    { name: "Zone A", children: [{ name: "Layer 1" }, { name: "Layer 2" }] },
                    { name: "Zone B", children: [{ name: "Layer 1" }] },
                ],
            },
            {
                name: "Region 2",
                children: [{ name: "Zone C", children: [{ name: "Layer 1" }] }],
            },
        ],
        delimiter: "/",
        placeholder: "e.g. Region 1/Zone A/Layer 1",
    },
};

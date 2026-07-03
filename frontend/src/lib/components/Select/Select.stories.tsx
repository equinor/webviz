import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Select } from "./index";
import type { SelectOption } from "./index";

const FRUITS: SelectOption[] = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry" },
    { value: "date", label: "Date" },
    { value: "elderberry", label: "Elderberry" },
    { value: "fig", label: "Fig" },
    { value: "grape", label: "Grape" },
];

const meta: Meta<typeof Select> = {
    title: "Components/Select",
    component: Select,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A virtualized listbox for selecting one or more values from a list.

## Basic usage

\`\`\`tsx
import { Select } from "@/lib/newComponents/Select";

<Select
  options={[
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ]}
  size={4}
  onChange={(values) => console.log(values)}
/>
\`\`\`

## Multiple selection

Enable \`multiple\` to allow the user to select several values at once.
Hold **Shift** to range-select, **Ctrl** to toggle individual items,
or use **Ctrl+Space** on the keyboard.

## Filtering

Set \`filter\` to show a text input above the list that narrows options by label.

## Quick-select buttons

Set \`showQuickSelectButtons\` (requires \`multiple\`) to add
**Select all** / **Unselect all** buttons above the list.
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: { control: "boolean" },
        filter: { control: "boolean" },
        multiple: { control: "boolean" },
        size: { control: { type: "number", min: 1, max: 20 } },
        optionHeight: { control: { type: "number", min: 16, max: 48 } },
        showQuickSelectButtons: { control: "boolean" },
        width: { control: "text" },
    },
    args: {
        options: FRUITS,
        size: 5,
        disabled: false,
        filter: false,
        multiple: false,
        showQuickSelectButtons: false,
    },
};

export default meta;
type Story = StoryObj<typeof Select>;

// ─── Single selection ─────────────────────────────────────────────────────────

export const Default: Story = {
    parameters: {
        docs: { description: { story: "Single-select list. Click an item to select it." } },
    },
};

export const Disabled: Story = {
    parameters: {
        docs: { description: { story: "The entire list is inert when `disabled` is set." } },
    },
    args: {
        disabled: true,
        value: ["banana"],
    },
};

export const WithDisabledOptions: Story = {
    parameters: {
        docs: {
            description: { story: "Individual options can be disabled via the `disabled` flag on each option object." },
        },
    },
    args: {
        options: [
            { value: "apple", label: "Apple" },
            { value: "banana", label: "Banana", disabled: true },
            { value: "cherry", label: "Cherry" },
            { value: "date", label: "Date", disabled: true },
            { value: "elderberry", label: "Elderberry" },
        ],
    },
};

export const WithPlaceholder: Story = {
    parameters: {
        docs: { description: { story: "Custom text shown when `options` is empty." } },
    },
    args: {
        options: [],
        placeholder: "No items available",
        size: 3,
    },
};

// ─── Filtering ────────────────────────────────────────────────────────────────

export const WithFilter: Story = {
    parameters: {
        docs: {
            description: {
                story: "Set `filter` to show a search input above the list. Options are narrowed by label as you type.",
            },
        },
    },
    args: {
        filter: true,
        size: 6,
        options: FRUITS,
    },
};

// ─── Multiple selection ───────────────────────────────────────────────────────

export const MultiSelect: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Enable `multiple` to allow selecting several items. " +
                    "Hold **Shift** to range-select, **Ctrl** to toggle individual items.",
            },
        },
    },
    args: {
        multiple: true,
        size: 6,
        value: ["apple", "cherry"],
    },
};

function WithQuickSelectButtonsRender() {
    const [value, setValue] = React.useState<string[]>(["apple"]);
    return (
        <div className="flex flex-col gap-2">
            <Select options={FRUITS} value={value} onValueChange={setValue} multiple showQuickSelectButtons size={6} />
            <p className="text-sm text-neutral-500">Selected: {value.join(", ") || "none"}</p>
        </div>
    );
}

export const WithQuickSelectButtons: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "`showQuickSelectButtons` adds **Select all** and **Unselect all** buttons above the list. " +
                    "Requires `multiple`.",
            },
        },
    },
    render: () => <WithQuickSelectButtonsRender />,
};

// ─── Controlled ───────────────────────────────────────────────────────────────

function ControlledRender() {
    const [value, setValue] = React.useState<string[]>(["banana"]);
    return (
        <div className="flex flex-col gap-2">
            <Select options={FRUITS} value={value} onValueChange={setValue} size={5} />
            <p className="text-sm text-neutral-500">Selected: {value[0] ?? "none"}</p>
        </div>
    );
}

export const Controlled: Story = {
    parameters: {
        docs: {
            description: {
                story: "Pass `value` and `onChange` to own the selection state externally.",
            },
        },
    },
    render: () => <ControlledRender />,
};

// ─── Adornments & hover text ──────────────────────────────────────────────────

export const WithAdornments: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Each option accepts an `adornment` node rendered before the label — " +
                    "useful for icons, color swatches, or status indicators.",
            },
        },
    },
    args: {
        size: 5,
        options: [
            { value: "error", label: "Error", adornment: <span className="text-red-500">●</span> },
            { value: "warning", label: "Warning", adornment: <span className="text-yellow-500">●</span> },
            { value: "info", label: "Info", adornment: <span className="text-blue-500">●</span> },
            { value: "success", label: "Success", adornment: <span className="text-green-500">●</span> },
            { value: "unknown", label: "Unknown", adornment: <span className="text-gray-400">●</span> },
        ],
    },
};

export const WithHoverText: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Set `hoverText` on an option to show a tooltip title on hover — " +
                    "useful when labels are truncated.",
            },
        },
    },
    args: {
        size: 4,
        width: 160,
        options: [
            {
                value: "a",
                label: "Short",
                hoverText: "This is a short option",
            },
            {
                value: "b",
                label: "A much longer option label that will be truncated",
                hoverText: "A much longer option label that will be truncated",
            },
            {
                value: "c",
                label: "Another long option label here",
                hoverText: "Another long option label here",
            },
        ],
    },
};

// ─── Large list (virtualization) ──────────────────────────────────────────────

export const LargeList: Story = {
    parameters: {
        docs: {
            description: {
                story: "The list is virtualized — only visible rows are rendered. " + "This story renders 500 options.",
            },
        },
    },
    args: {
        filter: true,
        multiple: true,
        size: 10,
        options: Array.from({ length: 500 }, (_, i) => ({
            value: `item-${i}`,
            label: `Item ${i + 1}`,
        })),
    },
};

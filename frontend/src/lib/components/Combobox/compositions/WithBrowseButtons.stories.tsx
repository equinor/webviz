import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { WithBrowseButtons } from "./withBrowseButtons";

const SEASONS = [
    { value: "spring", label: "Spring" },
    { value: "summer", label: "Summer" },
    { value: "autumn", label: "Autumn" },
    { value: "winter", label: "Winter" },
];

const MONTHS_BY_SEASON = [
    {
        value: "Spring",
        items: [
            { value: "march", label: "March" },
            { value: "april", label: "April" },
            { value: "may", label: "May" },
        ],
    },
    {
        value: "Summer",
        items: [
            { value: "june", label: "June" },
            { value: "july", label: "July" },
            { value: "august", label: "August" },
        ],
    },
    {
        value: "Autumn",
        items: [
            { value: "september", label: "September" },
            { value: "october", label: "October" },
            { value: "november", label: "November" },
        ],
    },
    {
        value: "Winter",
        items: [
            { value: "december", label: "December" },
            { value: "january", label: "January" },
            { value: "february", label: "February" },
        ],
    },
];

const meta: Meta<typeof WithBrowseButtons> = {
    title: "Components/Combobox/WithBrowseButtons",
    component: WithBrowseButtons,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component:
                    "A Combobox with integrated up/down arrow buttons for cycling through options without opening the dropdown.",
            },
        },
    },
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div className="w-72">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof WithBrowseButtons>;

export const Default: Story = {
    parameters: {
        docs: {
            description: { story: "Uncontrolled — the composition manages its own value state." },
        },
    },
    args: {
        items: SEASONS,
        defaultValue: "spring",
        placeholder: "Select a season",
    },
};

export const Controlled: Story = {
    parameters: {
        docs: {
            description: { story: "Fully controlled — external state owns the selected value." },
        },
    },
    render: function ControlledComp() {
        const [value, setValue] = React.useState<string | null>("spring");
        return (
            <div className="flex flex-col gap-3">
                <WithBrowseButtons
                    items={SEASONS}
                    value={value}
                    onValueChange={setValue}
                    placeholder="Select a season"
                />
                <p className="text-body-sm text-neutral-subtle">
                    Selected: {value ? (SEASONS.find((s) => s.value === value)?.label ?? value) : "none"}
                </p>
            </div>
        );
    },
};

export const WithGroupedItems: Story = {
    parameters: {
        docs: {
            description: {
                story: "Browse buttons navigate across groups in flattened order.",
            },
        },
    },
    args: {
        items: MONTHS_BY_SEASON,
        defaultValue: "march",
        placeholder: "Select a month",
    },
};

export const Disabled: Story = {
    parameters: {
        docs: {
            description: { story: "Both the combobox and the browse buttons are disabled together." },
        },
    },
    args: {
        items: SEASONS,
        defaultValue: "summer",
        disabled: true,
    },
};

export const ReadOnly: Story = {
    parameters: {
        docs: {
            description: { story: "Browse buttons are disabled when the combobox is readonly" },
        },
    },
    args: {
        items: SEASONS,
        defaultValue: "summer",
        readOnly: true,
    },
};

export const Sizes: Story = {
    parameters: {
        docs: {
            description: { story: "The size prop scales the combobox and browse buttons together." },
        },
    },
    render: () => (
        <div className="flex flex-col gap-4">
            <WithBrowseButtons items={SEASONS} defaultValue="spring" size="small" placeholder="Small" />
            <WithBrowseButtons items={SEASONS} defaultValue="summer" size="default" placeholder="Default" />
            <WithBrowseButtons items={SEASONS} defaultValue="autumn" size="large" placeholder="Large" />
        </div>
    ),
};

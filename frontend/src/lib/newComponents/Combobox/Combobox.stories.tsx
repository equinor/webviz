import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Field } from "@lib/newComponents/Field";

import { Combobox } from "./index";

const COUNTRIES_BY_CONTINENT = [
    {
        value: "africa",
        items: [
            { value: "eg", label: "Egypt" },
            { value: "ng", label: "Nigeria" },
            { value: "za", label: "South Africa" },
            { value: "ke", label: "Kenya" },
        ],
    },
    {
        value: "americas",
        items: [
            { value: "br", label: "Brazil" },
            { value: "ca", label: "Canada" },
            { value: "mx", label: "Mexico" },
            { value: "us", label: "United States" },
        ],
    },
    {
        value: "asia",
        items: [
            { value: "cn", label: "China" },
            { value: "in", label: "India" },
            { value: "jp", label: "Japan" },
            { value: "kr", label: "South Korea" },
        ],
    },
    {
        value: "europe",
        items: [
            { value: "de", label: "Germany" },
            { value: "fr", label: "France" },
            { value: "no", label: "Norway" },
            { value: "gb", label: "United Kingdom" },
        ],
    },
    {
        value: "oceania",
        items: [
            { value: "au", label: "Australia" },
            { value: "nz", label: "New Zealand" },
        ],
    },
];

const COUNTRIES = COUNTRIES_BY_CONTINENT.flatMap((group) => group.items);

const meta: Meta<typeof Combobox> = {
    title: "Components/Combobox",
    component: Combobox,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component:
                    "A filterable select input that lets the user type to narrow down a list of options. Supports single and multiple selection, grouping, and controlled state.",
            },
        },
    },
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div className="w-64">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        placeholder: { control: "text" },
        noMatchesText: { control: "text" },
        clearable: { control: "boolean" },
        disabled: { control: "boolean" },
    },
};

export default meta;
type Story = StoryObj<typeof Combobox>;

export const Default: Story = {
    parameters: {
        docs: {
            description: { story: "Basic single-select combobox with a flat list of items." },
        },
    },
    args: {
        items: COUNTRIES,
        placeholder: "Select a country",
    },
};

export const Clearable: Story = {
    parameters: {
        docs: {
            description: { story: "Shows a clear button once a value is selected." },
        },
    },
    args: {
        items: COUNTRIES,
        clearable: true,
        defaultValue: { value: "no", label: "Norway" },
    },
};

export const WithDefaultValue: Story = {
    parameters: {
        docs: {
            description: { story: "Renders with an item pre-selected via `defaultValue`." },
        },
    },
    args: {
        items: COUNTRIES,
        defaultValue: { value: "de", label: "Germany" },
        clearable: true,
    },
};

export const MultipleSelect: Story = {
    parameters: {
        docs: {
            description: { story: "Pass `multiple` to allow selecting more than one item." },
        },
    },
    render: () => (
        <div className="w-64">
            <Combobox items={COUNTRIES} multiple clearable placeholder="Select countries" />
        </div>
    ),
};

export const GroupedItems: Story = {
    parameters: {
        docs: {
            description: {
                story: "Pass an array of `{ value, items }` group objects to organise options under labelled headings.",
            },
        },
    },
    render: () => (
        <div className="w-64">
            <Combobox items={COUNTRIES_BY_CONTINENT} placeholder="Select a country" clearable />
        </div>
    ),
};

export const Controlled: Story = {
    parameters: {
        docs: {
            description: { story: "Fully controlled — external state owns the selected value." },
        },
    },
    render: () => {
        const [value, setValue] = React.useState<{ value: string; label: string } | null>(null);
        return (
            <div className="flex w-64 flex-col gap-3">
                <Combobox
                    items={COUNTRIES}
                    value={value}
                    onValueChange={setValue}
                    clearable
                    placeholder="Select a country"
                />
                <p className="text-body-sm text-neutral-subtle">
                    Selected: {value ? value.label : "none"}
                </p>
            </div>
        );
    },
};

export const Disabled: Story = {
    parameters: {
        docs: {
            description: { story: "The combobox cannot be interacted with when disabled." },
        },
    },
    args: {
        items: COUNTRIES,
        disabled: true,
        placeholder: "Disabled",
    },
};

export const CustomNoMatchesText: Story = {
    parameters: {
        docs: {
            description: { story: "Override the fallback text shown when filtering returns no results." },
        },
    },
    args: {
        items: COUNTRIES,
        noMatchesText: "Nothing here…",
        placeholder: "Try typing 'xyz'",
    },
};

export const WithField: Story = {
    parameters: {
        docs: {
            description: {
                story: "Wrap in `Field.Root` to attach an accessible label and description.",
            },
        },
    },
    render: () => (
        <div className="w-64">
            <Field.Root>
                <Field.Label>Country</Field.Label>
                <Field.Details>Select your country of residence.</Field.Details>
                <Combobox items={COUNTRIES} clearable placeholder="Select a country" />
            </Field.Root>
        </div>
    ),
};

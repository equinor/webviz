import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Checkbox } from "../Checkbox";

import { CheckboxGroup } from "./index";

const meta: Meta<typeof CheckboxGroup> = {
    title: "Components/CheckboxGroup",
    component: CheckboxGroup,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
Provides shared state to a series of checkboxes. Children \`<Checkbox>\` components
with a \`value\` prop are automatically registered and their checked state is managed
by the group.

## Controlled vs uncontrolled

- **Uncontrolled**: pass \`defaultValue\` — the group manages state internally.
- **Controlled**: pass \`value\` + \`onValueChange\` — you own the state.

## Parent checkbox

A parent checkbox reflects whether all, some, or none of the children are checked:

1. Make the group **controlled** (\`value\` + \`onValueChange\`).
2. Pass \`allValues\` — the list of every child value — to \`CheckboxGroup\`.
3. Add the \`parent\` prop to one \`<Checkbox>\` (no \`value\` needed on it).

The group automatically drives the parent's \`indeterminate\` state when only some
children are checked.

## Labeling

Wrap the group in a \`<fieldset>\` with a \`<legend>\`, or use \`aria-labelledby\` pointing
at a visible heading.
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: { control: "boolean" },
    },
};

export default meta;
type Story = StoryObj<typeof CheckboxGroup>;

// ─── Basic ────────────────────────────────────────────────────────────────────

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: "Uncontrolled group with a pre-selected value. Items are stacked vertically by default.",
            },
        },
    },
    render: () => (
        <CheckboxGroup defaultValue={["html"]}>
            <div className="flex flex-col gap-1">
                {(["HTML", "CSS", "JavaScript", "TypeScript"] as const).map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-2 select-none">
                        <Checkbox value={item.toLowerCase()} />
                        <span>{item}</span>
                    </label>
                ))}
            </div>
        </CheckboxGroup>
    ),
};

export const Disabled: Story = {
    parameters: {
        docs: {
            description: { story: "The `disabled` prop disables every checkbox in the group at once." },
        },
    },
    render: () => (
        <CheckboxGroup defaultValue={["css"]} disabled>
            <div className="flex flex-col gap-1">
                {(["HTML", "CSS", "JavaScript"] as const).map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-2 select-none">
                        <Checkbox value={item.toLowerCase()} />
                        <span>{item}</span>
                    </label>
                ))}
            </div>
        </CheckboxGroup>
    ),
};

// ─── Parent checkbox ──────────────────────────────────────────────────────────

export const WithParent: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "A parent checkbox that selects or deselects all children at once. " +
                    "The parent shows an indeterminate state when only some children are checked. " +
                    "Requires a controlled group (`value` + `onValueChange`) and `allValues` on the group.",
            },
        },
    },
    render: () => {
        const fruits = ["apple", "banana", "cherry", "date"];
        const [value, setValue] = React.useState<string[]>(["apple", "cherry"]);

        return (
            <CheckboxGroup value={value} onValueChange={setValue} allValues={fruits}>
                <div className="flex flex-col gap-1">
                    <label className="flex cursor-pointer items-center gap-2 font-medium select-none">
                        <Checkbox parent nativeButton />
                        <span>All fruits</span>
                    </label>
                    <div className="ml-6 flex flex-col gap-1">
                        {fruits.map((fruit) => (
                            <label key={fruit} className="flex cursor-pointer items-center gap-2 select-none">
                                <Checkbox value={fruit} nativeButton />
                                <span className="capitalize">{fruit}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </CheckboxGroup>
        );
    },
};

// ─── Layouts ──────────────────────────────────────────────────────────────────

export const HorizontalLayout: Story = {
    parameters: {
        docs: {
            description: { story: "Checkboxes laid out in a horizontal row using flexbox." },
        },
    },
    render: () => (
        <CheckboxGroup defaultValue={["read"]}>
            <div className="flex flex-row gap-4">
                {(["Read", "Write", "Execute"] as const).map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-2 select-none">
                        <Checkbox value={item.toLowerCase()} />
                        <span>{item}</span>
                    </label>
                ))}
            </div>
        </CheckboxGroup>
    ),
};

export const GridLayout: Story = {
    parameters: {
        docs: {
            description: { story: "Checkboxes arranged in a two-column grid." },
        },
    },
    render: () => {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        return (
            <CheckboxGroup defaultValue={["monday", "tuesday", "wednesday", "thursday", "friday"]}>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                    {days.map((day) => (
                        <label key={day} className="flex cursor-pointer items-center gap-2 select-none">
                            <Checkbox value={day.toLowerCase()} />
                            <span>{day}</span>
                        </label>
                    ))}
                </div>
            </CheckboxGroup>
        );
    },
};

// ─── Labeling ─────────────────────────────────────────────────────────────────

export const WithFieldset: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Wrapping the group in a `<fieldset>` with a `<legend>` is the most accessible way to label a group of checkboxes.",
            },
        },
    },
    render: () => (
        <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
            <legend className="mb-2 font-medium">Notify me about</legend>
            <CheckboxGroup defaultValue={["comments"]}>
                <div className="flex flex-col gap-1">
                    {(
                        [
                            { value: "comments", label: "New comments" },
                            { value: "mentions", label: "Mentions" },
                            { value: "updates", label: "Product updates" },
                        ] as const
                    ).map(({ value, label }) => (
                        <label key={value} className="flex cursor-pointer items-center gap-2 select-none">
                            <Checkbox value={value} />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </CheckboxGroup>
        </fieldset>
    ),
};

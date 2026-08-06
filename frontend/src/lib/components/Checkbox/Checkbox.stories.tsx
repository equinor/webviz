import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Checkbox, CheckboxGroup } from "./index";

const meta: Meta<typeof Checkbox> = {
    title: "Components/Checkbox",
    component: Checkbox,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A checkbox for binary or indeterminate selections, and a group component for managing
multiple related checkboxes.

\`Checkbox\` can be used standalone or inside a \`CheckboxGroup\`. When grouped,
\`CheckboxGroup\` manages shared state; each \`Checkbox\` with a \`value\` prop is
automatically registered.

For labeled usage see **Components/Checkbox/Compositions**.
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: { control: "boolean" },
        readOnly: { control: "boolean" },
        required: { control: "boolean" },
        indeterminate: { control: "boolean" },
        defaultChecked: { control: "boolean" },
    },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Unchecked: Story = {
    parameters: {
        docs: { description: { story: "Default unchecked state (`data-unchecked`)." } },
    },
    args: {
        "aria-label": "Checkbox",
        defaultChecked: false,
    },
};

export const Checked: Story = {
    parameters: {
        docs: { description: { story: "Ticked state (`data-checked`)." } },
    },
    args: {
        "aria-label": "Checkbox",
        defaultChecked: true,
    },
};

export const Indeterminate: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Mixed state (`data-indeterminate`) — neither ticked nor unticked. " +
                    "Commonly used for a parent checkbox that controls a partially-selected group.",
            },
        },
    },
    args: {
        "aria-label": "Checkbox",
        indeterminate: true,
    },
};

export const Disabled: Story = {
    parameters: {
        docs: {
            description: {
                story: "Disabled and unchecked. Cannot be interacted with.",
            },
        },
    },
    args: {
        "aria-label": "Checkbox",
        disabled: true,
        defaultChecked: false,
    },
};

function GroupWithParentRender() {
    const fruits = ["apple", "banana", "cherry", "date"] as const;
    const [value, setValue] = React.useState<string[]>(["apple", "cherry"]);
    return (
        <CheckboxGroup value={value} onValueChange={setValue} allValues={[...fruits]}>
            <div className="flex flex-col gap-1">
                <Checkbox parent nativeButton aria-label="All fruits" />
                <div className="ml-sm gap-4xs flex flex-col">
                    {fruits.map((fruit) => (
                        <Checkbox key={fruit} value={fruit} nativeButton aria-label={fruit} />
                    ))}
                </div>
            </div>
        </CheckboxGroup>
    );
}

export const GroupWithParent: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "A parent checkbox that selects or deselects all children at once, showing an " +
                    "indeterminate state when only some are checked. Requires a controlled group with `allValues`.",
            },
        },
    },
    render: () => <GroupWithParentRender />,
};

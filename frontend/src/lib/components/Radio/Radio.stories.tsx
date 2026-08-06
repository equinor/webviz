import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Radio, RadioGroup } from "./index";

const meta: Meta<typeof Radio> = {
    title: "Components/Radio",
    component: Radio,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
Radio buttons let users select exactly one option from a set.

\`RadioGroup\` manages shared selection state; each \`Radio\` inside it represents one option.
Labels and layout are fully up to you — or use **Components/Radio/Compositions** for the
pre-wired convenience components.
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: { control: "boolean" },
    },
    args: {
        disabled: false,
    },
};

export default meta;
type Story = StoryObj<typeof Radio>;

export const Default: Story = {
    parameters: {
        docs: { description: { story: "Bare unchecked radio." } },
    },
    args: {
        "aria-label": "Option",
    },
};

export const Checked: Story = {
    parameters: {
        docs: { description: { story: "Pre-selected radio inside a group." } },
    },
    render: () => (
        <RadioGroup defaultValue="light">
            <Radio value="light" aria-label="Light" />
            <Radio value="dark" aria-label="Dark" />
            <Radio value="system" aria-label="System" />
        </RadioGroup>
    ),
};

export const Disabled: Story = {
    parameters: {
        docs: { description: { story: "Disabled state — cannot be selected." } },
    },
    args: {
        "aria-label": "Option",
        disabled: true,
    },
};

function GroupControlledRender() {
    const [value, setValue] = React.useState("monthly");
    return (
        <div className="flex flex-col gap-3">
            <RadioGroup value={value} onValueChange={setValue}>
                <Radio value="monthly" aria-label="Monthly" />
                <Radio value="yearly" aria-label="Yearly" />
            </RadioGroup>
            <p className="text-neutral-strong text-body-sm">Selected: {value}</p>
        </div>
    );
}

export const GroupControlled: Story = {
    parameters: {
        docs: {
            description: {
                story: "Controlled group — pass `value` and `onValueChange` to own the selection state externally.",
            },
        },
    },
    render: () => <GroupControlledRender />,
};

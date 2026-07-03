import type { Meta, StoryObj } from "@storybook/react";

import { Switch } from "./index";

const meta: Meta<typeof Switch> = {
    title: "Components/Switch",
    component: Switch,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A toggle switch for binary on/off settings.

For labeled usage see **Components/Switch/Compositions**.
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: { control: "boolean" },
        readOnly: { control: "boolean" },
        defaultChecked: { control: "boolean" },
    },
    args: {
        disabled: false,
        defaultChecked: false,
    },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
    parameters: {
        docs: { description: { story: "Bare switch with no label — controlled via Storybook args." } },
    },
    args: {
        "aria-label": "Toggle",
    },
};

export const Disabled: Story = {
    parameters: {
        docs: { description: { story: "Disabled state — the switch cannot be toggled." } },
    },
    args: {
        disabled: true,
        "aria-label": "Toggle",
    },
};

export const ReadOnly: Story = {
    parameters: {
        docs: {
            description: {
                story: "Read-only state — the switch shows its current value but cannot be toggled.",
            },
        },
    },
    args: {
        readOnly: true,
        defaultChecked: true,
        "aria-label": "Toggle",
    },
};

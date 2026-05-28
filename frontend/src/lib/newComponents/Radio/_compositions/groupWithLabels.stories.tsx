import type { Meta, StoryObj } from "@storybook/react";

import { RadioCompositions } from "../index";

const meta: Meta<typeof RadioCompositions.GroupWithLabels> = {
    title: "Components/Radio/Compositions/Group With Labels",
    component: RadioCompositions.GroupWithLabels,
    parameters: { layout: "centered" },
    tags: ["autodocs"],
    argTypes: {
        layout: { control: "select", options: ["vertical", "horizontal"] },
        disabled: { control: "boolean" },
        size: { control: "select", options: ["small", "default", "large"] },
    },
    args: {
        options: [
            { value: "standard", label: "Standard (3–5 days)" },
            { value: "express", label: "Express (1–2 days)" },
            { value: "overnight", label: "Overnight" },
        ],
        defaultValue: "standard",
        layout: "vertical",
        disabled: false,
        size: "default",
    },
};

export default meta;
type Story = StoryObj<typeof RadioCompositions.GroupWithLabels>;

export const Vertical: Story = {};

export const Horizontal: Story = {
    args: {
        options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "maybe", label: "Maybe" },
        ],
        defaultValue: "yes",
        layout: "horizontal",
    },
};

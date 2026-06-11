import type { Meta, StoryObj } from "@storybook/react";

import { SwitchCompositions } from "./index";

const meta: Meta<typeof SwitchCompositions.WithLabel> = {
    title: "Components/Switch/Compositions/With Label",
    component: SwitchCompositions.WithLabel,
    parameters: { layout: "centered" },
    tags: ["autodocs"],
    argTypes: {
        label: { control: "text" },
        disabled: { control: "boolean" },
        readOnly: { control: "boolean" },
        defaultChecked: { control: "boolean" },
        size: { control: "select", options: ["small", "default", "large"] },
    },
    args: {
        label: "Enable notifications",
        disabled: false,
        readOnly: false,
        defaultChecked: false,
        size: "default",
    },
};

export default meta;
type Story = StoryObj<typeof SwitchCompositions.WithLabel>;

export const Default: Story = {};

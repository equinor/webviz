import type { Meta, StoryObj } from "@storybook/react";

import { CheckboxCompositions } from "../index";

const OPTIONS = [
    { value: "mon", label: "Monday" },
    { value: "tue", label: "Tuesday" },
    { value: "wed", label: "Wednesday" },
    { value: "thu", label: "Thursday" },
    { value: "fri", label: "Friday" },
    { value: "sat", label: "Saturday", disabled: true },
    { value: "sun", label: "Sunday", disabled: true },
];

const meta: Meta<typeof CheckboxCompositions.GroupWithLabels> = {
    title: "Components/Checkbox/Compositions/Group With Labels",
    component: CheckboxCompositions.GroupWithLabels,
    parameters: { layout: "centered" },
    tags: ["autodocs"],
    argTypes: {
        layout: { control: "select", options: ["vertical", "horizontal"] },
        disabled: { control: "boolean" },
    },
    args: {
        options: OPTIONS,
        defaultValue: ["mon", "tue", "wed", "thu", "fri"],
        layout: "vertical",
        disabled: false,
    },
};

export default meta;
type Story = StoryObj<typeof CheckboxCompositions.GroupWithLabels>;

export const Vertical: Story = {};

export const Horizontal: Story = {
    args: {
        options: [
            { value: "read", label: "Read" },
            { value: "write", label: "Write" },
            { value: "execute", label: "Execute" },
        ],
        defaultValue: ["read"],
        layout: "horizontal",
    },
};

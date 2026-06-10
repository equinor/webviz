import type { Meta, StoryObj } from "@storybook/react";

import { CheckboxGroup } from "../_components/checkboxGroup";

import { CheckboxCompositions } from "./index";

const meta: Meta<typeof CheckboxCompositions.WithLabel> = {
    title: "Components/Checkbox/Compositions/With Label",
    component: CheckboxCompositions.WithLabel,
    parameters: { layout: "centered" },
    tags: ["autodocs"],
    argTypes: {
        label: { control: "text" },
        disabled: { control: "boolean" },
        readOnly: { control: "boolean" },
        defaultChecked: { control: "boolean" },
        size: { control: "select", options: ["small", "default", "large"] },
        direction: { control: "select", options: ["horizontal", "vertical"] },
    },
    args: {
        label: "Accept terms",
        disabled: false,
        readOnly: false,
        defaultChecked: false,
        size: "default",
        direction: "horizontal",
    },
};

export default meta;
type Story = StoryObj<typeof CheckboxCompositions.WithLabel>;

export const Default: Story = {};

export const InGroup: Story = {
    parameters: {
        docs: { description: { story: "Multiple `WithLabel` items inside a `CheckboxGroup`." } },
    },
    render: (args) => (
        <CheckboxGroup defaultValue={["read"]}>
            <div className="flex flex-col gap-1">
                <CheckboxCompositions.WithLabel {...args} value="read" label="Read" />
                <CheckboxCompositions.WithLabel {...args} value="write" label="Write" />
                <CheckboxCompositions.WithLabel {...args} value="admin" label="Admin" disabled />
            </div>
        </CheckboxGroup>
    ),
};

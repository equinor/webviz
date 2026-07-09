import type { Meta, StoryObj } from "@storybook/react";

import { RadioGroup } from "../_components/group";

import { RadioCompositions } from "./index";

const meta: Meta<typeof RadioCompositions.WithLabel> = {
    title: "Components/Radio/Compositions/With Label",
    component: RadioCompositions.WithLabel,
    parameters: { layout: "centered" },
    tags: ["autodocs"],
    argTypes: {
        label: { control: "text" },
        disabled: { control: "boolean" },
        size: { control: "select", options: ["small", "default", "large"] },
        direction: { control: "select", options: ["horizontal", "vertical"] },
    },
    args: {
        label: "Option",
        disabled: false,
        size: "default",
        direction: "horizontal",
    },
};

export default meta;
type Story = StoryObj<typeof RadioCompositions.WithLabel>;

export const Default: Story = {};

export const InGroup: Story = {
    parameters: {
        docs: { description: { story: "Multiple `WithLabel` items inside a `RadioGroup`." } },
    },
    render: (args) => (
        <RadioGroup defaultValue="card">
            <div className="gap-4xs flex flex-col">
                <RadioCompositions.WithLabel {...args} value="card" label="Credit / debit card" />
                <RadioCompositions.WithLabel {...args} value="paypal" label="PayPal" />
                <RadioCompositions.WithLabel {...args} value="bank" label="Bank transfer" disabled />
            </div>
        </RadioGroup>
    ),
};

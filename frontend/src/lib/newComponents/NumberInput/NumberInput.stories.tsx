import { Percent } from "@mui/icons-material";
import type { Meta, StoryObj } from "@storybook/react";

import { NumberInput } from "./index";

const meta: Meta<typeof NumberInput> = {
    title: "Components/NumberInput",
    component: NumberInput,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: {
            control: "boolean",
        },
        readOnly: {
            control: "boolean",
        },
        step: {
            control: "number",
        },
    },
};

export default meta;
type Story = StoryObj<typeof NumberInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter a number...",
    },
};

export const ScrubAdornment: Story = {
    args: {
        min: 0,
        max: 100,
    },
    render: (args) => (
        <NumberInput
            {...args}
            defaultValue={0}
            unitIcon={<Percent fontSize="inherit" color="inherit" />}
            endAdornment={
                <span className="px-horizontal-xs py-vertical-4xs bg-accent text-body-xs block rounded">Adornment</span>
            }
        />
    ),
};

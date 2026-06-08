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
        min: {
            control: "number",
        },
        max: {
            control: "number",
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

export const Sizing: Story = {
    args: {
        placeholder: "Enter a number...",
    },
    render: (args) => (
        <div className="max-w-full">
            <NumberInput {...args} defaultValue={0} size="small" scrubAdornment={<Percent fontSize="inherit" />} />
            <NumberInput {...args} defaultValue={0} size="default" startAdornment={<Percent fontSize="inherit" />} />
            <NumberInput {...args} defaultValue={0} size="large" scrubAdornment={<Percent fontSize="inherit" />} />
        </div>
    ),
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
            scrubAdornment={<Percent fontSize="inherit" />}
            endAdornment={
                <span className="px-horizontal-xs py-vertical-4xs bg-accent text-body-xs block rounded">Adornment</span>
            }
        />
    ),
};

import { Percent, Warning } from "@mui/icons-material";
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
    args: {},
};

export const Sizing: Story = {
    argTypes: { size: { table: { disable: true } } },
    render: (args) => (
        <div className="max-w-full">
            <NumberInput {...args} defaultValue={0} size="small" scrubAdornment={<Percent />} />
            <NumberInput {...args} defaultValue={0} size="default" scrubAdornment={<Percent />} />
            <NumberInput
                {...args}
                defaultValue={0}
                size="large"
                startAdornment={<Warning />}
                scrubAdornment={<Percent />}
            />
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
            scrubAdornment={<Percent />}
            endAdornment={
                <span className="px-xs py-4xs bg-accent text-body-xs block rounded">Adornment</span>
            }
        />
    ),
};

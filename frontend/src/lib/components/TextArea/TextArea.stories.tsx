import type { Meta, StoryObj } from "@storybook/react";

import { TextArea } from "./index";

const meta: Meta<typeof TextArea> = {
    title: "Components/TextArea",
    component: TextArea,
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
        placeholder: {
            control: "text",
        },
        value: {
            control: "text",
        },
    },
    render: (args) => (
        <div>
            <TextArea {...args} />
        </div>
    ),
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
    args: {
        placeholder: "Enter text...",
    },
};

export const WithValue: Story = {
    args: {
        defaultValue: "Some text value",
    },
};

export const Disabled: Story = {
    args: {
        placeholder: "Disabled textarea",
        disabled: true,
    },
};

export const ReadOnly: Story = {
    args: {
        value: "Read-only value",
        readOnly: true,
    },
};

export const BottomAdornment: Story = {
    args: {
        placeholder: "Textarea with bottom adornment",
        bottomAdornment: (
            <span className="text-body-xs text-accent-subtle bg-accent border-accent-strong p-2xs py-4xs inline-block rounded-lg">
                Bottom adornment
            </span>
        ),
    },
};

export const RowsAndColumns: Story = {
    args: {
        placeholder: "Large textarea",
        rows: 10,
        cols: 50,
    },
};

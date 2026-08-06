import type { Meta, StoryObj } from "@storybook/react";

import type { DateRangePickerProps } from "./dateRangePicker";
import { DateRangePicker } from "./dateRangePicker";

const meta = {
    title: "Components/DateRangePicker",
    component: DateRangePicker,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        size: {
            control: "select",
            options: ["small", "default", "large"],
        },
        disabled: {
            control: "boolean",
        },
        readOnly: {
            control: "boolean",
        },
    },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<DateRangePickerProps>;

export const Default: Story = {
    args: {
        // value: undefined,
        size: "default",
        disabled: false,
        readOnly: false,
    },
};

export const WithSelectedRange: Story = {
    args: {
        value: {
            from: new Date("2024-01-01"),
            to: new Date("2024-01-31"),
        },
        size: "default",
        disabled: false,
        readOnly: false,
    },
};

export const Sizes: Story = {
    argTypes: {
        size: {
            table: { disable: true },
        },
    },
    render: (args) => (
        <div className="space-y-2xs">
            <DateRangePicker {...args} size="small" />
            <DateRangePicker {...args} size="default" />
            <DateRangePicker {...args} size="large" />
        </div>
    ),
};

export const Disabled: Story = {
    args: {
        value: {
            from: new Date("2024-01-01"),
            to: new Date("2024-01-31"),
        },
        size: "default",
        disabled: true,
        readOnly: false,
    },
};

export const ReadOnly: Story = {
    args: {
        value: {
            from: new Date("2024-01-01"),
            to: new Date("2024-01-31"),
        },
        size: "default",
        disabled: false,
        readOnly: true,
    },
};

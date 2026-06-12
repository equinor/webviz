import type { Meta, StoryObj } from "@storybook/react";

import { TextInput } from "./index";

const meta: Meta<typeof TextInput> = {
    title: "Components/TextInput",
    component: TextInput,
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
};

export default meta;
type Story = StoryObj<typeof TextInput>;

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
        placeholder: "Disabled input",
        disabled: true,
    },
};

export const ReadOnly: Story = {
    args: {
        value: "Read-only value",
        readOnly: true,
    },
};

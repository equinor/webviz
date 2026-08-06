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

export const OnEmphasis: Story = {
    args: { defaultValue: "On a dark background", formOnEmphasis: true },
    parameters: {
        docs: {
            description: {
                story: "When placing a text input on a darker background, the `formOnEmphasis` prop to swap the background color to one with ensure proper contrast.",
            },
        },
    },
    render: (args) => (
        <div className="bg-neutral-canvas py-xl px-3xl rounded">
            <TextInput {...args} data-on-emphasis />
        </div>
    ),
};

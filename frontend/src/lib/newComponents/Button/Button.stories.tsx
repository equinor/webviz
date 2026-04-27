import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./index";

const meta: Meta<typeof Button> = {
    title: "Components/Button",
    component: Button,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: "A button component that can be used to trigger an action or event.",
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        variant: {
            control: "select",
            options: ["contained", "outlined", "text"],
        },
        tone: {
            control: "select",
            options: ["accent", "neutral", "danger"],
        },
        size: {
            control: "select",
            options: ["small", "default", "large"],
        },
        disabled: {
            control: "boolean",
        },
        round: {
            control: "boolean",
        },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Contained: Story = {
    args: {
        children: "You can control me",
        variant: "contained",
        tone: "accent",
    },
};

export const Outlined: Story = {
    args: {
        children: "You can control me",
        variant: "outlined",
        tone: "accent",
    },
};

export const Text: Story = {
    args: {
        children: "You can control me",
        variant: "text",
        tone: "accent",
    },
};

export const Danger: Story = {
    args: {
        children: "Delete",
        variant: "contained",
        tone: "danger",
    },
};

export const Neutral: Story = {
    args: {
        children: "Cancel",
        variant: "outlined",
        tone: "neutral",
    },
};

export const Small: Story = {
    args: {
        children: "Small",
        variant: "contained",
        size: "small",
    },
};

export const Large: Story = {
    args: {
        children: "Large",
        variant: "contained",
        size: "large",
    },
};

export const Disabled: Story = {
    args: {
        children: "Disabled",
        variant: "contained",
        disabled: true,
    },
};

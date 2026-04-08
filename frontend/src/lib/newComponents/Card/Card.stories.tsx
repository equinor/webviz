import type { Meta, StoryObj } from "@storybook/react";

import { Card } from "./card";

const meta: Meta<typeof Card> = {
    title: "Components/Card",
    component: Card,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        tone: {
            control: "select",
            options: ["default", "warning", "danger", "success", "info"],
        },
        elevation: {
            control: "select",
            options: ["none", "raised", "overlay"],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    args: {
        children: "This is a card",
        tone: "default",
        elevation: "raised",
    },
};

export const Warning: Story = {
    args: {
        children: "This is a warning card",
        tone: "warning",
        elevation: "raised",
    },
};

export const Danger: Story = {
    args: {
        children: "This is a danger card",
        tone: "danger",
        elevation: "raised",
    },
};

export const Success: Story = {
    args: {
        children: "This is a success card",
        tone: "success",
        elevation: "raised",
    },
};

export const Info: Story = {
    args: {
        children: "This is an info card",
        tone: "info",
        elevation: "raised",
    },
};

export const NoElevation: Story = {
    args: {
        children: "Flat card with no shadow",
        tone: "default",
        elevation: "none",
    },
};

export const Overlay: Story = {
    args: {
        children: "Card with overlay elevation",
        tone: "default",
        elevation: "overlay",
    },
};

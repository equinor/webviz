import type { Meta, StoryObj } from "@storybook/react";

import { Paragraph } from "./paragraph";

const meta: Meta<typeof Paragraph> = {
    title: "Components/Paragraph",
    component: Paragraph,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        size: {
            control: "select",
            options: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"],
        },
        tone: {
            control: "select",
            options: ["accent", "neutral", "danger", "success", "warning", "info"],
        },
        weight: {
            control: "select",
            options: ["lighter", "normal", "bolder"],
        },
        lineHeight: {
            control: "select",
            options: ["default", "squished"],
        },
        tracking: {
            control: "select",
            options: ["tight", "normal", "wide"],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Paragraph>;

export const Default: Story = {
    args: {
        size: "md",
        children: "The quick brown fox jumps over the lazy dog.",
    },
};

export const Small: Story = {
    args: {
        size: "sm",
        children: "The quick brown fox jumps over the lazy dog.",
    },
};

export const Large: Story = {
    args: {
        size: "lg",
        children: "The quick brown fox jumps over the lazy dog.",
    },
};

export const AccentTone: Story = {
    args: {
        size: "md",
        children: "Accent colored paragraph text.",
        tone: "accent",
    },
};

export const DangerTone: Story = {
    args: {
        size: "md",
        children: "Something went wrong. Please try again.",
        tone: "danger",
    },
};

export const Bolder: Story = {
    args: {
        size: "md",
        children: "Bold paragraph text.",
        weight: "bolder",
    },
};

export const SquishedLineHeight: Story = {
    args: {
        size: "md",
        lineHeight: "squished",
        children:
            "This paragraph has squished line height.\nLines appear closer together than the default spacing.",
    },
};

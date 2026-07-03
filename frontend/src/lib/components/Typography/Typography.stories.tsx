import type { Meta, StoryObj } from "@storybook/react";

import { Typography } from "./index";

const meta: Meta<typeof Typography> = {
    title: "Components/Typography",
    component: Typography,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        family: {
            control: "select",
            options: ["header", "body"],
        },
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
type Story = StoryObj<typeof Typography>;

export const BodyMd: Story = {
    args: {
        family: "body",
        size: "md",
        children: "Body medium text",
    },
};

export const BodySm: Story = {
    args: {
        family: "body",
        size: "sm",
        children: "Body small text",
    },
};

export const BodyLg: Story = {
    args: {
        family: "body",
        size: "lg",
        children: "Body large text",
    },
};

export const HeaderMd: Story = {
    args: {
        family: "header",
        size: "md",
        children: "Header medium text",
    },
};

export const Header2xl: Story = {
    args: {
        family: "header",
        size: "2xl",
        children: "Header 2XL text",
    },
};

export const Header6xl: Story = {
    args: {
        family: "header",
        size: "6xl",
        children: "Header 6XL text",
    },
};

export const AccentTone: Story = {
    args: {
        family: "body",
        size: "md",
        tone: "accent",
        children: "Accent tone text",
    },
};

export const DangerTone: Story = {
    args: {
        family: "body",
        size: "md",
        tone: "danger",
        children: "Danger tone text",
    },
};

export const SuccessTone: Story = {
    args: {
        family: "body",
        size: "md",
        tone: "success",
        children: "Success tone text",
    },
};

export const Bolder: Story = {
    args: {
        family: "body",
        size: "md",
        weight: "bolder",
        children: "Bold body text",
    },
};

export const Lighter: Story = {
    args: {
        family: "body",
        size: "md",
        weight: "lighter",
        children: "Light body text",
    },
};

export const SquishedLineHeight: Story = {
    args: {
        family: "body",
        size: "md",
        lineHeight: "squished",
        children: "Squished line height text",
    },
};

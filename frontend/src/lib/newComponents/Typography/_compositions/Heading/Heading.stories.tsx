import type { Meta, StoryObj } from "@storybook/react";

import { Heading } from "./index";

const meta: Meta<typeof Heading> = {
    title: "Components/Heading",
    component: Heading,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        as: {
            control: "select",
            options: ["h1", "h2", "h3", "h4", "h5", "h6"],
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
type Story = StoryObj<typeof Heading>;

export const H1: Story = {
    args: {
        as: "h1",
        children: "Heading 1",
    },
};

export const H2: Story = {
    args: {
        as: "h2",
        children: "Heading 2",
    },
};

export const H3: Story = {
    args: {
        as: "h3",
        children: "Heading 3",
    },
};

export const H4: Story = {
    args: {
        as: "h4",
        children: "Heading 4",
    },
};

export const H5: Story = {
    args: {
        as: "h5",
        children: "Heading 5",
    },
};

export const H6: Story = {
    args: {
        as: "h6",
        children: "Heading 6",
    },
};

export const AccentTone: Story = {
    args: {
        as: "h3",
        children: "Accent Heading",
        tone: "success",
    },
};

export const DangerTone: Story = {
    args: {
        as: "h3",
        children: "Danger Heading",
        tone: "danger",
    },
};

export const Bolder: Story = {
    args: {
        as: "h3",
        children: "Bold Heading",
        weight: "bolder",
    },
};

import type { Meta, StoryObj } from "@storybook/react";

import { CircularProgress } from "./index";

const meta: Meta<typeof CircularProgress> = {
    title: "Components/CircularProgress",
    component: CircularProgress,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        size: {
            control: { type: "select" },
            options: [16, 24, 32, 40, 48],
        },
        tone: {
            control: { type: "radio" },
            options: ["default", "on-emphasis"],
        },
    },
};

export default meta;
type Story = StoryObj<typeof CircularProgress>;

export const Default: Story = {};

export const Sizes: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <CircularProgress size={16} />
            <CircularProgress size={24} />
            <CircularProgress size={32} />
            <CircularProgress size={40} />
            <CircularProgress size={48} />
        </div>
    ),
};

export const OnEmphasis: Story = {
    render: () => (
        <div className="bg-accent-strong flex items-center gap-4 rounded p-4">
            <CircularProgress tone="on-emphasis" size={16} />
            <CircularProgress tone="on-emphasis" size={24} />
            <CircularProgress tone="on-emphasis" size={32} />
            <CircularProgress tone="on-emphasis" size={40} />
            <CircularProgress tone="on-emphasis" size={48} />
        </div>
    ),
};

export const Playground: Story = {
    args: {
        size: 48,
        tone: "default",
    },
};

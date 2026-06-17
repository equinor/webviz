import type { Meta, StoryObj } from "@storybook/react";

import { LinearProgress } from "./index";

const meta: Meta<typeof LinearProgress> = {
    title: "Components/LinearProgress",
    component: LinearProgress,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        variant: {
            control: { type: "radio" },
            options: ["indeterminate", "determinate"],
        },
        value: {
            control: { type: "range", min: 0, max: 100, step: 1 },
        },
        tone: {
            control: { type: "radio" },
            options: ["default", "on-emphasis"],
        },
        size: {
            control: { type: "radio" },
            options: ["small", "default", "large"],
        },
        layoutClassName: { table: { disable: true } },
    },
};

export default meta;
type Story = StoryObj<typeof LinearProgress>;

export const Indeterminate: Story = {};

export const Determinate: Story = {
    args: {
        variant: "determinate",
        value: 60,
    },
};

export const OnEmphasis: Story = {
    decorators: [
        (Story) => (
            <div className="bg-accent-strong w-80 rounded p-4">
                <Story />
            </div>
        ),
    ],
    render: () => (
        <div className="flex flex-col gap-3">
            <LinearProgress tone="on-emphasis" />
            <LinearProgress tone="on-emphasis" variant="determinate" value={60} />
        </div>
    ),
};

export const DeterminateSteps: Story = {
    render: () => (
        <div className="flex w-80 flex-col gap-3">
            <LinearProgress variant="determinate" value={0} />
            <LinearProgress variant="determinate" value={25} />
            <LinearProgress variant="determinate" value={50} />
            <LinearProgress variant="determinate" value={75} />
            <LinearProgress variant="determinate" value={100} />
        </div>
    ),
};

export const Playground: Story = {
    args: {
        variant: "determinate",
        value: 40,
        tone: "default",
        size: "default",
    },
};

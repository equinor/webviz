import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./index";

const meta: Meta<typeof Badge> = {
    title: "Components/Badge",
    component: Badge,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        tone: {
            control: { type: "select" },
            options: ["accent", "neutral", "success", "warning", "error"],
        },
        invisible: {
            control: "boolean",
        },
    },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: {
        badgeContent: 4,
        children: <div className="bg-neutral rounded w-12 h-12" />,
    },
};

export const Tones: Story = {
    render: () => (
        <div className="flex items-center gap-8">
            <Badge tone="accent" badgeContent={1}>
                <div className="bg-neutral rounded w-12 h-12" />
            </Badge>
            <Badge tone="neutral" badgeContent={2}>
                <div className="bg-neutral rounded w-12 h-12" />
            </Badge>
            <Badge tone="success" badgeContent={3}>
                <div className="bg-neutral rounded w-12 h-12" />
            </Badge>
            <Badge tone="warning" badgeContent={4}>
                <div className="bg-neutral rounded w-12 h-12" />
            </Badge>
            <Badge tone="error" badgeContent={5}>
                <div className="bg-neutral rounded w-12 h-12" />
            </Badge>
        </div>
    ),
};

export const LargeCount: Story = {
    args: {
        badgeContent: 99,
        children: <div className="bg-neutral rounded w-12 h-12" />,
    },
};

export const OverflowCount: Story = {
    args: {
        badgeContent: "99+",
        children: <div className="bg-neutral rounded w-12 h-12" />,
    },
};

export const DotBadge: Story = {
    args: {
        badgeContent: null,
        children: <div className="bg-neutral rounded w-12 h-12" />,
    },
};

export const Invisible: Story = {
    args: {
        badgeContent: 4,
        invisible: true,
        children: <div className="bg-neutral rounded w-12 h-12" />,
    },
};

export const NoChildren: Story = {
    args: {
        badgeContent: 7,
    },
};

export const Playground: Story = {
    args: {
        badgeContent: 4,
        tone: "accent",
        invisible: false,
        children: <div className="bg-neutral rounded w-12 h-12" />,
    },
};

import type { Meta, StoryObj } from "@storybook/react";

import { Tooltip } from "./index";

const meta: Meta<typeof Tooltip.Root> = {
    title: "Components/Tooltip",
    component: Tooltip.Root,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tooltip.Root>;

export const Default: Story = {
    render: () => (
        <Tooltip.Root open>
            <Tooltip.Trigger>Hover me</Tooltip.Trigger>
            <Tooltip.Content>This is a tooltip</Tooltip.Content>
        </Tooltip.Root>
    ),
};

export const Positioning: Story = {
    render: () => (
        <div className="gap-horizontal-xs grid grid-cols-4 text-center">
            <Tooltip.Root>
                <Tooltip.Trigger>Top</Tooltip.Trigger>
                <Tooltip.Content side="top">Top tooltip</Tooltip.Content>
            </Tooltip.Root>

            <Tooltip.Root>
                <Tooltip.Trigger>Right</Tooltip.Trigger>
                <Tooltip.Content side="right">Right tooltip</Tooltip.Content>
            </Tooltip.Root>

            <Tooltip.Root>
                <Tooltip.Trigger>Bottom</Tooltip.Trigger>
                <Tooltip.Content side="bottom">Bottom tooltip</Tooltip.Content>
            </Tooltip.Root>

            <Tooltip.Root>
                <Tooltip.Trigger>Left</Tooltip.Trigger>
                <Tooltip.Content side="left">Left tooltip</Tooltip.Content>
            </Tooltip.Root>
        </div>
    ),
};

export const MultipleTooltips: Story = {
    render: () => (
        <Tooltip.Provider>
            <div className="gap-horizontal-xs grid grid-cols-3 text-center">
                <Tooltip.Root>
                    <Tooltip.Trigger>Button 1</Tooltip.Trigger>
                    <Tooltip.Content>First tooltip</Tooltip.Content>
                </Tooltip.Root>

                <Tooltip.Root>
                    <Tooltip.Trigger>Button 2</Tooltip.Trigger>
                    <Tooltip.Content>Second tooltip</Tooltip.Content>
                </Tooltip.Root>

                <Tooltip.Root>
                    <Tooltip.Trigger>Button 3</Tooltip.Trigger>
                    <Tooltip.Content>Third tooltip</Tooltip.Content>
                </Tooltip.Root>
            </div>
        </Tooltip.Provider>
    ),
};

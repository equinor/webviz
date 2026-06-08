import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button";

import { Tooltip } from "./index";

const meta: Meta<typeof Tooltip> = {
    title: "Components/Tooltip",
    component: Tooltip,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
    render: () => (
        <Tooltip content="This is a tooltip">
            <Button>Hover me</Button>
        </Tooltip>
    ),
};

export const Positioning: Story = {
    render: () => (
        <div className="gap-horizontal-xs grid grid-cols-4 text-center">
            <Tooltip content="Top tooltip" side="top">
                <Button>Top</Button>
            </Tooltip>

            <Tooltip content="Right tooltip" side="right">
                <Button>Right</Button>
            </Tooltip>

            <Tooltip content="Bottom tooltip" side="bottom">
                <Button>Bottom</Button>
            </Tooltip>

            <Tooltip content="Left tooltip" side="left">
                <Button>Left</Button>
            </Tooltip>
        </div>
    ),
};

export const Delay: Story = {
    render: () => (
        <div className="gap-horizontal-xs grid grid-cols-3 text-center">
            <Tooltip content="Tooltip with a short delay" delay="short">
                <Button>Short</Button>
            </Tooltip>

            <Tooltip content="Tooltip with a medium delay" delay="medium">
                <Button>Medium</Button>
            </Tooltip>

            <Tooltip content="Tooltip with a long delay" delay="long">
                <Button>Long</Button>
            </Tooltip>
        </div>
    ),
};

export const TooltipProvider: Story = {
    name: "Tooltip.Provider",
    parameters: {
        docs: {
            description: {
                story: "Use `Tooltip.Provider` to wrap multiple tooltips and provide shared context. This means that only one opens at a time, and the tooltip opens without delay when moving to the next sibling",
            },
        },
    },
    render: () => (
        <Tooltip.Provider>
            <div className="gap-horizontal-xs grid grid-cols-3 text-center">
                <Tooltip content="First tooltip">
                    <Button>Button 1</Button>
                </Tooltip>

                <Tooltip content="Second tooltip">
                    <Button>Button 2</Button>
                </Tooltip>

                <Tooltip content="Third tooltip">
                    <Button>Button 3</Button>
                </Tooltip>
            </div>
        </Tooltip.Provider>
    ),
};

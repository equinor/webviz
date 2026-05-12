import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button";

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
        <Tooltip.Root>
            <Tooltip.Trigger>
                <Button>Hover me</Button>
            </Tooltip.Trigger>

            <Tooltip.Popup>This is a tooltip</Tooltip.Popup>
        </Tooltip.Root>
    ),
};

export const Positioning: Story = {
    render: () => (
        <div className="gap-horizontal-xs grid grid-cols-4 text-center">
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Button>Top</Button>
                </Tooltip.Trigger>

                <Tooltip.Popup side="top">Top tooltip</Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Button>Right</Button>
                </Tooltip.Trigger>

                <Tooltip.Popup side="right">Right tooltip</Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Button>Bottom</Button>
                </Tooltip.Trigger>

                <Tooltip.Popup side="bottom">Bottom tooltip</Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Button>Left</Button>
                </Tooltip.Trigger>

                <Tooltip.Popup side="left">Left tooltip</Tooltip.Popup>
            </Tooltip.Root>
        </div>
    ),
};

export const Delay: Story = {
    render: () => (
        <div className="gap-horizontal-xs grid grid-cols-3 text-center">
            <Tooltip.Root>
                <Tooltip.Trigger delay="short">
                    <Button>Short</Button>
                </Tooltip.Trigger>
                <Tooltip.Popup>Tooltip with a short delay</Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root>
                <Tooltip.Trigger delay="medium">
                    <Button>Medium</Button>
                </Tooltip.Trigger>
                <Tooltip.Popup>Tooltip with a medium delay</Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root>
                <Tooltip.Trigger delay="long">
                    <Button>Long</Button>
                </Tooltip.Trigger>
                <Tooltip.Popup>Tooltip with a long delay</Tooltip.Popup>
            </Tooltip.Root>
        </div>
    ),
};

export const MultipleTooltips: Story = {
    render: () => (
        <Tooltip.Provider>
            <div className="gap-horizontal-xs grid grid-cols-3 text-center">
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button>Button 1</Button>
                    </Tooltip.Trigger>

                    <Tooltip.Popup>First tooltip</Tooltip.Popup>
                </Tooltip.Root>

                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button>Button 2</Button>
                    </Tooltip.Trigger>

                    <Tooltip.Popup>Second tooltip</Tooltip.Popup>
                </Tooltip.Root>

                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button>Button 3</Button>
                    </Tooltip.Trigger>

                    <Tooltip.Popup>Third tooltip</Tooltip.Popup>
                </Tooltip.Root>
            </div>
        </Tooltip.Provider>
    ),
};

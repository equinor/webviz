import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Dropdown } from "@lib/components/Dropdown";

import { Button } from "../Button";

import { Popover } from "./index";

const meta: Meta<typeof Popover.Root> = {
    title: "Components/Popover",
    component: Popover.Root,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Popover.Root>;

export const Default: Story = {
    render: () => (
        <Popover.Root>
            <Popover.Trigger size="large" tone="accent" variant="contained">
                Click me
            </Popover.Trigger>
            <Popover.Popup>
                <Popover.Content>This is some content!</Popover.Content>
            </Popover.Popup>
        </Popover.Root>
    ),
};

export const WithTile: Story = {
    render: () => (
        <Popover.Root>
            <Popover.Trigger size="large" tone="accent" variant="contained">
                Click me
            </Popover.Trigger>
            <Popover.Popup>
                <Popover.Title>This is a title</Popover.Title>
                <Popover.Content>This is some content!</Popover.Content>
            </Popover.Popup>
        </Popover.Root>
    ),
};

export const PersistentPopover: Story = {
    parameters: {
        docs: {
            description: {
                story: 'For "persistent" popovers, manually implement state-control for the open property',
            },
        },
    },
    decorators: [
        (Story) => (
            <>
                <Story />
                {/* // TODO: Remove portal migrated dropdown is used */}
                <div id="portal-root"></div>
            </>
        ),
    ],
    render: function PersistentPopover() {
        const [popoverOpen, setPopoverOpen] = React.useState(false);

        return (
            <Popover.Root
                open={popoverOpen}
                onOpenChange={(v) => {
                    if (v) setPopoverOpen(true);
                }}
            >
                <Popover.Trigger size="large" tone="accent" variant="contained">
                    Click me
                </Popover.Trigger>
                <Popover.Popup>
                    <Popover.Title hideCloseButton>A persistent popover</Popover.Title>
                    <Popover.Content>
                        {/* // TODO: Use the new base-ui dropdown once that's implemented */}
                        <Dropdown
                            options={[
                                { label: "Option 1", value: "option1" },
                                { label: "Option 2", value: "option2" },
                                { label: "Option 3", value: "option3" },
                            ]}
                        />
                    </Popover.Content>

                    <div className="mt-vertical-md flex">
                        <Button className="w-full" onClick={() => setPopoverOpen(false)}>
                            Ok
                        </Button>
                    </div>
                </Popover.Popup>
            </Popover.Root>
        );
    },
};

export const Alignment: Story = {
    parameters: {
        docs: {
            description: {
                story: "Note that top is bugged in the current version (base-ui v. 1.13.x)",
            },
        },
    },
    render: () => (
        <div className="mt-horizontal-2xl gap-horizontal-sm px-horizontal-3xl py- m-auto grid h-8 grid-cols-4">
            <Popover.Root>
                <Popover.Trigger size="small" tone="accent" variant="contained">
                    Left
                </Popover.Trigger>
                <Popover.Popup side="left">
                    <Popover.Title>A title!</Popover.Title>
                    <Popover.Content>This is some content</Popover.Content>
                </Popover.Popup>
            </Popover.Root>
            <Popover.Root>
                <Popover.Trigger size="small" tone="accent" variant="contained">
                    Bottom
                </Popover.Trigger>
                <Popover.Popup side="bottom">
                    <Popover.Title>A title!</Popover.Title>
                    <Popover.Content>This is some content</Popover.Content>
                </Popover.Popup>
            </Popover.Root>
            <Popover.Root>
                <Popover.Trigger size="small" tone="accent" variant="contained">
                    Top
                </Popover.Trigger>
                <Popover.Popup side="top">
                    <Popover.Title>A title!</Popover.Title>
                    <Popover.Content>This is some content</Popover.Content>
                </Popover.Popup>
            </Popover.Root>

            <Popover.Root>
                <Popover.Trigger size="small" tone="accent" variant="contained">
                    Right
                </Popover.Trigger>
                <Popover.Popup side="right">
                    <Popover.Title>A title!</Popover.Title>
                    <Popover.Content>This is some content</Popover.Content>
                </Popover.Popup>
            </Popover.Root>
        </div>
    ),
};

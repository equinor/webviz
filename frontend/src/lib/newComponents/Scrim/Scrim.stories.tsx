import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { Button } from "../Button";
import { Scrim } from "./index";

function ScrimDemo(props: { isDismissable?: boolean }) {
    const [open, setOpen] = React.useState(false);

    return (
        <>
            <Button variant="contained" tone="accent" onClick={() => setOpen(true)}>
                Open Scrim
            </Button>
            <Scrim open={open} onClose={() => setOpen(false)} isDismissable={props.isDismissable}>
                <div className="flex h-full items-center justify-center">
                    <div className="rounded bg-white p-8 shadow-lg">
                        <p>Content on top of the scrim</p>
                        <Button variant="outlined" tone="neutral" onClick={() => setOpen(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </Scrim>
        </>
    );
}

const meta: Meta<typeof ScrimDemo> = {
    title: "Components/Scrim",
    component: ScrimDemo,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        isDismissable: {
            control: "boolean",
        },
    },
};

export default meta;
type Story = StoryObj<typeof ScrimDemo>;

export const Default: Story = {
    args: {
        isDismissable: false,
    },
};

export const Dismissable: Story = {
    args: {
        isDismissable: true,
    },
};

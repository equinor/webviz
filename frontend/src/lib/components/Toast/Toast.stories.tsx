import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button";

import { Toast, createToastManager } from "./index";

const meta: Meta<typeof Toast> = {
    title: "Components/Toast",
    component: Toast,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Default: Story = {
    render: () => {
        const manager = createToastManager();
        return (
            <>
                <Toast toastManager={manager} />
                <Button variant="contained" tone="accent" onClick={() => manager.add({ title: "Changes saved" })}>
                    Save
                </Button>
            </>
        );
    },
};

const multipleToastsManager = createToastManager();

function MultipleToastsDemo() {
    const count = React.useRef(0);
    return (
        <>
            <Toast toastManager={multipleToastsManager} />
            <Button
                variant="contained"
                tone="accent"
                onClick={() => {
                    count.current += 1;
                    multipleToastsManager.add({ title: `Notification ${count.current}` });
                }}
            >
                Add toast
            </Button>
        </>
    );
}

export const MultipleToasts: Story = {
    render: () => <MultipleToastsDemo />,
};

export const WithPromise: Story = {
    render: () => {
        const manager = createToastManager();
        function simulate() {
            const promise = new Promise<void>((resolve, reject) =>
                setTimeout(() => (Math.random() > 0.3 ? resolve() : reject()), 2000),
            );
            manager.promise(promise, {
                loading: { title: "Uploading file…" },
                success: { title: "File uploaded successfully" },
                error: { title: "Upload failed. Try again." },
            });
        }
        return (
            <>
                <Toast toastManager={manager} />
                <Button variant="contained" tone="accent" onClick={simulate}>
                    Upload file
                </Button>
            </>
        );
    },
};

export const WithUndoAction: Story = {
    render: () => {
        const manager = createToastManager();
        return (
            <>
                <Toast toastManager={manager} />
                <Button
                    variant="outlined"
                    tone="danger"
                    onClick={() =>
                        manager.add({
                            title: "3 items deleted",
                            actionProps: {
                                children: "Undo",
                                onClick: () => manager.close(),
                            },
                        })
                    }
                >
                    Delete
                </Button>
            </>
        );
    },
};

export const DifferentTypes: Story = {
    render: () => {
        const manager = createToastManager();
        return (
            <>
                <Toast toastManager={manager} />
                <div className="flex gap-2">
                    <Button
                        variant="contained"
                        tone="accent"
                        onClick={() => manager.add({ type: "success", title: "Saved" })}
                    >
                        Save
                    </Button>
                    <Button
                        variant="outlined"
                        tone="neutral"
                        onClick={() => manager.add({ type: "warning", title: "Storage almost full" })}
                    >
                        Warn
                    </Button>
                    <Button
                        variant="outlined"
                        tone="danger"
                        onClick={() => manager.add({ type: "error", title: "Connection failed" })}
                    >
                        Error
                    </Button>
                </div>
            </>
        );
    },
};

import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button";

import { Toast, createToastManager } from "./index";

const meta: Meta<typeof Toast> = {
    title: "Components/Toast",
    component: Toast,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A non-blocking notification that appears temporarily to inform the user of an event.
Toasts auto-dismiss after a timeout and stack when multiple are shown at once.

## Usage

Create a manager with \`Toast.createToastManager()\` outside the component tree, pass it to \`<Toast>\`,
and call \`manager.add()\` from anywhere to show a toast:

\`\`\`tsx
import { Toast, createToastManager } from "@/lib/newComponents/Toast";

const manager = createToastManager();

function App() {
    return (
        <>
            <Toast toastManager={manager} />
            <Button onClick={() => manager.add({ title: "Saved" })}>Save</Button>
        </>
    );
}
\`\`\`

## When to use

- Confirm a completed action (save, delete, copy)
- Report the outcome of a background operation
- Surface non-critical errors that don't need immediate action
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Toast>;

const manager = createToastManager();

export const TitleOnly: Story = {
    parameters: {
        docs: {
            description: {
                story: "The simplest toast — a single-line title with no description.",
            },
        },
    },
    render: () => (
        <>
            <Toast toastManager={manager} />
            <Button variant="contained" tone="accent" onClick={() => manager.add({ title: "Changes saved" })}>
                Save
            </Button>
        </>
    ),
};

export const WithDescription: Story = {
    parameters: {
        docs: {
            description: {
                story: "A toast with both a title and a supporting description for additional context.",
            },
        },
    },
    render: () => (
        <>
            <Toast toastManager={manager} />
            <Button
                variant="contained"
                tone="accent"
                onClick={() =>
                    manager.add({
                        title: "File uploaded",
                        description: "report_q1_2026.csv has been uploaded successfully.",
                    })
                }
            >
                Upload file
            </Button>
        </>
    ),
};

export const MultipleToasts: Story = {
    parameters: {
        docs: {
            description: {
                story: "Each click adds a new toast. Multiple toasts stack in the viewport and each dismisses independently.",
            },
        },
    },
    render: () => {
        let count = 0;
        return (
            <>
                <Toast toastManager={manager} />
                <Button
                    variant="contained"
                    tone="accent"
                    onClick={() => {
                        count += 1;
                        manager.add({
                            title: `Notification ${count}`,
                            description: `This is toast number ${count}.`,
                        });
                    }}
                >
                    Add toast
                </Button>
            </>
        );
    },
};

export const DifferentActions: Story = {
    parameters: {
        docs: {
            description: {
                story: "Trigger toasts for different outcomes — success, warning, and error — each with the appropriate message.",
            },
        },
    },
    render: () => (
        <>
            <Toast toastManager={manager} />
            <div className="flex gap-2">
                <Button
                    variant="contained"
                    tone="accent"
                    onClick={() =>
                        manager.add({
                            type: "success",
                            title: "Saved",
                            description: "Your changes were saved successfully.",
                        })
                    }
                >
                    Save
                </Button>
                <Button
                    variant="outlined"
                    tone="neutral"
                    onClick={() =>
                        manager.add({
                            type: "warning",
                            title: "Warning",
                            description: "Storage is almost full. Free up space to continue.",
                        })
                    }
                >
                    Warn
                </Button>
                <Button
                    variant="outlined"
                    tone="danger"
                    onClick={() =>
                        manager.add({
                            type: "error",
                            title: "Error",
                            description: "Failed to connect. Check your network and try again.",
                        })
                    }
                >
                    Error
                </Button>
            </div>
        </>
    ),
};

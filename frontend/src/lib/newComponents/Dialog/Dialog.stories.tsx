import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button";

import { Dialog } from "./index";

const meta: Meta<typeof Dialog.Popup> = {
    title: "Components/Dialog",
    component: Dialog.Popup,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
The \`Dialog\` is a compound component built from composable sub-components. Each piece can be used
independently or combined to build up the dialog you need.

## Sub-components

| Component | Description |
|---|---|
| \`Dialog.Popup\` | The root container. Manages open/close state and renders the backdrop and portal. |
| \`Dialog.Header\` | Top section with a bottom border. Accepts an optional close icon via \`closeIconVisible\`. |
| \`Dialog.Title\` | Renders a styled heading inside \`Dialog.Header\`. |
| \`Dialog.Body\` | Scrollable middle section for the main body. |
| \`Dialog.Description\` | Styled paragraph inside \`Dialog.Body\`. |
| \`Dialog.Actions\` | Bottom section that right-aligns action buttons. |

## Composition

Combine sub-components inside \`Dialog.Popup\` in any order. None of them are required — only
include what the dialog needs:

\`\`\`tsx
<Dialog.Popup open={open} onOpenChange={setOpen}>
    <Dialog.Header>
        <Dialog.Title>Title</Dialog.Title>
    </Dialog.Header>
    <Dialog.Body>
        <Dialog.Description>Description</Dialog.Description>
    </Dialog.Body>
    <Dialog.Actions>
        <Button onClick={() => setOpen(false)}>Close</Button>
    </Dialog.Actions>
</Dialog.Popup>
\`\`\`
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

// ─── Sub-component stories ────────────────────────────────────────────────────

export const SubTitle: Story = {
    name: "Sub-component: Title",
    parameters: {
        docs: {
            description: { story: "The `Dialog.Title` renders a styled heading. Used inside `Dialog.Header`." },
        },
    },
    render: () => <Dialog.Title>Dialog Title</Dialog.Title>,
};

export const SubHeader: Story = {
    name: "Sub-component: Header",
    parameters: {
        docs: {
            description: {
                story: "The `Dialog.Header` wraps the title area and draws a bottom border to separate it from the Body.",
            },
        },
    },
    render: () => (
        <Dialog.Header>
            <Dialog.Title>Dialog Title</Dialog.Title>
        </Dialog.Header>
    ),
};

export const SubBody: Story = {
    name: "Sub-component: Body",
    parameters: {
        docs: {
            description: {
                story: "The `Dialog.Body` wraps the main body. Use `Dialog.Description` inside it for styled text, or supply any custom Body.",
            },
        },
    },
    render: () => (
        <Dialog.Body>
            <Dialog.Description>
                This is the dialog description. It provides context about the action the user is about to perform.
            </Dialog.Description>
        </Dialog.Body>
    ),
};

export const SubActions: Story = {
    name: "Sub-component: Actions",
    parameters: {
        docs: {
            description: {
                story: "The `Dialog.Actions` bar right-aligns its children. Place action buttons here.",
            },
        },
    },
    render: () => (
        <Dialog.Actions>
            <Button variant="outlined" tone="neutral">
                Cancel
            </Button>
            <Button variant="contained" tone="accent">
                Confirm
            </Button>
        </Dialog.Actions>
    ),
};

// ─── Composition stories ──────────────────────────────────────────────────────

export const PopupOnly: Story = {
    parameters: {
        docs: {
            description: {
                story: "A bare `Dialog.Popup` with no structure — use this when you need full control over the layout.",
            },
        },
    },
    render: () => {
        const [open, setOpen] = React.useState(false);
        return (
            <>
                <Button variant="contained" tone="accent" onClick={() => setOpen(true)}>
                    Open Dialog
                </Button>
                <Dialog.Popup open={open} onOpenChange={setOpen}>
                    <Dialog.Body>
                        <Dialog.Description>
                            This popup has no header or actions — just raw Body inside the popup container.
                        </Dialog.Description>
                    </Dialog.Body>
                </Dialog.Popup>
            </>
        );
    },
};

export const WithHeader: Story = {
    parameters: {
        docs: {
            description: {
                story: "Popup with a header and title, but no action bar. Useful for informational dialogs that can be dismissed via the backdrop.",
            },
        },
    },
    render: () => {
        const [open, setOpen] = React.useState(false);
        return (
            <>
                <Button variant="contained" tone="accent" onClick={() => setOpen(true)}>
                    Open Dialog
                </Button>
                <Dialog.Popup open={open} onOpenChange={setOpen}>
                    <Dialog.Header>
                        <Dialog.Title>Informational Dialog</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                        <Dialog.Description>
                            This dialog has a header but no action bar. Dismiss it by clicking outside.
                        </Dialog.Description>
                    </Dialog.Body>
                </Dialog.Popup>
            </>
        );
    },
};

export const WithHeaderAndCloseIcon: Story = {
    parameters: {
        docs: {
            description: {
                story: "Add `closeIconVisible` to `Dialog.Header` to render a close button in the top-right corner.",
            },
        },
    },
    render: () => {
        const [open, setOpen] = React.useState(false);
        return (
            <>
                <Button variant="contained" tone="accent" onClick={() => setOpen(true)}>
                    Open Dialog
                </Button>
                <Dialog.Popup open={open} onOpenChange={setOpen}>
                    <Dialog.Header closeIconVisible>
                        <Dialog.Title>Dialog with Close Icon</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                        <Dialog.Description>
                            The close icon in the header gives users an explicit dismiss affordance.
                        </Dialog.Description>
                    </Dialog.Body>
                </Dialog.Popup>
            </>
        );
    },
};

export const WithActionsNoHeader: Story = {
    parameters: {
        docs: {
            description: {
                story: "Body and actions without a header — useful for simple confirmations that don't need a title.",
            },
        },
    },
    render: () => {
        const [open, setOpen] = React.useState(false);
        return (
            <>
                <Button variant="contained" tone="accent" onClick={() => setOpen(true)}>
                    Open Dialog
                </Button>
                <Dialog.Popup open={open} onOpenChange={setOpen}>
                    <Dialog.Body>
                        <Dialog.Description>
                            Are you sure you want to proceed? This dialog has no header, just a message and actions.
                        </Dialog.Description>
                    </Dialog.Body>
                    <Dialog.Actions>
                        <Button variant="outlined" tone="neutral" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="contained" tone="accent" onClick={() => setOpen(false)}>
                            Confirm
                        </Button>
                    </Dialog.Actions>
                </Dialog.Popup>
            </>
        );
    },
};

export const FullDialog: Story = {
    parameters: {
        docs: {
            description: {
                story: "The full composition: header with title, Body with description, and an actions bar.",
            },
        },
    },
    render: () => {
        const [open, setOpen] = React.useState(false);
        return (
            <>
                <Button variant="contained" tone="accent" onClick={() => setOpen(true)}>
                    Open Dialog
                </Button>
                <Dialog.Popup open={open} onOpenChange={setOpen}>
                    <Dialog.Header closeIconVisible>
                        <Dialog.Title>Dialog Title</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                        <Dialog.Description>
                            This is the dialog description. It provides context about the action the user is about to
                            perform.
                        </Dialog.Description>
                    </Dialog.Body>
                    <Dialog.Actions>
                        <Button variant="text" tone="neutral" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="contained" tone="accent" onClick={() => setOpen(false)}>
                            Confirm
                        </Button>
                    </Dialog.Actions>
                </Dialog.Popup>
            </>
        );
    },
};

export const ConfirmDelete: Story = {
    parameters: {
        docs: {
            description: {
                story: 'A destructive confirmation dialog — uses `tone="danger"` on the primary action to signal irreversibility.',
            },
        },
    },
    render: () => {
        const [open, setOpen] = React.useState(false);
        return (
            <>
                <Button variant="contained" tone="danger" onClick={() => setOpen(true)}>
                    Delete Item
                </Button>
                <Dialog.Popup open={open} onOpenChange={setOpen}>
                    <Dialog.Header closeIconVisible>
                        <Dialog.Title>Confirm Deletion</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                        <Dialog.Description>
                            Are you sure you want to delete this item? This action cannot be undone.
                        </Dialog.Description>
                    </Dialog.Body>
                    <Dialog.Actions>
                        <Button variant="text" tone="neutral" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="contained" tone="danger" onClick={() => setOpen(false)}>
                            Delete
                        </Button>
                    </Dialog.Actions>
                </Dialog.Popup>
            </>
        );
    },
};

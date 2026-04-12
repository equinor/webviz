import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button";
import { Dialog } from "../Dialog";

import { AlertDialog } from "./index";

const meta: Meta<typeof AlertDialog> = {
    title: "Components/AlertDialog",
    component: AlertDialog,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A modal alert dialog for critical confirmations that require an explicit user decision before proceeding.
Unlike a regular dialog, an alert dialog cannot be dismissed by clicking the backdrop or pressing Escape —
the user must choose one of the provided actions.

## Usage

Pass a \`title\`, a \`description\`, a \`primaryAction\`, and optionally \`secondaryActions\`.
Each action has a \`label\`, an \`onClick\` handler, an optional \`tone\`, and an optional \`closesDialog\` flag.
The primary action is rendered as a contained button; secondary actions are outlined.

\`\`\`tsx
<AlertDialog
    open={open}
    onOpenChange={setOpen}
    title="Discard changes?"
    description="Your unsaved changes will be permanently lost."
    primaryAction={{ label: "Discard", tone: "danger", onClick: handleDiscard, closesDialog: true }}
    secondaryActions={[{ label: "Keep editing", onClick: () => setOpen(false), closesDialog: true }]}
/>
\`\`\`

## When to use

Use an \`AlertDialog\` instead of a \`Dialog\` when:
- The action is **destructive or irreversible** (delete, discard, overwrite)
- The user must **explicitly acknowledge** a consequence before proceeding
- Accidental dismissal (backdrop click, Escape) would be harmful
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AlertDialog>;

export const WithCancelConfirmation: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "A form dialog where clicking Cancel triggers an alert dialog asking the user to confirm " +
                    "before discarding their unsaved changes. This prevents accidental data loss.",
            },
        },
    },
    render: () => {
        const [dialogOpen, setDialogOpen] = React.useState(false);
        const [alertOpen, setAlertOpen] = React.useState(false);

        function handleCancelClick() {
            setAlertOpen(true);
        }

        function handleDiscardConfirmed() {
            setAlertOpen(false);
            setDialogOpen(false);
        }

        return (
            <>
                <Button variant="contained" tone="accent" onClick={() => setDialogOpen(true)}>
                    Open form
                </Button>

                <Dialog.Popup
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    alertDialogs={[
                        <AlertDialog
                            open={alertOpen}
                            onOpenChange={setAlertOpen}
                            title="Discard changes?"
                            description="You have unsaved changes. Leaving now will permanently discard them."
                            primaryAction={{
                                label: "Discard changes",
                                tone: "danger",
                                onClick: handleDiscardConfirmed,
                                closesDialog: true,
                            }}
                            secondaryActions={[
                                {
                                    label: "Keep editing",
                                    onClick: () => setAlertOpen(false),
                                    closesDialog: true,
                                    tone: "neutral",
                                },
                            ]}
                        />,
                    ]}
                >
                    <Dialog.Header>
                        <Dialog.Title>Edit profile</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                        <Dialog.Description>
                            Make changes to your profile here. Click Save when you are done.
                        </Dialog.Description>
                        <textarea
                            className="w-full rounded-md border border-neutral-300 p-2"
                            rows={4}
                            defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec suscipit auctor dui, at dignissim velit."
                        />
                    </Dialog.Body>
                    <Dialog.Actions>
                        <Button variant="text" tone="neutral" onClick={handleCancelClick}>
                            Cancel
                        </Button>
                        <Button variant="contained" tone="accent" onClick={() => setDialogOpen(false)}>
                            Save
                        </Button>
                    </Dialog.Actions>
                </Dialog.Popup>
            </>
        );
    },
};

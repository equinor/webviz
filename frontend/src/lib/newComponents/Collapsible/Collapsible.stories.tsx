import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { Button } from "../Button";
import { Collapsible } from "./index";

const meta: Meta<typeof Collapsible.Group> = {
    title: "Components/Collapsible",
    component: Collapsible.Group,
    decorators: [(Story) => <div className="w-full max-w-[500px]"><Story /></div>],
    parameters: {
        layout: "padded",
        docs: {
            description: {
                component: `
The \`Collapsible\` is a compound component for building expandable/collapsible sections.

## Sub-components

| Component | Description |
|---|---|
| \`Collapsible.Group\` | A collapsible section with a trigger header and a panel. Supports tones and an optional adornment slot in the header. |
| \`Collapsible.ScrollArea\` | A scrollable container that makes \`Group\` headers sticky as you scroll. Wrap multiple groups in this to get sticky section headers. |

## Composition

\`\`\`tsx
<Collapsible.ScrollArea>
    <Collapsible.Group title="Section A">
        <p>Content for section A</p>
    </Collapsible.Group>
    <Collapsible.Group title="Section B">
        <p>Content for section B</p>
    </Collapsible.Group>
</Collapsible.ScrollArea>
\`\`\`
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        tone: {
            control: "select",
            options: ["default", "warning", "danger", "success", "info"],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Collapsible.Group>;

// ─── Sub-component stories ────────────────────────────────────────────────────

export const SubGroup: Story = {
    name: "Sub-component: Group",
    parameters: {
        docs: {
            description: {
                story: "A single `Collapsible.Group` — click the trigger row to expand and collapse the panel.",
            },
        },
    },
    args: {
        title: "Section Title",
        children: <p className="p-4">This is the collapsible content.</p>,
    },
};

export const SubGroupWithAdornment: Story = {
    name: "Sub-component: Group with adornment",
    parameters: {
        docs: {
            description: {
                story: "The `adornment` prop renders any node in the right side of the header — useful for counts, badges, or action buttons.",
            },
        },
    },
    render: () => (
        <Collapsible.Group
            title="Section with adornment"
            adornment={
                <Button variant="text" tone="neutral" size="small">
                    Edit
                </Button>
            }
        >
            <p className="p-4">Content with an adornment button in the header.</p>
        </Collapsible.Group>
    ),
};

// ─── Tone stories ─────────────────────────────────────────────────────────────

export const ToneDefault: Story = {
    name: "Tone: Default",
    args: {
        title: "Default",
        children: <p className="p-4">Default tone content.</p>,
    },
};

export const ToneWarning: Story = {
    name: "Tone: Warning",
    args: {
        title: "Warning",
        tone: "warning",
        children: <p className="p-4">Warning tone content.</p>,
    },
};

export const ToneDanger: Story = {
    name: "Tone: Danger",
    args: {
        title: "Danger",
        tone: "danger",
        children: <p className="p-4">Danger tone content.</p>,
    },
};

export const ToneSuccess: Story = {
    name: "Tone: Success",
    args: {
        title: "Success",
        tone: "success",
        children: <p className="p-4">Success tone content.</p>,
    },
};

export const ToneInfo: Story = {
    name: "Tone: Info",
    args: {
        title: "Info",
        tone: "info",
        children: <p className="p-4">Info tone content.</p>,
    },
};

// ─── Composition stories ──────────────────────────────────────────────────────

export const MultipleGroups: Story = {
    parameters: {
        docs: {
            description: {
                story: "Multiple groups stacked — each one independently collapsible.",
            },
        },
    },
    render: () => (
        <>
            <Collapsible.Group title="Section A">
                <p className="p-4">Content for section A.</p>
            </Collapsible.Group>
            <Collapsible.Group title="Section B">
                <p className="p-4">Content for section B.</p>
            </Collapsible.Group>
            <Collapsible.Group title="Section C">
                <p className="p-4">Content for section C.</p>
            </Collapsible.Group>
        </>
    ),
};

export const WithScrollArea: Story = {
    parameters: {
        docs: {
            description: {
                story: "Wrap groups in `Collapsible.ScrollArea` to make the section headers sticky as you scroll. Scroll down inside the container to see the headers stick.",
            },
        },
    },
    render: () => (
        <div className="w-80" style={{ height: 300 }}>
            <Collapsible.ScrollArea>
                <Collapsible.Group title="Section A">
                    <ul className="p-4 space-y-2">
                        {Array.from({ length: 6 }, (_, i) => (
                            <li key={i}>Item A{i + 1}</li>
                        ))}
                    </ul>
                </Collapsible.Group>
                <Collapsible.Group title="Section B">
                    <ul className="p-4 space-y-2">
                        {Array.from({ length: 6 }, (_, i) => (
                            <li key={i}>Item B{i + 1}</li>
                        ))}
                    </ul>
                </Collapsible.Group>
                <Collapsible.Group title="Section C">
                    <ul className="p-4 space-y-2">
                        {Array.from({ length: 6 }, (_, i) => (
                            <li key={i}>Item C{i + 1}</li>
                        ))}
                    </ul>
                </Collapsible.Group>
            </Collapsible.ScrollArea>
        </div>
    ),
};

export const MixedTones: Story = {
    parameters: {
        docs: {
            description: {
                story: "Groups can have different tones — useful for surfacing warnings or errors inline within a list of sections.",
            },
        },
    },
    render: () => (
        <div className="w-80">
            <Collapsible.Group title="All good" tone="success">
                <p className="p-4">Everything looks healthy.</p>
            </Collapsible.Group>
            <Collapsible.Group title="Needs attention" tone="warning">
                <p className="p-4">Some items may need review.</p>
            </Collapsible.Group>
            <Collapsible.Group title="Errors found" tone="danger">
                <p className="p-4">Critical issues require immediate action.</p>
            </Collapsible.Group>
        </div>
    ),
};

import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./index";

const meta: Meta<typeof Button> = {
    title: "Components/Button",
    component: Button,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A general-purpose button that triggers an action or event.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`variant\` | \`"contained" \\| "outlined" \\| "text"\` | \`"contained"\` | Visual style of the button |
| \`tone\` | \`"accent" \\| "neutral" \\| "danger"\` | \`"accent"\` | Colour tone — conveys intent |
| \`size\` | \`"small" \\| "default" \\| "large"\` | \`"default"\` | Height and font-size |
| \`round\` | \`boolean\` | — | Fully rounded pill shape |
| \`iconOnly\` | \`boolean\` | — | Square aspect ratio; hide the label span |
| \`pressed\` | \`boolean\` | — | Toggle-button pressed state (\`data-pressed\`) |
| \`disabled\` | \`boolean\` | — | Prevents interaction |

## Usage

\`\`\`tsx
import { Button } from "@lib/newComponents/Button";

<Button variant="contained" tone="accent" onClick={() => save()}>
  Save
</Button>

<Button variant="outlined" tone="danger" onClick={() => remove()}>
  Delete
</Button>
\`\`\`
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        variant: {
            control: "select",
            options: ["contained", "outlined", "text"],
        },
        tone: {
            control: "select",
            options: ["accent", "neutral", "danger"],
        },
        size: {
            control: "select",
            options: ["small", "default", "large"],
        },
        disabled: { control: "boolean" },
        round: { control: "boolean" },
        iconOnly: { control: "boolean" },
        pressed: { control: "boolean" },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ─── Playground ───────────────────────────────────────────────────────────────

export const Playground: Story = {
    parameters: {
        docs: { description: { story: "Fully interactive — use the controls panel to explore every prop combination." } },
    },
    args: {
        children: "Button",
        variant: "contained",
        tone: "accent",
        size: "default",
        disabled: false,
        round: false,
        iconOnly: false,
        pressed: false,
    },
};

// ─── Variants ─────────────────────────────────────────────────────────────────

export const Contained: Story = {
    parameters: {
        docs: { description: { story: "Solid filled background. Use for the primary action on a surface." } },
    },
    args: { children: "Save changes", variant: "contained", tone: "accent" },
};

export const Outlined: Story = {
    parameters: {
        docs: { description: { story: "Border with a transparent background. Use for secondary actions." } },
    },
    args: { children: "Cancel", variant: "outlined", tone: "neutral" },
};

export const TextVariant: Story = {
    name: "Text",
    parameters: {
        docs: { description: { story: "No border or background — lowest visual weight. Use for tertiary or inline actions." } },
    },
    args: { children: "Learn more", variant: "text", tone: "accent" },
};

// ─── Tones ────────────────────────────────────────────────────────────────────

export const AccentTone: Story = {
    name: "Tone / Accent",
    parameters: {
        docs: { description: { story: "Default accent colour — use for primary, confirmatory actions." } },
    },
    args: { children: "Confirm", variant: "contained", tone: "accent" },
};

export const NeutralTone: Story = {
    name: "Tone / Neutral",
    parameters: {
        docs: { description: { story: "Neutral colour — use for secondary or dismiss actions." } },
    },
    args: { children: "Cancel", variant: "contained", tone: "neutral" },
};

export const DangerTone: Story = {
    name: "Tone / Danger",
    parameters: {
        docs: { description: { story: "Red danger colour — use for destructive actions like delete or remove." } },
    },
    args: { children: "Delete", variant: "contained", tone: "danger" },
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const AllSizes: Story = {
    parameters: {
        docs: { description: { story: "Three sizes side-by-side. Heights map to the `selectable-sm/md/lg` design tokens." } },
    },
    render: () => (
        <div className="flex items-center gap-3">
            <Button size="small" variant="contained" tone="accent">Small</Button>
            <Button size="default" variant="contained" tone="accent">Default</Button>
            <Button size="large" variant="contained" tone="accent">Large</Button>
        </div>
    ),
};

// ─── Variants × Tones matrix ──────────────────────────────────────────────────

export const AllVariants: Story = {
    parameters: {
        docs: { description: { story: "Every variant and tone combination at a glance." } },
    },
    render: () => {
        const variants = ["contained", "outlined", "text"] as const;
        const tones = ["accent", "neutral", "danger"] as const;
        const labels: Record<typeof tones[number], string> = {
            accent: "Confirm",
            neutral: "Cancel",
            danger: "Delete",
        };

        return (
            <div className="flex flex-col gap-4">
                {variants.map((variant) => (
                    <div key={variant} className="flex items-center gap-3">
                        <span className="w-24 text-sm text-right capitalize opacity-50">{variant}</span>
                        {tones.map((tone) => (
                            <Button key={tone} variant={variant} tone={tone}>
                                {labels[tone]}
                            </Button>
                        ))}
                    </div>
                ))}
            </div>
        );
    },
};

// ─── Disabled ─────────────────────────────────────────────────────────────────

export const Disabled: Story = {
    parameters: {
        docs: { description: { story: "Disabled state across all variants — interaction is blocked and the button appears muted." } },
    },
    render: () => (
        <div className="flex items-center gap-3">
            <Button variant="contained" tone="accent" disabled>Contained</Button>
            <Button variant="outlined" tone="accent" disabled>Outlined</Button>
            <Button variant="text" tone="accent" disabled>Text</Button>
        </div>
    ),
};

// ─── Pressed (toggle) ─────────────────────────────────────────────────────────

export const Pressed: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Use `pressed` to represent a toggle-button's active state. " +
                    "The `data-pressed` attribute is set on the element so styles can target it.",
            },
        },
    },
    render: () => {
        const [on, setOn] = React.useState(false);
        return (
            <Button variant="outlined" tone="accent" pressed={on} onClick={() => setOn((v) => !v)}>
                {on ? "Pinned" : "Pin"}
            </Button>
        );
    },
};

// ─── Round ────────────────────────────────────────────────────────────────────

export const Round: Story = {
    parameters: {
        docs: { description: { story: "Pass `round` for a pill shape — useful for tags, chips, or compact controls." } },
    },
    render: () => (
        <div className="flex items-center gap-3">
            <Button variant="contained" tone="accent" round>Pill</Button>
            <Button variant="outlined" tone="neutral" round>Pill</Button>
            <Button variant="text" tone="accent" round>Pill</Button>
        </div>
    ),
};

// ─── Icon-only ────────────────────────────────────────────────────────────────

export const IconOnly: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "`iconOnly` makes the button square and centres its child. " +
                    "Always provide an accessible label via `aria-label`.",
            },
        },
    },
    render: () => (
        <div className="flex items-center gap-3">
            <Button variant="contained" tone="accent" iconOnly aria-label="Add" size="small">+</Button>
            <Button variant="contained" tone="accent" iconOnly aria-label="Add">+</Button>
            <Button variant="contained" tone="accent" iconOnly aria-label="Add" size="large">+</Button>
        </div>
    ),
};

import React from "react";

import { ExpandMore, MoreVert, Save, Share } from "@mui/icons-material";
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
A general-purpose button that triggers an action or event. Use \`Button.Group\` to compose
multiple buttons into a unified control — including split buttons with a dropdown trigger.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`variant\` | \`"contained" \\| "outlined" \\| "ghost"\` | \`"contained"\` | Visual style of the button |
| \`tone\` | \`"accent" \\| "neutral" \\| "danger"\` | \`"accent"\` | \`"warning"\` Colour tone — conveys intent |
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

// Split button
<Button.Group>
  <Button variant="contained" tone="accent" onClick={() => save()}>Save</Button>
  <Button variant="contained" tone="accent" iconOnly aria-label="More options">
    <ExpandMore fontSize="inherit" />
  </Button>
</Button.Group>
\`\`\`
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        variant: {
            control: "select",
            options: ["contained", "outlined", "ghost"],
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
        docs: {
            description: { story: "Fully interactive — use the controls panel to explore every prop combination." },
        },
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

export const GhostVariant: Story = {
    name: "Ghost",
    parameters: {
        docs: {
            description: {
                story: "No border or background — lowest visual weight. Use for tertiary or inline actions.",
            },
        },
    },
    args: { children: "Learn more", variant: "ghost", tone: "accent" },
};

// ─── Tones ────────────────────────────────────────────────────────────────────

export const AllTones: Story = {
    name: "Tones",
    parameters: {
        docs: {
            description: {
                story: "Accent (primary/confirmatory), Neutral (secondary/dismiss), and Danger (destructive) — shown across all three variants.",
            },
        },
    },
    render: () => {
        const variants = ["contained", "outlined", "ghost"] as const;
        const tones = ["accent", "neutral", "danger", "warning"] as const;
        const labels: Record<(typeof tones)[number], string> = {
            accent: "Confirm",
            neutral: "Cancel",
            danger: "Delete",
            warning: "Warn",
        };

        return (
            <div className="flex flex-col gap-4">
                {variants.map((variant) => (
                    <div key={variant} className="flex items-center gap-3">
                        <span className="w-24 text-right text-sm capitalize opacity-50">{variant}</span>
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

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const AllSizes: Story = {
    name: "Sizes",
    parameters: {
        docs: {
            description: { story: "Three sizes side-by-side. Heights map to the `selectable-sm/md/lg` design tokens." },
        },
    },
    render: () => (
        <div className="flex items-center gap-3">
            <Button size="small" variant="contained" tone="accent">
                Small
            </Button>
            <Button size="default" variant="contained" tone="accent">
                Default
            </Button>
            <Button size="large" variant="contained" tone="accent">
                Large
            </Button>
        </div>
    ),
};

// ─── Disabled ─────────────────────────────────────────────────────────────────

export const Disabled: Story = {
    parameters: {
        docs: {
            description: {
                story: "Disabled state across all variants — interaction is blocked and the button appears muted.",
            },
        },
    },
    render: () => (
        <div className="flex items-center gap-3">
            <Button variant="contained" tone="accent" disabled>
                Contained
            </Button>
            <Button variant="outlined" tone="accent" disabled>
                Outlined
            </Button>
            <Button variant="ghost" tone="accent" disabled>
                Text
            </Button>
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
    render: function PressedComp() {
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
        docs: {
            description: { story: "Pass `round` for a pill shape — useful for tags, chips, or compact controls." },
        },
    },
    render: () => (
        <div className="flex items-center gap-3">
            <Button variant="contained" tone="accent" round>
                Pill
            </Button>
            <Button variant="outlined" tone="neutral" round>
                Pill
            </Button>
            <Button variant="ghost" tone="accent" round>
                Pill
            </Button>
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
            <Button variant="contained" tone="accent" iconOnly aria-label="More" size="small">
                <MoreVert fontSize="inherit" />
            </Button>
            <Button variant="contained" tone="accent" iconOnly aria-label="More">
                <MoreVert fontSize="inherit" />
            </Button>
            <Button variant="contained" tone="accent" iconOnly aria-label="More" size="large">
                <MoreVert fontSize="inherit" />
            </Button>
        </div>
    ),
};

// ─── Button.Group ─────────────────────────────────────────────────────────────

export const GroupBasic: Story = {
    name: "Group / Basic",
    parameters: {
        docs: {
            description: {
                story:
                    "Wrap buttons in `Button.Group` to align them as a unified toolbar. " +
                    "Use the `outlined` variant so adjacent borders form a natural divider.",
            },
        },
    },
    render: () => (
        <Button.Group>
            <Button variant="outlined" tone="neutral">
                Copy
            </Button>
            <Button variant="outlined" tone="neutral">
                <Share fontSize="inherit" />
                Share
            </Button>
            <Button variant="outlined" tone="danger">
                Delete
            </Button>
        </Button.Group>
    ),
};

export const GroupSplit: Story = {
    name: "Group / Split button",
    parameters: {
        docs: {
            description: {
                story:
                    "A split button combines a primary action with a dropdown trigger for secondary options. " +
                    "The chevron-down button should open a menu — wire it to your preferred popover/menu component.",
            },
        },
    },
    render: function GroupSplitComp() {
        const [saved, setSaved] = React.useState(false);

        return (
            <div className="flex flex-col items-center gap-6">
                {/* Accent / contained */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xs opacity-40">contained · accent</span>
                    <Button.Group split>
                        <Button variant="contained" tone="accent" onClick={() => setSaved((v) => !v)}>
                            <Save fontSize="inherit" />
                            {saved ? "Saved" : "Save"}
                        </Button>
                        <Button variant="contained" tone="accent" iconOnly aria-label="More save options">
                            <ExpandMore fontSize="inherit" />
                        </Button>
                    </Button.Group>
                </div>

                {/* Outlined / neutral */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xs opacity-40">outlined · neutral</span>
                    <Button.Group split>
                        <Button variant="outlined" tone="neutral">
                            <Share fontSize="inherit" />
                            Share
                        </Button>
                        <Button variant="outlined" tone="neutral" iconOnly aria-label="More share options">
                            <ExpandMore fontSize="inherit" />
                        </Button>
                    </Button.Group>
                </div>

                {/* Small size */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xs opacity-40">contained · accent · small</span>
                    <Button.Group split>
                        <Button variant="contained" tone="accent" size="small">
                            Save
                        </Button>
                        <Button variant="contained" tone="accent" size="small" iconOnly aria-label="More save options">
                            <ExpandMore fontSize="inherit" />
                        </Button>
                    </Button.Group>
                </div>
            </div>
        );
    },
};

import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Toggle } from "./index";

const meta: Meta<typeof Toggle.Button> = {
    title: "Components/Toggle",
    component: Toggle.Button,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A toggle button that switches between a pressed and unpressed state, and a group
component for managing single or multiple selections.

## Primitives: \`Toggle.Button\` + \`Toggle.Group\`

\`Toggle.Button\` can be used standalone or composed inside a \`Toggle.Group\`.
When grouped, the group manages the active selection state; each button with a
\`value\` prop is automatically registered.

\`\`\`tsx
import { Toggle } from "@/lib/newComponents/Toggle";

// Standalone
<Toggle.Button aria-label="Bold" defaultPressed>B</Toggle.Button>

// Group — single selection
<Toggle.Group defaultValue="week">
  <Toggle.Button value="day">Day</Toggle.Button>
  <Toggle.Button value="week">Week</Toggle.Button>
  <Toggle.Button value="month">Month</Toggle.Button>
</Toggle.Group>

// Group — multiple selection
<Toggle.Group defaultValue={["bold", "italic"]} toggleMultiple>
  <Toggle.Button value="bold">B</Toggle.Button>
  <Toggle.Button value="italic">I</Toggle.Button>
  <Toggle.Button value="underline">U</Toggle.Button>
</Toggle.Group>
\`\`\`

## Render function children

\`Toggle.Button\` supports children as a render function, giving you access to the
\`pressed\` state to customise the label or icon:

\`\`\`tsx
<Toggle.Button aria-label="Mute">
  {(_props, { pressed }) => (pressed ? "Unmute" : "Mute")}
</Toggle.Button>
\`\`\`
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: { control: "boolean" },
        defaultPressed: { control: "boolean" },
    },
    args: {
        disabled: false,
        defaultPressed: false,
    },
};

export default meta;
type Story = StoryObj<typeof Toggle.Button>;

// ─── Standalone button ────────────────────────────────────────────────────────

export const Default: Story = {
    parameters: {
        docs: { description: { story: "Unpressed by default. Click to toggle." } },
    },
    args: {
        "aria-label": "Toggle",
        children: "Label",
    },
};

export const Pressed: Story = {
    parameters: {
        docs: { description: { story: "Pre-pressed state via `defaultPressed`." } },
    },
    args: {
        "aria-label": "Toggle",
        defaultPressed: true,
        children: "Label",
    },
};

export const Disabled: Story = {
    parameters: {
        docs: { description: { story: "Disabled — cannot be interacted with." } },
    },
    args: {
        "aria-label": "Toggle",
        disabled: true,
        children: "Label",
    },
};

export const WithRenderFunction: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Children as a render function. Receives `toggleProps` and `{ pressed }` " +
                    "so the label or icon can react to the current state.",
            },
        },
    },
    render: () => (
        <Toggle.Button aria-label="Mute toggle">{(_props, { pressed }) => (pressed ? "Unmute" : "Mute")}</Toggle.Button>
    ),
};

export const AllStates: Story = {
    parameters: {
        docs: { description: { story: "All visual states side-by-side for quick comparison." } },
    },
    render: () => (
        <div className="flex flex-wrap gap-2">
            {(
                [
                    { label: "Default", props: {} },
                    { label: "Pressed", props: { defaultPressed: true } },
                    { label: "Disabled", props: { disabled: true } },
                    { label: "Disabled + pressed", props: { disabled: true, defaultPressed: true } },
                ] as const
            ).map(({ label, props }) => (
                <Toggle.Button key={label} aria-label={label} {...props}>
                    {label}
                </Toggle.Button>
            ))}
        </div>
    ),
};

// ─── Group ────────────────────────────────────────────────────────────────────

export const Group: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Uncontrolled single-selection group. Exactly one button is active at a time. " +
                    "Pass `defaultValue` to pre-select an option.",
            },
        },
    },
    render: () => (
        <Toggle.Group defaultValue={["week"]}>
            <Toggle.Button value="day">Day</Toggle.Button>
            <Toggle.Button value="week">Week</Toggle.Button>
            <Toggle.Button value="month">Month</Toggle.Button>
        </Toggle.Group>
    ),
};

export const GroupControlled: Story = {
    parameters: {
        docs: {
            description: {
                story: "Controlled group — pass `value` and `onValueChange` to own the active state externally.",
            },
        },
    },
    render: function GroupControlled() {
        const views = ["day", "week", "month"] as const;
        const [value, setValue] = React.useState<string>("week");
        return (
            <div className="flex flex-col items-center gap-3">
                <Toggle.Group value={[value]} onValueChange={([v]) => v && setValue(v)}>
                    {views.map((view) => (
                        <Toggle.Button key={view} value={view} layoutClassName="capitalize">
                            {view}
                        </Toggle.Button>
                    ))}
                </Toggle.Group>
                <p className="text-neutral-strong text-body-sm">Active: {value}</p>
            </div>
        );
    },
};

export const GroupMultiple: Story = {
    parameters: {
        docs: {
            description: {
                story: "Multiple-selection group via `toggleMultiple`. Any number of buttons can be active at once.",
            },
        },
    },
    render: function GroupMultiple() {
        const [value, setValue] = React.useState<string[]>(["bold", "italic"]);
        return (
            <div className="flex flex-col items-center gap-3">
                <Toggle.Group multiple value={value} onValueChange={setValue}>
                    <Toggle.Button value="bold">
                        <strong>B</strong>
                    </Toggle.Button>
                    <Toggle.Button value="italic">
                        <em>I</em>
                    </Toggle.Button>
                    <Toggle.Button value="underline">
                        <span className="underline">U</span>
                    </Toggle.Button>
                </Toggle.Group>
                <p className="text-neutral-strong text-body-sm">Active: {value.join(", ") || "none"}</p>
            </div>
        );
    },
};

export const GroupVertical: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Pass `orientation="vertical"` to stack buttons in a column.',
            },
        },
    },
    render: () => (
        <Toggle.Group defaultValue={["list"]} orientation="vertical">
            <Toggle.Button value="list">List</Toggle.Button>
            <Toggle.Button value="grid">Grid</Toggle.Button>
            <Toggle.Button value="table">Table</Toggle.Button>
        </Toggle.Group>
    ),
};

export const GroupDisabled: Story = {
    parameters: {
        docs: {
            description: {
                story: "Disabled group — all buttons are inert.",
            },
        },
    },
    render: () => (
        <Toggle.Group defaultValue={["week"]} disabled>
            <Toggle.Button value="day">Day</Toggle.Button>
            <Toggle.Button value="week">Week</Toggle.Button>
            <Toggle.Button value="month">Month</Toggle.Button>
        </Toggle.Group>
    ),
};

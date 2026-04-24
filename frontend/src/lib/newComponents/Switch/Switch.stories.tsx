import type { Meta, StoryObj } from "@storybook/react";

import { Switch, SwitchItem } from "./index";

const meta: Meta<typeof Switch> = {
    title: "Components/Switch",
    component: Switch,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A toggle switch for binary on/off settings.

## Labeling a Switch

Every switch must have an accessible name so that screen readers can announce its purpose.
There are three supported approaches — choose the one that fits your layout.

### 1. Wrapping \`<label>\` (recommended)

Wrap the \`<Switch>\` inside a \`<label>\`. The browser automatically associates the
label text with the control — no extra attributes needed.

\`\`\`tsx
<label className="flex items-center gap-2">
  <Switch />
  Enable notifications
</label>
\`\`\`

### 2. Sibling \`<label>\` with \`htmlFor\` / \`id\`

When the label and switch cannot be co-located (e.g. a settings row),
link them with a matching \`id\` and \`htmlFor\`.

\`\`\`tsx
<label htmlFor="wifi-switch">Wi-Fi</label>
<Switch id="wifi-switch" />
\`\`\`

### 3. \`aria-label\` (no visible label)

When no visible label is shown, provide an \`aria-label\` directly on the switch.
Use this sparingly — a visible label is always preferable.

\`\`\`tsx
<Switch aria-label="Enable dark mode" />
\`\`\`

## Convenience: \`SwitchItem\`

\`SwitchItem\` wraps \`Switch\` with a built-in \`<label>\`, removing the wrapping
boilerplate for the common case of a switch with a plain text label.
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        size: {
            control: "select",
            options: ["small", "default"],
        },
        disabled: {
            control: "boolean",
        },
        defaultChecked: {
            control: "boolean",
        },
    },
};

export default meta;
type Story = StoryObj<typeof Switch>;

// ─── Primitives ───────────────────────────────────────────────────────────────

export const Default: Story = {
    parameters: {
        docs: {
            description: { story: "Bare switch with no label — controlled via Storybook args." },
        },
    },
    args: {
        defaultChecked: false,
        "aria-label": "Toggle",
    },
};

export const Small: Story = {
    parameters: {
        docs: {
            description: { story: "The `small` size variant." },
        },
    },
    args: {
        size: "small",
        defaultChecked: true,
        "aria-label": "Toggle",
    },
};

export const Disabled: Story = {
    parameters: {
        docs: {
            description: { story: "Disabled state — the switch cannot be toggled." },
        },
    },
    args: {
        disabled: true,
        defaultChecked: false,
        "aria-label": "Toggle",
    },
};

export const WrappingLabel: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "The `<Switch>` placed inside a `<label>`. " +
                    "The browser associates the label text with the control natively — no extra attributes required. " +
                    "This is the recommended approach for most layouts.",
            },
        },
    },
    render: () => (
        <label className="flex cursor-pointer items-center gap-2 select-none">
            <Switch />
            <span>Enable notifications</span>
        </label>
    ),
};

export const SiblingLabel: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Label and switch linked via `htmlFor` / `id`. " +
                    "Use this when they are structurally separated, e.g. a settings row.",
            },
        },
    },
    render: () => (
        <div className="flex items-center justify-between gap-8">
            <label htmlFor="wifi-switch" className="cursor-pointer select-none">
                Wi-Fi
            </label>
            <Switch id="wifi-switch" />
        </div>
    ),
};

export const SettingsList: Story = {
    parameters: {
        docs: {
            description: {
                story: "A settings-style list where each row uses the sibling label pattern (`htmlFor` + `id`).",
            },
        },
    },
    render: () => (
        <div className="flex w-72 flex-col divide-y">
            {(
                [
                    { id: "setting-notifications", label: "Push notifications", defaultChecked: false, disabled: false },
                    { id: "setting-emails", label: "Email digest", defaultChecked: true, disabled: false },
                    { id: "setting-sms", label: "SMS alerts", defaultChecked: false, disabled: false },
                    { id: "setting-beta", label: "Beta features", defaultChecked: false, disabled: true },
                ] as const
            ).map(({ id, label, defaultChecked, disabled }) => (
                <div key={id} className="flex items-center justify-between py-3">
                    <label htmlFor={id} className="cursor-pointer select-none">
                        {label}
                    </label>
                    <Switch id={id} defaultChecked={defaultChecked} disabled={disabled} />
                </div>
            ))}
        </div>
    ),
};

// ─── Convenience: SwitchItem ──────────────────────────────────────────────────

export const WithSwitchItem: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "`SwitchItem` wraps `Switch` with a built-in `<label>`, removing boilerplate " +
                    "for the common case of a switch with a plain text label.",
            },
        },
    },
    render: () => (
        <div className="flex flex-col gap-1">
            <SwitchItem label="Enable notifications" />
            <SwitchItem label="Email digest" defaultChecked />
            <SwitchItem label="Beta features" disabled />
        </div>
    ),
};

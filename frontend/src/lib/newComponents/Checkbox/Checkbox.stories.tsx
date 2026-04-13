import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Checkbox } from "./index";

const meta: Meta<typeof Checkbox> = {
    title: "Components/Checkbox",
    component: Checkbox,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A checkbox for binary or indeterminate selections.

## States

The checkbox reflects its current state through data attributes on both the root and indicator elements.
Use these in CSS to style each state:

| Data attribute | When present |
|---|---|
| \`data-checked\` | Checkbox is ticked |
| \`data-unchecked\` | Checkbox is not ticked |
| \`data-indeterminate\` | Neither ticked nor unticked (mixed state) |
| \`data-disabled\` | Interaction is disabled |
| \`data-readonly\` | Value cannot be changed |
| \`data-required\` | Must be ticked before form submission |
| \`data-focused\` | Currently focused (within \`Field.Root\`) |

## Labeling

Every checkbox must have an accessible name. The checkbox renders as a \`<span>\` alongside
a visually-hidden \`<input>\`. The \`id\` prop is placed on the hidden input, so a sibling
\`<label htmlFor>\` targets it directly — no extra props needed.

\`\`\`tsx
// Wrapping label (recommended)
<label>
  <Checkbox />
  Accept terms
</label>

// Sibling label
<label htmlFor="terms">Accept terms</label>
<Checkbox id="terms" />
\`\`\`
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: { control: "boolean" },
        required: { control: "boolean" },
        indeterminate: { control: "boolean" },
        defaultChecked: { control: "boolean" },
    },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Unchecked: Story = {
    parameters: {
        docs: {
            description: { story: "Default unchecked state (`data-unchecked`)." },
        },
    },
    args: {
        "aria-label": "Checkbox",
        defaultChecked: false,
    },
};

export const Checked: Story = {
    parameters: {
        docs: {
            description: { story: "Ticked state (`data-checked`)." },
        },
    },
    args: {
        "aria-label": "Checkbox",
        defaultChecked: true,
    },
};

export const Indeterminate: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Mixed state (`data-indeterminate`) — neither ticked nor unticked. " +
                    "Commonly used for a parent checkbox that controls a partially-selected group.",
            },
        },
    },
    args: {
        "aria-label": "Checkbox",
        indeterminate: true,
    },
};

export const Disabled: Story = {
    parameters: {
        docs: {
            description: {
                story: "Disabled and unchecked (`data-disabled` + `data-unchecked`). Cannot be interacted with.",
            },
        },
    },
    args: {
        "aria-label": "Checkbox",
        disabled: true,
        defaultChecked: false,
    },
};

export const DisabledChecked: Story = {
    parameters: {
        docs: {
            description: { story: "Disabled and ticked (`data-disabled` + `data-checked`)." },
        },
    },
    args: {
        "aria-label": "Checkbox",
        disabled: true,
        defaultChecked: true,
    },
};

export const DisabledIndeterminate: Story = {
    parameters: {
        docs: {
            description: { story: "Disabled and indeterminate (`data-disabled` + `data-indeterminate`)." },
        },
    },
    args: {
        "aria-label": "Checkbox",
        disabled: true,
        indeterminate: true,
    },
};

export const SiblingLabel: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Checkbox linked to a separate `<label>` via `htmlFor` / `id`. " +
                    "The `id` is placed on the hidden `<input>`, so `htmlFor` targets it directly.",
            },
        },
    },
    render: () => (
        <div className="flex items-center gap-2">
            <Checkbox id="newsletter" />
            <label htmlFor="newsletter" className="cursor-pointer select-none">
                Subscribe to newsletter
            </label>
        </div>
    ),
};

export const AllStates: Story = {
    parameters: {
        docs: {
            description: {
                story: "All visual states side-by-side for quick comparison.",
            },
        },
    },
    render: () => (
        <div className="flex flex-col gap-3">
            {(
                [
                    { label: "Unchecked", props: {} },
                    { label: "Checked", props: { defaultChecked: true } },
                    { label: "Indeterminate", props: { indeterminate: true } },
                    { label: "Disabled", props: { disabled: true } },
                    { label: "Disabled + checked", props: { disabled: true, defaultChecked: true } },
                    { label: "Disabled + indeterminate", props: { disabled: true, indeterminate: true } },
                ] as const
            ).map(({ label, props }) => (
                <label key={label} className="flex cursor-pointer items-center gap-2 select-none">
                    <Checkbox {...props} />
                    <span>{label}</span>
                </label>
            ))}
        </div>
    ),
};

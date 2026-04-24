import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Field } from "../Field";

import { Radio, RadioGroup, RadioItem, SimpleRadioGroup } from "./index";

const meta: Meta<typeof RadioGroup> = {
    title: "Components/Radio",
    component: RadioGroup,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
Radio buttons let users select exactly one option from a set.

## Primitives: \`Radio\` + \`RadioGroup\`

\`RadioGroup\` manages shared selection state; each \`Radio\` inside it represents one
option. Labels and layout are fully up to you.

\`\`\`tsx
import { Radio, RadioGroup } from "@/lib/newComponents/Radio";

<RadioGroup defaultValue="light">
  <label className="flex items-center gap-2">
    <Radio value="light" /> Light
  </label>
  <label className="flex items-center gap-2">
    <Radio value="dark" /> Dark
  </label>
</RadioGroup>
\`\`\`

## Convenience: \`RadioItem\` + \`SimpleRadioGroup\`

- **\`RadioItem\`** — a \`Radio\` pre-wired to a wrapping \`<label>\`. Useful when composing
  a group manually but you don't want to write the label yourself.
- **\`SimpleRadioGroup\`** — renders a complete group from an \`options\` array.
  The fastest path when all you need is a list of \`{ value, label }\` pairs.
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: { control: "boolean" },
        readOnly: { control: "boolean" },
        required: { control: "boolean" },
        defaultValue: {
            control: "select",
            options: ["light", "dark", "system"],
        },
    },
    args: {
        disabled: false,
        readOnly: false,
        required: false,
        defaultValue: "system",
    },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

// ─── Primitives ───────────────────────────────────────────────────────────────

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: "Uncontrolled group with a pre-selected value. Labels and layout are composed manually.",
            },
        },
    },
    render: (args) => (
        <RadioGroup {...args}>
            <div className="flex flex-col gap-1">
                {(["Light", "Dark", "System"] as const).map((option) => (
                    <label key={option} className="flex cursor-pointer items-center gap-2 select-none">
                        <Radio value={option.toLowerCase()} />
                        <span>{option}</span>
                    </label>
                ))}
            </div>
        </RadioGroup>
    ),
};

export const Controlled: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Pass `value` and `onValueChange` to own the selection state externally. " +
                    "Useful when other parts of the UI depend on the selected value.",
            },
        },
    },
    render: () => {
        const [value, setValue] = React.useState("monthly");
        return (
            <div className="flex flex-col gap-3">
                <RadioGroup value={value} onValueChange={setValue}>
                    <div className="flex flex-col gap-1">
                        {(["Monthly", "Yearly"] as const).map((option) => (
                            <label key={option} className="flex cursor-pointer items-center gap-2 select-none">
                                <Radio value={option.toLowerCase()} />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>
                </RadioGroup>
                <p className="text-sm text-neutral-500">Selected: {value}</p>
            </div>
        );
    },
};

export const Disabled: Story = {
    parameters: {
        docs: {
            description: {
                story: "The `disabled` prop on the group disables every radio at once.",
            },
        },
    },
    render: () => (
        <RadioGroup defaultValue="standard" disabled>
            <div className="flex flex-col gap-1">
                {(["Standard", "Express", "Overnight"] as const).map((option) => (
                    <label key={option} className="flex cursor-pointer items-center gap-2 select-none">
                        <Radio value={option.toLowerCase()} />
                        <span>{option}</span>
                    </label>
                ))}
            </div>
        </RadioGroup>
    ),
};

export const WithField: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Wrap `RadioGroup` in `Field.Root` to attach a shared label and description. " +
                    "The field label acts as the accessible name for the entire group via `aria-labelledby`.",
            },
        },
    },
    render: () => (
        <Field.Root>
            <Field.Label>Notification frequency</Field.Label>
            <Field.Details>Choose how often you receive email updates.</Field.Details>
            <RadioGroup defaultValue="weekly">
                <div className="mt-1 flex flex-col gap-1">
                    {(
                        [
                            { value: "realtime", label: "Real-time" },
                            { value: "daily", label: "Daily digest" },
                            { value: "weekly", label: "Weekly summary" },
                            { value: "never", label: "Never" },
                        ] as const
                    ).map(({ value, label }) => (
                        <label key={value} className="flex cursor-pointer items-center gap-2 select-none">
                            <Radio value={value} />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </RadioGroup>
        </Field.Root>
    ),
};

// ─── Convenience: RadioItem ───────────────────────────────────────────────────

export const WithRadioItem: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "`RadioItem` wraps `Radio` with a built-in `<label>`, removing boilerplate when each " +
                    "option needs a plain text label. It also accepts `children` for richer content like " +
                    "titles with supporting descriptions.",
            },
        },
    },
    render: () => (
        <RadioGroup defaultValue="card">
            <div className="flex flex-col gap-2">
                <RadioItem value="card">
                    <div className="flex flex-col">
                        <span className="font-medium">Credit / debit card</span>
                        <span className="text-sm text-neutral-500">Visa, Mastercard, Amex</span>
                    </div>
                </RadioItem>
                <RadioItem value="paypal">
                    <div className="flex flex-col">
                        <span className="font-medium">PayPal</span>
                        <span className="text-sm text-neutral-500">You will be redirected to PayPal</span>
                    </div>
                </RadioItem>
                <RadioItem value="bank" disabled>
                    <div className="flex flex-col">
                        <span className="font-medium">Bank transfer</span>
                        <span className="text-sm text-neutral-500">Currently unavailable</span>
                    </div>
                </RadioItem>
            </div>
        </RadioGroup>
    ),
};

// ─── Convenience: SimpleRadioGroup ───────────────────────────────────────────

export const SimpleGroup: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "`SimpleRadioGroup` generates the entire group from an `options` array — " +
                    "the shortest path when all you need is a list of `{ value, label }` pairs.",
            },
        },
    },
    argTypes: {
        defaultValue: {
            control: "select",
            options: ["standard", "express", "overnight"],
        },
    },
    args: {
        defaultValue: "standard",
    },
    render: (args) => (
        <SimpleRadioGroup
            {...args}
            options={[
                { value: "standard", label: "Standard (3–5 days)" },
                { value: "express", label: "Express (1–2 days)" },
                { value: "overnight", label: "Overnight" },
            ]}
        />
    ),
};

export const SimpleGroupHorizontal: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Pass `layout="horizontal"` to `SimpleRadioGroup` to arrange options side by side.',
            },
        },
    },
    argTypes: {
        defaultValue: {
            control: "select",
            options: ["yes", "no", "maybe"],
        },
    },
    args: {
        defaultValue: "yes",
    },
    render: (args) => (
        <SimpleRadioGroup
            {...args}
            layout="horizontal"
            options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
                { value: "maybe", label: "Maybe" },
            ]}
        />
    ),
};

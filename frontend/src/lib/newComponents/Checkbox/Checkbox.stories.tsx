import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Field } from "../Field";

import { Checkbox, CheckboxGroup, CheckboxItem, SimpleCheckboxGroup } from "./index";

const meta: Meta<typeof Checkbox> = {
    title: "Components/Checkbox",
    component: Checkbox,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A checkbox for binary or indeterminate selections, and a group component for managing
multiple related checkboxes.

## Primitives: \`Checkbox\` + \`CheckboxGroup\`

\`Checkbox\` can be used standalone or inside a \`CheckboxGroup\`. When grouped,
\`CheckboxGroup\` manages shared state; each \`Checkbox\` with a \`value\` prop is
automatically registered. Labels and layout are fully up to you.

\`\`\`tsx
import { Checkbox, CheckboxGroup } from "@/lib/newComponents/Checkbox";

<CheckboxGroup defaultValue={["html", "css"]}>
  <label className="flex items-center gap-2">
    <Checkbox value="html" /> HTML
  </label>
  <label className="flex items-center gap-2">
    <Checkbox value="css" /> CSS
  </label>
</CheckboxGroup>
\`\`\`

## Convenience: \`CheckboxItem\` + \`SimpleCheckboxGroup\`

- **\`CheckboxItem\`** — a \`Checkbox\` pre-wired to a wrapping \`<label>\`. Removes
  boilerplate when composing a group manually.
- **\`SimpleCheckboxGroup\`** — renders a complete group from an \`options\` array.
  The fastest path when all you need is a list of \`{ value, label }\` pairs.

## Labeling a standalone checkbox

Every checkbox must have an accessible name. The checkbox renders a visually-hidden
\`<input>\` alongside the visible element. The \`id\` prop is placed on the hidden input,
so a sibling \`<label htmlFor>\` targets it directly.

\`\`\`tsx
// Wrapping label (recommended)
<label>
  <Checkbox /> Accept terms
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

// ─── Standalone states ────────────────────────────────────────────────────────

export const Unchecked: Story = {
    parameters: {
        docs: { description: { story: "Default unchecked state (`data-unchecked`)." } },
    },
    args: {
        "aria-label": "Checkbox",
        defaultChecked: false,
    },
};

export const Checked: Story = {
    parameters: {
        docs: { description: { story: "Ticked state (`data-checked`)." } },
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
                story: "Disabled and unchecked. Cannot be interacted with.",
            },
        },
    },
    args: {
        "aria-label": "Checkbox",
        disabled: true,
        defaultChecked: false,
    },
};

export const AllStates: Story = {
    parameters: {
        docs: { description: { story: "All visual states side-by-side for quick comparison." } },
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

// ─── Group: primitives ────────────────────────────────────────────────────────

export const Group: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Uncontrolled group with pre-selected values. Labels and layout are composed manually " +
                    "using `Checkbox` + `CheckboxGroup`.",
            },
        },
    },
    render: () => (
        <CheckboxGroup defaultValue={["html", "css"]}>
            <div className="flex flex-col gap-1">
                {(["HTML", "CSS", "JavaScript", "TypeScript"] as const).map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-2 select-none">
                        <Checkbox value={item.toLowerCase()} />
                        <span>{item}</span>
                    </label>
                ))}
            </div>
        </CheckboxGroup>
    ),
};

export const GroupControlled: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Controlled group — pass `value` and `onValueChange` to own the selection state externally.",
            },
        },
    },
    render: () => {
        const items = ["HTML", "CSS", "JavaScript", "TypeScript"] as const;
        const [value, setValue] = React.useState<string[]>(["html"]);
        return (
            <div className="flex flex-col gap-3">
                <CheckboxGroup value={value} onValueChange={setValue}>
                    <div className="flex flex-col gap-1">
                        {items.map((item) => (
                            <label key={item} className="flex cursor-pointer items-center gap-2 select-none">
                                <Checkbox value={item.toLowerCase()} />
                                <span>{item}</span>
                            </label>
                        ))}
                    </div>
                </CheckboxGroup>
                <p className="text-sm text-neutral-500">Selected: {value.join(", ") || "none"}</p>
            </div>
        );
    },
};

export const GroupWithParent: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "A parent checkbox that selects or deselects all children at once, showing an " +
                    "indeterminate state when only some are checked. Requires a controlled group with `allValues`.",
            },
        },
    },
    render: () => {
        const fruits = ["apple", "banana", "cherry", "date"] as const;
        const [value, setValue] = React.useState<string[]>(["apple", "cherry"]);
        return (
            <CheckboxGroup value={value} onValueChange={setValue} allValues={[...fruits]}>
                <div className="flex flex-col gap-1">
                    <label className="flex cursor-pointer items-center gap-2 font-medium select-none">
                        <Checkbox parent nativeButton />
                        <span>All fruits</span>
                    </label>
                    <div className="ml-6 flex flex-col gap-1">
                        {fruits.map((fruit) => (
                            <label key={fruit} className="flex cursor-pointer items-center gap-2 select-none">
                                <Checkbox value={fruit} nativeButton />
                                <span className="capitalize">{fruit}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </CheckboxGroup>
        );
    },
};

export const GroupDisabled: Story = {
    parameters: {
        docs: {
            description: { story: "The `disabled` prop on the group disables every checkbox at once." },
        },
    },
    render: () => (
        <CheckboxGroup defaultValue={["css"]} disabled>
            <div className="flex flex-col gap-1">
                {(["HTML", "CSS", "JavaScript"] as const).map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-2 select-none">
                        <Checkbox value={item.toLowerCase()} />
                        <span>{item}</span>
                    </label>
                ))}
            </div>
        </CheckboxGroup>
    ),
};

export const GroupWithField: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Wrap `CheckboxGroup` in `Field.Root` to attach a shared label and description to the group.",
            },
        },
    },
    render: () => (
        <Field.Root>
            <Field.Label>Notify me about</Field.Label>
            <Field.Details>Choose which events trigger a notification.</Field.Details>
            <CheckboxGroup defaultValue={["comments"]}>
                <div className="mt-1 flex flex-col gap-1">
                    {(
                        [
                            { value: "comments", label: "New comments" },
                            { value: "mentions", label: "Mentions" },
                            { value: "updates", label: "Product updates" },
                        ] as const
                    ).map(({ value, label }) => (
                        <label key={value} className="flex cursor-pointer items-center gap-2 select-none">
                            <Checkbox value={value} />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </CheckboxGroup>
        </Field.Root>
    ),
};

// ─── Convenience: CheckboxItem ────────────────────────────────────────────────

export const WithCheckboxItem: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "`CheckboxItem` wraps `Checkbox` with a built-in `<label>`, removing boilerplate " +
                    "when composing a group manually.",
            },
        },
    },
    render: () => (
        <CheckboxGroup defaultValue={["read"]}>
            <div className="flex flex-col gap-1">
                <CheckboxItem value="read" label="Read" />
                <CheckboxItem value="write" label="Write" />
                <CheckboxItem value="admin" label="Admin" disabled />
            </div>
        </CheckboxGroup>
    ),
};

// ─── Convenience: SimpleCheckboxGroup ────────────────────────────────────────

export const SimpleGroup: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "`SimpleCheckboxGroup` generates the entire group from an `options` array — " +
                    "the shortest path when all you need is a list of `{ value, label }` pairs.",
            },
        },
    },
    render: () => (
        <SimpleCheckboxGroup
            defaultValue={["mon", "tue", "wed", "thu", "fri"]}
            options={[
                { value: "mon", label: "Monday" },
                { value: "tue", label: "Tuesday" },
                { value: "wed", label: "Wednesday" },
                { value: "thu", label: "Thursday" },
                { value: "fri", label: "Friday" },
                { value: "sat", label: "Saturday", disabled: true },
                { value: "sun", label: "Sunday", disabled: true },
            ]}
        />
    ),
};

export const SimpleGroupHorizontal: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Pass `layout="horizontal"` to arrange options side by side.',
            },
        },
    },
    render: () => (
        <SimpleCheckboxGroup
            defaultValue={["read"]}
            layout="horizontal"
            options={[
                { value: "read", label: "Read" },
                { value: "write", label: "Write" },
                { value: "execute", label: "Execute" },
            ]}
        />
    ),
};

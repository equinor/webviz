import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Field } from "@lib/newComponents/Field";

import { Combobox } from "./index";

const COUNTRIES_BY_CONTINENT = [
    {
        value: "africa",
        items: [
            { value: "eg", label: "Egypt" },
            { value: "ng", label: "Nigeria" },
            { value: "za", label: "South Africa" },
            { value: "ke", label: "Kenya" },
        ],
    },
    {
        value: "americas",
        items: [
            { value: "br", label: "Brazil" },
            { value: "ca", label: "Canada" },
            { value: "mx", label: "Mexico" },
            { value: "us", label: "United States" },
        ],
    },
    {
        value: "asia",
        items: [
            { value: "cn", label: "China" },
            { value: "in", label: "India" },
            { value: "jp", label: "Japan" },
            { value: "kr", label: "South Korea" },
        ],
    },
    {
        value: "europe",
        items: [
            { value: "de", label: "Germany" },
            { value: "fr", label: "France" },
            { value: "no", label: "Norway" },
            { value: "gb", label: "United Kingdom" },
        ],
    },
    {
        value: "oceania",
        items: [
            { value: "au", label: "Australia" },
            { value: "nz", label: "New Zealand" },
        ],
    },
];

const COUNTRIES = COUNTRIES_BY_CONTINENT.flatMap((group) => group.items);

const CONTINENT_COLORS: Record<string, string> = {
    africa: "#f59e0b",
    americas: "#10b981",
    asia: "#ef4444",
    europe: "#3b82f6",
    oceania: "#8b5cf6",
};

const COUNTRY_CONTINENT: Record<string, string> = Object.fromEntries(
    COUNTRIES_BY_CONTINENT.flatMap((group) => group.items.map((item) => [item.value, group.value])),
);

const meta: Meta<typeof Combobox> = {
    title: "Components/Combobox",
    component: Combobox,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component:
                    "A filterable select input that lets the user type to narrow down a list of options. Supports single and multiple selection, grouping, controlled state, and async loading.",
            },
        },
    },
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div className="w-64">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        placeholder: { control: "text" },
        noMatchesText: { control: "text" },
        clearable: { control: "boolean" },
        disabled: { control: "boolean" },
    },
};

export default meta;
type Story = StoryObj<typeof Combobox>;

export const Default: Story = {
    parameters: {
        docs: {
            description: { story: "Basic single-select combobox with a flat list of items." },
        },
    },
    args: {
        items: COUNTRIES,
        placeholder: "Select a country",
    },
};

export const Clearable: Story = {
    parameters: {
        docs: {
            description: { story: "Shows a clear button once a value is selected." },
        },
    },
    args: {
        items: COUNTRIES,
        clearable: true,
        defaultValue: "no",
    },
};

export const WithDefaultValue: Story = {
    parameters: {
        docs: {
            description: { story: "Renders with an item pre-selected via `defaultValue`." },
        },
    },
    args: {
        items: COUNTRIES,
        defaultValue: "de",
        clearable: true,
    },
};

export const MultipleSelect: Story = {
    parameters: {
        docs: {
            description: { story: "Pass `multiple` to allow selecting more than one item." },
        },
    },
    render: () => (
        <div className="w-64">
            <Combobox items={COUNTRIES} multiple clearable placeholder="Select countries" />
        </div>
    ),
};

export const GroupedItems: Story = {
    parameters: {
        docs: {
            description: {
                story: "Pass an array of `{ value, items }` group objects to organise options under labelled headings.",
            },
        },
    },
    render: () => (
        <div className="w-64">
            <Combobox items={COUNTRIES_BY_CONTINENT} placeholder="Select a country" clearable />
        </div>
    ),
};

export const Controlled: Story = {
    parameters: {
        docs: {
            description: { story: "Fully controlled — external state owns the selected value." },
        },
    },
    render: () => {
        const [value, setValue] = React.useState<string | null>(null);
        return (
            <div className="flex w-64 flex-col gap-3">
                <Combobox
                    items={COUNTRIES}
                    value={value}
                    onValueChange={setValue}
                    clearable
                    placeholder="Select a country"
                />
                <p className="text-body-sm text-neutral-subtle">
                    Selected: {value ? (COUNTRIES.find((c) => c.value === value)?.label ?? value) : "none"}
                </p>
            </div>
        );
    },
};

export const Disabled: Story = {
    parameters: {
        docs: {
            description: { story: "The combobox cannot be interacted with when disabled." },
        },
    },
    args: {
        items: COUNTRIES,
        disabled: true,
        placeholder: "Disabled",
    },
};

export const CustomNoMatchesText: Story = {
    parameters: {
        docs: {
            description: { story: "Override the fallback text shown when filtering returns no results." },
        },
    },
    args: {
        items: COUNTRIES,
        noMatchesText: "Nothing here…",
        placeholder: "Try typing 'xyz'",
    },
};

export const WithField: Story = {
    parameters: {
        docs: {
            description: {
                story: "Wrap in `Field.Root` to attach an accessible label and description.",
            },
        },
    },
    render: () => (
        <div className="w-64">
            <Field.Root>
                <Field.Label>Country</Field.Label>
                <Field.Details>Select your country of residence.</Field.Details>
                <Combobox items={COUNTRIES} clearable placeholder="Select a country" />
            </Field.Root>
        </div>
    ),
};

export const WithItemAdornment: Story = {
    parameters: {
        docs: {
            description: {
                story: "Use `renderItemAdornment` to add a custom visual before each item's label. The same adornment appears in the input group once a value is selected, and inside chips in multi-select mode.",
            },
        },
    },
    render: () => {
        function ContinentDot({ countryCode }: { countryCode: string }) {
            const continent = COUNTRY_CONTINENT[countryCode];
            const color = CONTINENT_COLORS[continent] ?? "#6b7280";
            return <span style={{ background: color }} className="inline-block h-3 w-3 shrink-0 rounded-full" />;
        }

        return (
            <div className="flex w-64 flex-col gap-6">
                <Combobox
                    items={COUNTRIES}
                    placeholder="Select a country"
                    clearable
                    renderItemAdornment={(item) => <ContinentDot countryCode={item} />}
                />
                <Combobox
                    items={COUNTRIES}
                    placeholder="Select countries"
                    multiple
                    clearable
                    renderItemAdornment={(item) => <ContinentDot countryCode={item} />}
                />
            </div>
        );
    },
};

// ─── Async stories ────────────────────────────────────────────────────────────

export const AsyncLoading: Story = {
    parameters: {
        docs: {
            description: {
                story: "Pass `loading` to signal that options are being fetched. The empty-state slot shows `loadingText` while loading is true.",
            },
        },
    },
    args: {
        items: [],
        loading: true,
        loadingText: "Loading options…",
        placeholder: "Select a country",
    },
};

export const AsyncError: Story = {
    parameters: {
        docs: {
            description: {
                story: "Pass `errorText` when a fetch fails. The list is replaced by the error message.",
            },
        },
    },
    args: {
        items: [],
        errorText: "Failed to load options. Please try again.",
        placeholder: "Select a country",
    },
};

/**
 * Items are fetched once when the dropdown opens, simulating a one-shot async
 * load (e.g. a paginated endpoint that returns a pre-filtered list).
 */
export const AsyncFetchOnOpen: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Items are fetched once when the dropdown first opens. While the request is in flight the combobox shows a loading indicator; on success the list is populated.",
            },
        },
    },
    render: () => {
        const [items, setItems] = React.useState<{ value: string; label: string }[]>([]);
        const [loading, setLoading] = React.useState(false);
        const [open, setOpen] = React.useState(false);
        const fetchedRef = React.useRef(false);

        function handleOpenChange(nextOpen: boolean) {
            setOpen(nextOpen);
            if (nextOpen && !fetchedRef.current) {
                fetchedRef.current = true;
                setLoading(true);
                setTimeout(() => {
                    setItems(COUNTRIES);
                    setLoading(false);
                }, 1500);
            }
        }

        return (
            <div className="w-64">
                <Combobox
                    items={items}
                    loading={loading}
                    open={open}
                    onOpenChange={handleOpenChange}
                    clearable
                    placeholder="Select a country"
                />
            </div>
        );
    },
};

/**
 * The list is re-fetched on every input change, simulating a server-side
 * search (e.g. an autocomplete backed by an API).
 */
export const AsyncSearchAsYouType: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Items are re-fetched on every keystroke, simulating a server-side search API. A 600 ms debounce limits requests; the combobox shows a spinner while the request is in flight. Internal filtering is disabled via `filter={null}` so the server-returned list is rendered as-is.",
            },
        },
    },
    render: () => {
        const [items, setItems] = React.useState<{ value: string; label: string }[]>([]);
        const [loading, setLoading] = React.useState(false);
        const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

        function handleInputValueChange(query: string) {
            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (!query) {
                setItems([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            debounceRef.current = setTimeout(() => {
                const results = COUNTRIES.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
                setItems(results);
                setLoading(false);
            }, 600);
        }

        return (
            <div className="w-64">
                <Combobox
                    items={items}
                    loading={loading}
                    filter={null}
                    clearable
                    placeholder="Type to search countries…"
                    onInputValueChange={handleInputValueChange}
                />
            </div>
        );
    },
};

export const AsyncFetchError: Story = {
    parameters: {
        docs: {
            description: {
                story: "Demonstrates the error recovery flow: the first load fails, and a retry button re-triggers the fetch.",
            },
        },
    },
    render: () => {
        const [items, setItems] = React.useState<{ value: string; label: string }[]>([]);
        const [loading, setLoading] = React.useState(false);
        const [errorText, setErrorText] = React.useState<string | undefined>(undefined);
        const [open, setOpen] = React.useState(false);
        const attemptRef = React.useRef(0);

        function load() {
            setLoading(true);
            setErrorText(undefined);
            setItems([]);
            const attempt = ++attemptRef.current;
            setTimeout(() => {
                // Fail on first attempt, succeed on retry.
                if (attempt === 1) {
                    setLoading(false);
                    setErrorText("Network error — click Retry to try again.");
                } else {
                    setItems(COUNTRIES);
                    setLoading(false);
                }
            }, 1200);
        }

        function handleOpenChange(nextOpen: boolean) {
            setOpen(nextOpen);
            if (nextOpen && attemptRef.current === 0) load();
        }

        return (
            <div className="flex w-64 flex-col gap-3">
                <Combobox
                    items={items}
                    loading={loading}
                    errorText={
                        errorText ? (
                            <span className="flex items-center gap-2">
                                {errorText}
                                <button
                                    className="text-accent-strong underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        load();
                                    }}
                                >
                                    Retry
                                </button>
                            </span>
                        ) : undefined
                    }
                    open={open}
                    onOpenChange={handleOpenChange}
                    clearable
                    placeholder="Select a country"
                />
            </div>
        );
    },
};

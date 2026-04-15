import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";

import { Tabs } from "./index";

const meta: Meta<typeof Tabs.Root> = {
    title: "Components/Tabs",
    component: Tabs.Root,
    decorators: [(Story) => <div className="w-full max-w-[600px]"><Story /></div>],
    parameters: {
        layout: "padded",
        docs: {
            description: {
                component: `
The \`Tabs\` is a compound component for building tabbed navigation interfaces.

## Sub-components

| Component | Description |
|---|---|
| \`Tabs.Root\` | The root container. Manages active tab state and orientation. |
| \`Tabs.List\` | The tab button row. Renders tabs and an animated indicator. |
| \`Tabs.Tab\` | An individual tab trigger. Supports disabled state and a render-prop child for access to \`isActive\`. |
| \`Tabs.Panel\` | The content panel associated with a tab. Omit panels to use tabs for navigation only. |

## Composition

\`\`\`tsx
<Tabs.Root defaultValue="a">
    <Tabs.List>
        <Tabs.Tab value="a">Tab A</Tabs.Tab>
        <Tabs.Tab value="b">Tab B</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel value="a">Content A</Tabs.Panel>
    <Tabs.Panel value="b">Content B</Tabs.Panel>
</Tabs.Root>
\`\`\`

## Without panels

Tabs can be used without \`Tabs.Panel\` — for example, to drive external state or route-based navigation.

\`\`\`tsx
<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
    <Tabs.List>
        <Tabs.Tab value="map">Map</Tabs.Tab>
        <Tabs.Tab value="table">Table</Tabs.Tab>
    </Tabs.List>
</Tabs.Root>
\`\`\`
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        orientation: {
            control: "select",
            options: ["horizontal", "vertical"],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Tabs.Root>;

// ─── Sub-component stories ────────────────────────────────────────────────────

export const SubList: Story = {
    name: "Sub-component: List",
    parameters: {
        docs: {
            description: {
                story: "A `Tabs.List` with three tabs and the default indicator position (`end`). Click a tab to move the indicator.",
            },
        },
    },
    render: () => (
        <Tabs.Root defaultValue="a">
            <Tabs.List>
                <Tabs.Tab value="a">Overview</Tabs.Tab>
                <Tabs.Tab value="b">Details</Tabs.Tab>
                <Tabs.Tab value="c">Settings</Tabs.Tab>
            </Tabs.List>
        </Tabs.Root>
    ),
};

export const SubTab: Story = {
    name: "Sub-component: Tab",
    parameters: {
        docs: {
            description: {
                story: "Individual tabs, including a disabled one. Disabled tabs cannot be selected.",
            },
        },
    },
    render: () => (
        <Tabs.Root defaultValue="a">
            <Tabs.List>
                <Tabs.Tab value="a">Active</Tabs.Tab>
                <Tabs.Tab value="b">Normal</Tabs.Tab>
                <Tabs.Tab value="c" disabled>Disabled</Tabs.Tab>
            </Tabs.List>
        </Tabs.Root>
    ),
};

export const SubPanel: Story = {
    name: "Sub-component: Panel",
    parameters: {
        docs: {
            description: {
                story: "Each `Tabs.Panel` is shown when its `value` matches the active tab.",
            },
        },
    },
    render: () => (
        <Tabs.Root defaultValue="a">
            <Tabs.List>
                <Tabs.Tab value="a">Tab A</Tabs.Tab>
                <Tabs.Tab value="b">Tab B</Tabs.Tab>
                <Tabs.Tab value="c">Tab C</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="a"><p className="p-4">Content for Tab A.</p></Tabs.Panel>
            <Tabs.Panel value="b"><p className="p-4">Content for Tab B.</p></Tabs.Panel>
            <Tabs.Panel value="c"><p className="p-4">Content for Tab C.</p></Tabs.Panel>
        </Tabs.Root>
    ),
};

// ─── Indicator position stories ───────────────────────────────────────────────

export const IndicatorEnd: Story = {
    name: "Indicator: End (default)",
    parameters: {
        docs: {
            description: {
                story: "The default indicator position — rendered at the bottom of horizontal tabs.",
            },
        },
    },
    render: () => (
        <Tabs.Root defaultValue="a">
            <Tabs.List indicatorPosition="end">
                <Tabs.Tab value="a">Overview</Tabs.Tab>
                <Tabs.Tab value="b">Details</Tabs.Tab>
                <Tabs.Tab value="c">Settings</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="a"><p className="p-4">Overview content.</p></Tabs.Panel>
            <Tabs.Panel value="b"><p className="p-4">Details content.</p></Tabs.Panel>
            <Tabs.Panel value="c"><p className="p-4">Settings content.</p></Tabs.Panel>
        </Tabs.Root>
    ),
};

export const IndicatorStart: Story = {
    name: "Indicator: Start",
    parameters: {
        docs: {
            description: {
                story: "Set `indicatorPosition=\"start\"` to move the indicator to the top of horizontal tabs.",
            },
        },
    },
    render: () => (
        <Tabs.Root defaultValue="a">
            <Tabs.List indicatorPosition="start">
                <Tabs.Tab value="a">Overview</Tabs.Tab>
                <Tabs.Tab value="b">Details</Tabs.Tab>
                <Tabs.Tab value="c">Settings</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="a"><p className="p-4">Overview content.</p></Tabs.Panel>
            <Tabs.Panel value="b"><p className="p-4">Details content.</p></Tabs.Panel>
            <Tabs.Panel value="c"><p className="p-4">Settings content.</p></Tabs.Panel>
        </Tabs.Root>
    ),
};

// ─── Orientation stories ──────────────────────────────────────────────────────

export const Horizontal: Story = {
    name: "Orientation: Horizontal (default)",
    parameters: {
        docs: {
            description: {
                story: "Default horizontal layout — tabs are arranged in a row.",
            },
        },
    },
    render: () => (
        <Tabs.Root defaultValue="a">
            <Tabs.List>
                <Tabs.Tab value="a">Tab A</Tabs.Tab>
                <Tabs.Tab value="b">Tab B</Tabs.Tab>
                <Tabs.Tab value="c">Tab C</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="a"><p className="p-4">Content for Tab A.</p></Tabs.Panel>
            <Tabs.Panel value="b"><p className="p-4">Content for Tab B.</p></Tabs.Panel>
            <Tabs.Panel value="c"><p className="p-4">Content for Tab C.</p></Tabs.Panel>
        </Tabs.Root>
    ),
};

export const Vertical: Story = {
    name: "Orientation: Vertical",
    parameters: {
        docs: {
            description: {
                story: "Set `orientation=\"vertical\"` on `Tabs.Root` to arrange tabs in a column. The indicator tracks along the vertical axis.",
            },
        },
    },
    render: () => (
        <Tabs.Root defaultValue="a" orientation="vertical" className="flex gap-4">
            <Tabs.List>
                <Tabs.Tab value="a">Tab A</Tabs.Tab>
                <Tabs.Tab value="b">Tab B</Tabs.Tab>
                <Tabs.Tab value="c">Tab C</Tabs.Tab>
            </Tabs.List>
            <div className="flex-1">
                <Tabs.Panel value="a"><p className="p-4">Content for Tab A.</p></Tabs.Panel>
                <Tabs.Panel value="b"><p className="p-4">Content for Tab B.</p></Tabs.Panel>
                <Tabs.Panel value="c"><p className="p-4">Content for Tab C.</p></Tabs.Panel>
            </div>
        </Tabs.Root>
    ),
};

// ─── Without panels ───────────────────────────────────────────────────────────

export const WithoutPanels: Story = {
    name: "Without panels",
    parameters: {
        docs: {
            description: {
                story: "Tabs can be used without `Tabs.Panel` — useful when tab selection drives external state, routing, or a separate content area. The active value is displayed below for illustration.",
            },
        },
    },
    render: function WithoutPanelsStory() {
        const [active, setActive] = useState("map");
        return (
            <div className="flex flex-col gap-4">
                <Tabs.Root value={active} onValueChange={setActive}>
                    <Tabs.List>
                        <Tabs.Tab value="map">Map</Tabs.Tab>
                        <Tabs.Tab value="table">Table</Tabs.Tab>
                        <Tabs.Tab value="chart">Chart</Tabs.Tab>
                    </Tabs.List>
                </Tabs.Root>
                <p className="text-sm text-neutral-subtle px-1">
                    Active view: <strong>{active}</strong>
                </p>
            </div>
        );
    },
};

// ─── Controlled story ─────────────────────────────────────────────────────────

export const Controlled: Story = {
    name: "Controlled",
    parameters: {
        docs: {
            description: {
                story: "Pass `value` and `onValueChange` to control the active tab from outside the component. Use `defaultValue` instead for uncontrolled usage.",
            },
        },
    },
    render: function ControlledStory() {
        const [active, setActive] = useState("b");
        return (
            <Tabs.Root value={active} onValueChange={setActive}>
                <Tabs.List>
                    <Tabs.Tab value="a">Alpha</Tabs.Tab>
                    <Tabs.Tab value="b">Beta</Tabs.Tab>
                    <Tabs.Tab value="c">Gamma</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="a"><p className="p-4">Alpha panel content.</p></Tabs.Panel>
                <Tabs.Panel value="b"><p className="p-4">Beta panel content.</p></Tabs.Panel>
                <Tabs.Panel value="c"><p className="p-4">Gamma panel content.</p></Tabs.Panel>
            </Tabs.Root>
        );
    },
};

// ─── Custom tab render ────────────────────────────────────────────────────────

export const CustomTabRender: Story = {
    name: "Custom tab render (isActive)",
    parameters: {
        docs: {
            description: {
                story: "Pass a render-prop function as `children` to `Tabs.Tab` to access the `isActive` state — useful for conditionally styling icons or badges inside a tab.",
            },
        },
    },
    render: () => (
        <Tabs.Root defaultValue="a">
            <Tabs.List>
                {(["a", "b", "c"] as const).map((value) => (
                    <Tabs.Tab key={value} value={value}>
                        {({ isActive }) => (
                            <span className={isActive ? "font-bold" : undefined}>
                                Tab {value.toUpperCase()}
                                {isActive && <span className="ml-1 text-xs">●</span>}
                            </span>
                        )}
                    </Tabs.Tab>
                ))}
            </Tabs.List>
            <Tabs.Panel value="a"><p className="p-4">Panel A.</p></Tabs.Panel>
            <Tabs.Panel value="b"><p className="p-4">Panel B.</p></Tabs.Panel>
            <Tabs.Panel value="c"><p className="p-4">Panel C.</p></Tabs.Panel>
        </Tabs.Root>
    ),
};

// ─── Disabled tab ─────────────────────────────────────────────────────────────

export const WithDisabledTab: Story = {
    name: "With disabled tab",
    parameters: {
        docs: {
            description: {
                story: "A disabled `Tabs.Tab` is not selectable. It is skipped during keyboard navigation.",
            },
        },
    },
    render: () => (
        <Tabs.Root defaultValue="a">
            <Tabs.List>
                <Tabs.Tab value="a">Available</Tabs.Tab>
                <Tabs.Tab value="b" disabled>Unavailable</Tabs.Tab>
                <Tabs.Tab value="c">Available</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="a"><p className="p-4">First panel.</p></Tabs.Panel>
            <Tabs.Panel value="b"><p className="p-4">This panel is unreachable via the disabled tab.</p></Tabs.Panel>
            <Tabs.Panel value="c"><p className="p-4">Third panel.</p></Tabs.Panel>
        </Tabs.Root>
    ),
};

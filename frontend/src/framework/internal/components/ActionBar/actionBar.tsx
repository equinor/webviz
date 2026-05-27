import type { Workbench } from "@framework/Workbench";
import { Tabs } from "@lib/newComponents/Tabs";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { StartPanel } from "./_panels/start";

export type ActionBarProps = {
    workbench: Workbench;
};

export function ActionBar(props: ActionBarProps) {
    return (
        <div className="border-b-neutral-subtle bg-neutral-canvas shadow-elevation-raised border-b-2">
            <Tabs.Root defaultValue="start">
                <Tabs.List indicatorPosition="end" size="small">
                    <Tab value="start">Start</Tab>
                </Tabs.List>
                <Panel value="start">
                    <StartPanel workbench={props.workbench} />
                </Panel>
            </Tabs.Root>
        </div>
    );
}

type TabProps = {
    value: string;
    selectionBased?: boolean;
    children: React.ReactNode;
};

function Tab(props: TabProps) {
    return (
        <Tabs.Tab value={props.value}>
            <span
                className={resolveClassNames(
                    props.selectionBased ? "text-accent font-bolder" : "text-neutral",
                    "text-body-xs",
                )}
            >
                {props.children}
            </span>
        </Tabs.Tab>
    );
}

type PanelProps = {
    value: string;
    children?: React.ReactNode;
};

function Panel(props: PanelProps) {
    return (
        <Tabs.Panel value={props.value}>
            <div className="bg-surface px-horizontal-xs py-vertical-xs gap-horizontal-xs flex">{props.children}</div>
        </Tabs.Panel>
    );
}

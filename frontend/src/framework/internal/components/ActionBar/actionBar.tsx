import { DashboardTopic } from "@framework/internal/Dashboard";
import type { Workbench } from "@framework/Workbench";
import { Tabs } from "@lib/newComponents/Tabs";
import { Typography } from "@lib/newComponents/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../ActiveDashboardBoundary";

import { StartPanel } from "./_panels/start";

export type ActionBarProps = {
    workbench: Workbench;
};

export function ActionBar(props: ActionBarProps) {
    const activeDashboard = useActiveDashboard();

    const activeModuleInstanceId = usePublishSubscribeTopicValue(
        activeDashboard,
        DashboardTopic.ACTIVE_MODULE_INSTANCE_ID,
    );

    const activeModule = activeModuleInstanceId ? activeDashboard.getModuleInstance(activeModuleInstanceId) : null;

    return (
        <div className="border-b-neutral-subtle bg-neutral-canvas shadow-elevation-raised border-b-2">
            <Tabs.Root defaultValue="start">
                <Tabs.List indicatorPosition="end">
                    <Tab value="start">Start</Tab>
                    {activeModule ? (
                        <Tab value="module" selectionBased>
                            {activeModule.getName()}
                        </Tab>
                    ) : null}
                </Tabs.List>
                <Panel value="start">
                    <StartPanel workbench={props.workbench} />
                </Panel>
                <Panel value="data">Data content</Panel>
                <Panel value="settings">Settings content</Panel>
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
            <Typography
                family="body"
                size={props.selectionBased ? "sm" : "xs"}
                tone={props.selectionBased ? "accent" : "neutral"}
                weight={props.selectionBased ? "bolder" : "normal"}
            >
                {props.children}
            </Typography>
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

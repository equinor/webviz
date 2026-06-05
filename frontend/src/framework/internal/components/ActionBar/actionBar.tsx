import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Button } from "@lib/newComponents/Button";
import { Tabs } from "@lib/newComponents/Tabs";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { StartPanel } from "./_panels/start";

export type ActionBarProps = {
    workbench: Workbench;
};

export function ActionBar(props: ActionBarProps) {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    // ? Should this be handled by the workbench itself instead of the action bar?
    const [isActionBarVisible, setIsActionBarVisible] = useGuiState(guiMessageBroker, GuiState.IsActionBarVisible);

    return (
        <div className="border-b-neutral-subtle bg-neutral-canvas shadow-elevation-raised flex border-b-2">
            <Tabs.Root
                defaultValue="start"
                layoutClassName={resolveClassNames("grow", { hidden: !isActionBarVisible })}
            >
                <Tabs.List indicatorPosition="end" size="small">
                    <Tab value="start">Start</Tab>
                </Tabs.List>
                <Panel value="start">
                    <StartPanel workbench={props.workbench} />
                </Panel>
            </Tabs.Root>
            <div className="bg-surface flex grow flex-col items-end justify-end">
                <TooltipCompositions.Default
                    content={isActionBarVisible ? "Collapse action bar" : "Expand action bar"}
                    side="top"
                >
                    <Button variant="ghost" size="small" iconOnly onClick={() => setIsActionBarVisible((v) => !v)}>
                        {isActionBarVisible ? <ExpandLess style={{ fontSize: 16 }} /> : <ExpandMore style={{ fontSize: 16 }} />}
                    </Button>
                </TooltipCompositions.Default>
            </div>
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

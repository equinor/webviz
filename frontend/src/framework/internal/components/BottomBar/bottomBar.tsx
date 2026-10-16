import type { Workbench } from "@framework/Workbench";

import { DashboardsPanel } from "./_panels/Dashboards/dashboardsPanel";

export type BottomBarProps = {
    workbench: Workbench;
};

export function BottomBar(props: BottomBarProps) {
    return (
        <div className="border-t-neutral-subtle bg-surface/30 shadow-elevation-raised flex border-t-2">
            <DashboardsPanel workbench={props.workbench} />
        </div>
    );
}

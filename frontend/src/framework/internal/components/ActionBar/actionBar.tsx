import type { Workbench } from "@framework/Workbench";

import { StartPanel } from "./_panels/start";

export type ActionBarProps = {
    workbench: Workbench;
};

export function ActionBar(props: ActionBarProps) {
    return (
        <div className="border-b-neutral-subtle bg-surface py-xs shadow-elevation-raised flex border-b-2">
            <StartPanel workbench={props.workbench} />
        </div>
    );
}

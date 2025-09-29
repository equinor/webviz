import type React from "react";

import { Icon } from "@equinor/eds-core-react";
import { category } from "@equinor/eds-icons";

import FmuLogo from "@assets/fmu.svg";

import { WorkbenchTopic, type Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { LoginButton } from "../LoginButton";

export type TopBarProps = {
    workbench: Workbench;
};

Icon.add({ category });

export function TopBar(props: TopBarProps): React.ReactNode {
    const hasActiveSession = usePublishSubscribeTopicValue(props.workbench, WorkbenchTopic.HAS_ACTIVE_SESSION);

    return (
        <>
            <div
                className={resolveClassNames(
                    "p-0.5 border-b-2 border-slate-200 z-50 shadow-lg flex flex-row gap-12 px-3 pl-4 items-center min-h-16",
                    {
                        "bg-white": hasActiveSession,
                        "bg-transparent": !hasActiveSession,
                    },
                )}
            >
                <LogoWithText />
                <div className="flex gap-2 items-center grow">
                    <div className="grow" />
                    <LoginButton showText={false} />
                </div>
            </div>
        </>
    );
}

function LogoWithText(): React.ReactNode {
    return (
        <div className="flex flex-row items-center gap-4">
            <img src={FmuLogo} alt="FMU Analysis logo" className="w-8 h-8" />
            <h1 className="text-md text-slate-800 whitespace-nowrap">FMU Analysis</h1>
            <div
                className="bg-orange-600 text-white p-1 rounded-sm text-xs text-center cursor-help shadow-sm"
                title="NOTE: This application is still under heavy development and bugs are to be expected. Please help us improve Webviz by reporting any undesired behaviour either on Slack or Yammer."
            >
                BETA
            </div>
        </div>
    );
}

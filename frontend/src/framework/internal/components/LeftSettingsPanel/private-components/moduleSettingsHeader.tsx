import React from "react";

import { ChevronLeft, ChevronRight, Settings, WarningRounded } from "@mui/icons-material";

import { useModuleWarning } from "@framework/internal/components/LeftSettingsPanel/_hooks";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Tooltip } from "@lib/components/Tooltip";
import { Banner } from "@lib/newComponents/Banner";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Button } from "@lib/newComponents/Button";
import { Tabs } from "@lib/newComponents/Tabs";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";

type ModuleSettingsHeaderProps = {
    activeModuleInstance: ModuleInstance<any, any> | null;
    activeTab: string | null;
    availableTabs: Record<string, TabConfig>;
    isCollapsed: boolean;
    onExpandClick: () => void;
    onCollapseClick: () => void;
    onTabChange: (tabKey: string) => void;
};

export function ModuleSettingsHeader(props: ModuleSettingsHeaderProps): React.ReactNode {
    const tabKeys = Object.keys(props.availableTabs);
    const activeTab = props.activeTab ? props.availableTabs[props.activeTab] : undefined;

    const activeModuleTitle = props.activeModuleInstance?.getTitle() ?? null;

    const { warningText, isWarningVisible, dismissWarning, showWarning } = useModuleWarning(props.activeModuleInstance);

    function handleWarningIconClick() {
        if (!isWarningVisible) {
            showWarning();
        }
    }

    function handleTabChange(tabKey: string) {
        props.onTabChange(tabKey);
    }

    function makeSettingsTabs() {
        if (tabKeys.length === 0) {
            return (
                <div className="px-horizontal-2xs flex h-full items-center justify-center">
                    <Settings fontSize="small" />
                </div>
            );
        }

        return (
            <div className="flex h-full items-center pl-px">
                <Tabs.Root onValueChange={handleTabChange}>
                    <Tabs.List>
                        {tabKeys.map((key) => {
                            const config = props.availableTabs[key];
                            return (
                                <TooltipCompositions.Default key={key} content={config.title} side="bottom">
                                    <Tabs.Tab key={key} value={key}>
                                        {config.icon}
                                    </Tabs.Tab>
                                </TooltipCompositions.Default>
                            );
                        })}
                    </Tabs.List>
                </Tabs.Root>
            </div>
        );
    }

    function makeHeaderContent() {
        if (props.isCollapsed) {
            return (
                <Button
                    onClick={props.onExpandClick}
                    title="Expand settings panel"
                    iconOnly
                    tone="neutral"
                    size="small"
                    variant="text"
                >
                    <div className="flex flex-row items-center">
                        {activeTab?.icon ?? <Settings fontSize="inherit" />}
                        <ChevronRight fontSize="inherit" />
                    </div>
                </Button>
            );
        }

        const highlightWarning = !!warningText && !isWarningVisible;

        return (
            <>
                {makeSettingsTabs()}
                <span
                    title={activeModuleTitle ?? undefined}
                    className={resolveClassNames(
                        "text-body-sm grow self-center overflow-hidden p-0 text-ellipsis whitespace-nowrap",
                        { "text-neutral-subtle italic": !activeModuleTitle, "font-bolder": !!activeModuleTitle },
                    )}
                >
                    {activeModuleTitle ?? "No module selected"}
                </span>
                {warningText && (
                    <Tooltip
                        title={`Module has warning${highlightWarning ? " (click to view)" : ""}`}
                        enterDelay="medium"
                    >
                        <Button
                            variant="text"
                            disabled={!highlightWarning}
                            tone="neutral"
                            iconOnly
                            onClick={handleWarningIconClick}
                        >
                            <WarningRounded fontSize="inherit" />
                        </Button>
                    </Tooltip>
                )}
                <Button
                    onClick={props.onCollapseClick}
                    title="Collapse settings panel"
                    iconOnly
                    tone="neutral"
                    size="small"
                    variant="text"
                >
                    <ChevronLeft fontSize="inherit" />
                </Button>
            </>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="gap-horizontal-md pr-horizontal-2xs bg-canvas flex h-10 items-center shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1)]">
                {makeHeaderContent()}
            </div>
            {!props.isCollapsed && isWarningVisible && warningText && (
                <WarningBanner text={warningText} onDismiss={dismissWarning} />
            )}
        </div>
    );
}

type WarningBannerProps = {
    text: string;
    onDismiss: () => void;
};

function WarningBanner(props: WarningBannerProps): React.ReactNode {
    return (
        <div className="px-horizontal-2xs py-vertical-2xs">
            <Banner tone="warning" dismissable={true} onDismiss={props.onDismiss}>
                <strong>Note:</strong> {props.text}
            </Banner>
        </div>
    );
}

type TabConfig = {
    title: string;
    icon: React.ReactElement;
};

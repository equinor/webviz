import React from "react";

import { ChevronLeft, ChevronRight, Settings, WarningRounded } from "@mui/icons-material";

import { useModuleWarning } from "@framework/internal/components/LeftSettingsPanel/_hooks";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Tooltip } from "@lib/components/Tooltip";
import { Banner } from "@lib/newComponents/Banner";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

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
    const [hoveredTabIndex, setHoveredTabIndex] = React.useState<number | null>(null);

    const tabKeys = Object.keys(props.availableTabs);
    const activeTab = props.activeTab ? props.availableTabs[props.activeTab] : undefined;

    const activeModuleTitle = props.activeModuleInstance?.getTitle() ?? null;

    const { warningText, isWarningVisible, dismissWarning, showWarning } = useModuleWarning(props.activeModuleInstance);

    function handleWarningIconClick() {
        if (!isWarningVisible) {
            showWarning();
        }
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
            <div className="flex h-full items-center pl-px" onMouseLeave={() => setHoveredTabIndex(null)}>
                {tabKeys.map((key, index) => {
                    const isActive = key === props.activeTab;
                    const isNextActive = tabKeys.at(index + 1) === props.activeTab;
                    const isHovered = hoveredTabIndex === index;
                    const isNextHovered = hoveredTabIndex === index + 1;
                    const showDividerAfter = !isActive && !isHovered && !isNextActive && !isNextHovered;

                    return (
                        <React.Fragment key={key}>
                            <SettingTab
                                config={props.availableTabs[key]}
                                isActive={isActive}
                                onClick={() => props.onTabChange(key)}
                                onMouseEnter={() => setHoveredTabIndex(index)}
                                onMouseLeave={() => setHoveredTabIndex(null)}
                            />
                            <TabDivider visible={showDividerAfter} />
                        </React.Fragment>
                    );
                })}
            </div>
        );
    }

    function makeHeaderContent() {
        if (props.isCollapsed) {
            return (
                <DenseIconButton onClick={props.onExpandClick} title="Expand settings panel">
                    <div className="flex flex-row items-center">
                        {activeTab?.icon ?? <Settings fontSize="small" />}
                        <ChevronRight fontSize="small" />
                    </div>
                </DenseIconButton>
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
                        <WarningRounded
                            fontSize="small"
                            className={
                                highlightWarning
                                    ? "text-warning-subtle shrink-0 cursor-pointer"
                                    : "text-neutral-subtle shrink-0"
                            }
                            onClick={handleWarningIconClick}
                        />
                    </Tooltip>
                )}
                <DenseIconButton onClick={props.onCollapseClick} title="Collapse settings panel">
                    <ChevronLeft fontSize="small" />
                </DenseIconButton>
            </>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="gap-horizontal-2xs pt-vertical-3xs pr-horizontal-2xs flex h-10 items-center bg-slate-100 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1)]">
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
        <Banner tone="warning" dismissable={true} onDismiss={props.onDismiss}>
            <div className="flex flex-col">
                <span>
                    <strong>Note:</strong> {props.text}
                </span>
                <strong className="cursor-pointer self-end" onClick={props.onDismiss}>
                    Close [X]
                </strong>
            </div>
        </Banner>
    );
}

type TabConfig = {
    title: string;
    icon: React.ReactElement;
};

type TabDividerProps = {
    visible: boolean;
};

function TabDivider(props: TabDividerProps): React.ReactNode {
    return <div className={resolveClassNames("h-1/2 w-px", props.visible ? "bg-slate-300" : "bg-transparent")} />;
}

type TabProps = {
    config: TabConfig;
    isActive: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
};

function SettingTab(props: TabProps): React.ReactNode {
    return (
        <Tooltip title={props.config.title} placement="bottom">
            <button
                onClick={props.onClick}
                onMouseEnter={props.onMouseEnter}
                onMouseLeave={props.onMouseLeave}
                className={resolveClassNames(
                    "relative flex h-full items-center justify-center px-2 transition-colors",
                    {
                        "rounded-t bg-white pt-2 pb-2 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]": props.isActive,
                        "cursor-pointer hover:rounded-t hover:bg-blue-100": !props.isActive,
                    },
                )}
            >
                {props.config.icon}
            </button>
        </Tooltip>
    );
}

import React from "react";

import { ChevronLeft, ChevronRight, Settings, WarningRounded } from "@mui/icons-material";

import { useModuleWarning } from "@framework/internal/hooks/useModuleWarning";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

type WarningBannerProps = {
    text: string;
    onDismiss: () => void;
};

const WarningBanner: React.FC<WarningBannerProps> = (props) => {
    return (
        <div className="m-2 py-2 px-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-sm shrink-0">
            <div className="flex flex-col">
                <span>
                    <strong>Note:</strong> {props.text}
                </span>
                <strong className="cursor-pointer self-end" onClick={props.onDismiss}>
                    Close [X]
                </strong>
            </div>
        </div>
    );
};

type SettingConfig = {
    title: string;
    icon: React.ReactElement;
};

type SettingTabDividerProps = {
    visible: boolean;
};

function SettingTabDivider(props: SettingTabDividerProps): React.ReactNode {
    return <div className={resolveClassNames("w-px h-1/2", props.visible ? "bg-slate-300" : "bg-transparent")} />;
}

type SettingTabProps = {
    config: SettingConfig;
    isActive: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
};

const SettingTab: React.FC<SettingTabProps> = (props) => {
    return (
        <Tooltip title={props.config.title} placement="bottom">
            <button
                onClick={props.onClick}
                onMouseEnter={props.onMouseEnter}
                onMouseLeave={props.onMouseLeave}
                className={resolveClassNames(
                    "relative flex items-center justify-center h-full px-2 transition-colors",
                    {
                        "bg-white rounded-t-xl inset-shadow": props.isActive,
                        "hover:bg-slate-200 hover:rounded-t-xl cursor-pointer": !props.isActive,
                    },
                )}
            >
                {props.config.icon}
            </button>
        </Tooltip>
    );
};

type ModuleSettingsHeaderProps = {
    activeModuleInstance: ModuleInstance<any, any> | undefined;
    activeSetting: string | null;
    availableSettings: Record<string, SettingConfig>;
    isCollapsed: boolean;
    onExpandClick: () => void;
    onCollapseClick: () => void;
    onSettingChange: (settingKey: string) => void;
};

export const ModuleSettingsHeader: React.FC<ModuleSettingsHeaderProps> = (props) => {
    const [hoveredTabIndex, setHoveredTabIndex] = React.useState<number | null>(null);

    const settingKeys = Object.keys(props.availableSettings);
    const activeSettingConfig = props.activeSetting ? props.availableSettings[props.activeSetting] : undefined;

    const activeModuleTitle = props.activeModuleInstance?.getTitle() ?? null;

    const { warningText, isWarningVisible, dismissWarning, showWarning } = useModuleWarning(props.activeModuleInstance);

    function handleWarningIconClick() {
        if (!isWarningVisible) {
            showWarning();
        }
    }

    function makeSettingsTabs() {
        if (settingKeys.length === 0) {
            return (
                <div className="flex items-center justify-center h-full px-2">
                    <Settings fontSize="small" />
                </div>
            );
        }

        return (
            <div className="flex h-full items-center pl-px" onMouseLeave={() => setHoveredTabIndex(null)}>
                {settingKeys.map((key, index) => {
                    const isActive = key === props.activeSetting;
                    const isNextActive = settingKeys.at(index + 1) === props.activeSetting;
                    const isHovered = hoveredTabIndex === index;
                    const isNextHovered = hoveredTabIndex === index + 1;
                    const showDividerAfter = !isActive && !isHovered && !isNextActive && !isNextHovered;

                    return (
                        <React.Fragment key={key}>
                            <SettingTab
                                config={props.availableSettings[key]}
                                isActive={isActive}
                                onClick={() => props.onSettingChange(key)}
                                onMouseEnter={() => setHoveredTabIndex(index)}
                                onMouseLeave={() => setHoveredTabIndex(null)}
                            />
                            <SettingTabDivider visible={showDividerAfter} />
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
                        {activeSettingConfig?.icon ?? <Settings fontSize="small" />}
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
                        "grow p-0 text-ellipsis whitespace-nowrap overflow-hidden text-sm self-center",
                        { "italic text-gray-500": !activeModuleTitle, "font-bold": !!activeModuleTitle },
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
                                highlightWarning ? "text-yellow-500 shrink-0 cursor-pointer" : "text-slate-400 shrink-0"
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
            <div className="flex items-center bg-slate-100 h-10 gap-2 pr-2">{makeHeaderContent()}</div>
            {!props.isCollapsed && isWarningVisible && warningText && (
                <WarningBanner text={warningText} onDismiss={dismissWarning} />
            )}
        </div>
    );
};

import type React from "react";

import { Dropdown, MenuButton } from "@mui/base";
import { ChevronLeft, ChevronRight, ExpandMore, Settings, WarningRounded } from "@mui/icons-material";

import { useModuleWarning } from "@framework/internal/hooks/useModuleWarning";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
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
    const settingKeys = Object.keys(props.availableSettings);
    const activeSettingConfig = props.activeSetting ? props.availableSettings[props.activeSetting] : undefined;

    const activeModuleTitle = props.activeModuleInstance?.getTitle() ?? null;

    const { warningText, isWarningVisible, dismissWarning, showWarning } = useModuleWarning(props.activeModuleInstance);

    function handleWarningIconClick() {
        if (!isWarningVisible) {
            showWarning();
        }
    }

    function makeSettingsIcon() {
        // No settings or no active setting — show default gear icon (non-interactive)
        if (settingKeys.length === 0 || !activeSettingConfig) {
            return (
                <div className="p-1">
                    <Settings fontSize="small" />
                </div>
            );
        }

        // Single setting — show its icon (non-interactive, no dropdown)
        if (settingKeys.length === 1) {
            return (
                <Tooltip title={activeSettingConfig.title} placement="bottom">
                    <div className="p-1">{activeSettingConfig.icon}</div>
                </Tooltip>
            );
        }

        // Multiple settings — dropdown to select
        return (
            <Dropdown>
                <Tooltip title="Select settings view" placement="bottom">
                    <MenuButton className="flex items-center gap-1 rounded-sm p-1 hover:bg-blue-200 focus:outline-blue-600">
                        {activeSettingConfig.icon}
                        <ExpandMore fontSize="small" />
                    </MenuButton>
                </Tooltip>
                <Menu anchorOrigin="bottom-start">
                    {settingKeys.map((key) => (
                        <MenuItem
                            key={key}
                            onClick={() => props.onSettingChange(key)}
                            disabled={key === props.activeSetting}
                        >
                            {props.availableSettings[key].icon}
                            <span>{props.availableSettings[key].title}</span>
                        </MenuItem>
                    ))}
                </Menu>
            </Dropdown>
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
                {makeSettingsIcon()}
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
            <div className="flex items-center bg-slate-100 h-10 shadow-sm gap-2 py-2 pr-2 pl-1">
                {makeHeaderContent()}
            </div>
            {!props.isCollapsed && isWarningVisible && warningText && (
                <WarningBanner text={warningText} onDismiss={dismissWarning} />
            )}
        </div>
    );
};

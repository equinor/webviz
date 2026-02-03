import React from "react";

import { Dropdown, MenuButton } from "@mui/base";
import { ChevronLeft, ChevronRight, ExpandMore, WarningRounded } from "@mui/icons-material";

import { DashboardTopic } from "@framework/internal/Dashboard";
import { ModuleDevState } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../ActiveDashboardBoundary";

// Setting with icon and title
type SettingConfig = {
    title: string;
    icon: React.ReactElement;
};

type SettingsPanelHeaderProps = {
    activeSetting: string | null;
    availableSettings: Record<string, SettingConfig>;
    isCollapsed: boolean;
    onExpandClick: () => void;
    onCollapseClick: () => void;
    onSettingChange: (settingKey: string) => void;
    onWarningClick?: (moduleInstance: ModuleInstance<any, any>) => void;
    warningOpen?: boolean;
};

export const SettingsPanelHeader: React.FC<SettingsPanelHeaderProps> = (props) => {
    const dashboard = useActiveDashboard();
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.MODULE_INSTANCES);
    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);

    const activeModuleInstance = moduleInstances.find((instance) => instance.getId() === activeModuleInstanceId);

    // TODO:  Move this outside of the PanelHeader component!!
    const moduleWarningText = React.useMemo(
        function makeModuleWarningText() {
            if (!activeModuleInstance) {
                return null;
            }

            const isSerializable = activeModuleInstance.getModule().canBeSerialized();
            const isDevModule = activeModuleInstance.getModule().getDevState() === ModuleDevState.DEV;

            if (!isSerializable && isDevModule) {
                return "This module is under development and without persistence. Major changes can occur without warning, and state changes will not be saved.";
            } else if (isDevModule) {
                return "This module is under development. Major changes can occur without warning.";
            } else if (!isSerializable) {
                return "This module cannot be persisted yet. State changes will not be saved.";
            }
            return null;
        },
        [activeModuleInstance],
    );

    function handleWarningClick() {
        if (activeModuleInstance && props.onWarningClick) {
            props.onWarningClick(activeModuleInstance);
        }
    }

    const activeSettingConfig = props.activeSetting ? props.availableSettings[props.activeSetting] : undefined;
    const settingKeys = Object.keys(props.availableSettings);

    // Collapsed state - only show icon and expand chevron
    if (props.isCollapsed) {
        return (
            <div className="bg-gray-100 h-full flex flex-col items-center pt-2">
                <DenseIconButton onClick={props.onExpandClick} title="Expand settings panel">
                    <div className="flex flex-row items-center">
                        {activeSettingConfig?.icon}
                        <ChevronRight fontSize="small" />
                    </div>
                </DenseIconButton>
            </div>
        );
    }

    // Expanded state - show full header
    const title = activeModuleInstance?.getTitle() ?? "No module selected";

    return (
        <div className="flex items-center p-2 bg-slate-100 h-10 shadow-sm gap-2">
            <Dropdown>
                <Tooltip title="Select settings view" placement="bottom">
                    <MenuButton className="flex items-center gap-1 rounded-sm p-1 hover:bg-blue-200 focus:outline-blue-600">
                        {activeSettingConfig?.icon}
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
            <span title={title} className="font-bold grow p-0 text-ellipsis whitespace-nowrap overflow-hidden text-sm">
                {title}
            </span>
            {moduleWarningText && (
                <Tooltip title={`Module warning${props.warningOpen ? "" : " (click to view)"}`} enterDelay="medium">
                    <WarningRounded
                        fontSize="small"
                        className={
                            props.warningOpen ? "text-slate-400 shrink-0" : "text-yellow-500 shrink-0 cursor-pointer"
                        }
                        onClick={handleWarningClick}
                    />
                </Tooltip>
            )}
            <DenseIconButton onClick={props.onCollapseClick} title="Collapse settings panel">
                <ChevronLeft fontSize="small" />
            </DenseIconButton>
        </div>
    );
};

import type React from "react";

import { Dropdown, MenuButton } from "@mui/base";
import { ChevronLeft, ChevronRight, ExpandMore, WarningRounded } from "@mui/icons-material";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { Tooltip } from "@lib/components/Tooltip";

// Setting with icon and title
type SettingConfig = {
    title: string;
    icon: React.ReactElement;
};

type SettingsPanelHeaderProps = {
    activeSetting: string | null;
    availableSettings: Record<string, SettingConfig>;
    isCollapsed: boolean;
    title: string;
    warningText: string | null;
    highlightWarning?: boolean;
    onExpandClick: () => void;
    onCollapseClick: () => void;
    onSettingChange: (settingKey: string) => void;
    onWarningClick?: () => void;
};

export const SettingsPanelHeader: React.FC<SettingsPanelHeaderProps> = (props) => {
    const activeSettingConfig = props.activeSetting ? props.availableSettings[props.activeSetting] : undefined;
    const settingKeys = Object.keys(props.availableSettings);

    function handleWarningClick() {
        props.onWarningClick?.();
    }

    function makeHeaderContent() {
        if (props.isCollapsed) {
            return (
                <DenseIconButton onClick={props.onExpandClick} title="Expand settings panel">
                    <div className="flex flex-row items-center">
                        {activeSettingConfig?.icon}
                        <ChevronRight fontSize="small" />
                    </div>
                </DenseIconButton>
            );
        }

        return (
            <>
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
                <span
                    title={props.title}
                    className="font-bold grow p-0 text-ellipsis whitespace-nowrap overflow-hidden text-sm"
                >
                    {props.title}
                </span>
                {props.warningText && (
                    <Tooltip
                        title={`Module has warning${props.highlightWarning ? " (click to view)" : ""}`}
                        enterDelay="medium"
                    >
                        <WarningRounded
                            fontSize="small"
                            className={
                                props.highlightWarning
                                    ? "text-yellow-500 shrink-0 cursor-pointer"
                                    : "text-slate-400 shrink-0"
                            }
                            onClick={handleWarningClick}
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
        <div className="flex items-center bg-slate-100 h-10 shadow-sm gap-2 pt-2 pb-2 pr-2">{makeHeaderContent()}</div>
    );
};

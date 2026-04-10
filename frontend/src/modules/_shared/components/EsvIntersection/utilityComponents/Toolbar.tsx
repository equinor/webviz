import React from "react";

import { Dropdown } from "@mui/base";
import { MenuButton as MuiMenuButton } from "@mui/base/MenuButton";
import {
    Add,
    FilterCenterFocus,
    GridOn,
    KeyboardDoubleArrowLeft,
    KeyboardDoubleArrowRight,
    Link,
    Remove,
} from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { ToggleButton } from "@lib/components/ToggleButton";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Toolbar as GenericToolbar, ToolBarDivider } from "@modules/_shared/components/Toolbar";

export enum FitInViewStatus {
    ON = "ON",
    OFF = "OFF",
}

export type ViewOption = {
    id: string;
    name: string;
    color: string | null;
};

export type ViewLinkOption = {
    id: string;
    views: ViewOption[];
    containsThisView: boolean;
};

export type ToolbarProps = {
    visible: boolean;
    zFactor: number;
    gridVisible: boolean;
    fitInViewStatus: FitInViewStatus;
    onFitInViewStatusToggle: (status: FitInViewStatus) => void;
    onGridLinesToggle: (active: boolean) => void;
    onVerticalScaleIncrease: () => void;
    onVerticalScaleDecrease: () => void;
    viewLinks?: ViewLinkOption[];
    unlinkedViews?: ViewOption[];
    onToggleViewLink?: (viewId: string) => void;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    const [expanded, setExpanded] = React.useState<boolean>(false);

    function handleFitInViewToggle(active: boolean) {
        props.onFitInViewStatusToggle(active ? FitInViewStatus.ON : FitInViewStatus.OFF);
    }

    function handleGridVisibilityToggle(active: boolean) {
        props.onGridLinesToggle(active);
    }

    function handleVerticalScaleIncrease() {
        props.onVerticalScaleIncrease();
    }

    function handleVerticalScaleDecrease() {
        props.onVerticalScaleDecrease();
    }

    const viewLinks = props.viewLinks ?? [];
    const unlinkedViews = props.unlinkedViews ?? [];
    const isAnyLinked = viewLinks.some((g) => g.containsThisView);
    const showLinkButton = (viewLinks.length > 0 || unlinkedViews.length > 0) && props.onToggleViewLink;

    if (!props.visible) {
        return null;
    }

    return (
        <GenericToolbar>
            <div className="flex items-center gap-1 justify-start">
                <Tooltip title="Fit all data in view" placement="bottom">
                    <ToggleButton
                        onToggle={handleFitInViewToggle}
                        active={props.fitInViewStatus === FitInViewStatus.ON}
                    >
                        <FilterCenterFocus fontSize="inherit" />
                    </ToggleButton>
                </Tooltip>
                {showLinkButton && (
                    <Dropdown>
                        <Tooltip title="Link this view with others" placement="bottom">
                            <MuiMenuButton
                                className={resolveClassNames(
                                    "inline-flex items-center px-4 py-2 font-medium rounded-md",
                                    isAnyLinked
                                        ? "bg-indigo-500 text-white hover:bg-indigo-400"
                                        : "bg-transparent text-indigo-600 hover:bg-indigo-100",
                                )}
                            >
                                <Link fontSize="inherit" />
                            </MuiMenuButton>
                        </Tooltip>
                        <Menu anchorOrigin="bottom-start" className="text-sm p-1 min-w-40">
                            {viewLinks.map((group) => (
                                <MenuItem
                                    key={group.id}
                                    className={resolveClassNames(
                                        "flex items-center gap-2 overflow-hidden",
                                        group.containsThisView ? "bg-indigo-50" : "",
                                    )}
                                    title={group.views.map((v) => v.name).join(", ")}
                                    onClick={() => props.onToggleViewLink!(group.views[0].id)}
                                >
                                    <Link fontSize="inherit" className="shrink-0 text-blue-600" />
                                    {group.views.map((v) => (
                                        <span
                                            key={v.id}
                                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: v.color ?? "#888" }}
                                        />
                                    ))}
                                    <span className="truncate min-w-0">
                                        {group.views.map((v) => v.name).join(", ")}
                                    </span>
                                </MenuItem>
                            ))}
                            {viewLinks.length > 0 && unlinkedViews.length > 0 && (
                                <div className="border-t border-gray-200 my-1 mx-1" />
                            )}
                            {unlinkedViews.map((view) => (
                                <MenuItem
                                    key={view.id}
                                    className="flex items-center gap-2"
                                    onClick={() => props.onToggleViewLink!(view.id)}
                                >
                                    <span
                                        className="inline-block w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: view.color ?? "#888" }}
                                    />
                                    <span>{view.name}</span>
                                </MenuItem>
                            ))}
                        </Menu>
                    </Dropdown>
                )}
                {expanded && (
                    <>
                        <Tooltip title="Toggle grid visibility" placement="bottom">
                            <ToggleButton onToggle={handleGridVisibilityToggle} active={props.gridVisible}>
                                <GridOn fontSize="inherit" />
                            </ToggleButton>
                        </Tooltip>
                        <ToolBarDivider />
                        <Tooltip title="Increase vertical scale" placement="bottom">
                            <HoldPressedIntervalCallbackButton
                                onHoldPressedIntervalCallback={handleVerticalScaleIncrease}
                            >
                                <Add fontSize="inherit" />
                            </HoldPressedIntervalCallbackButton>
                        </Tooltip>
                        <span title="Vertical scale">{props.zFactor}</span>
                        <Tooltip title="Decrease vertical scale" placement="bottom">
                            <HoldPressedIntervalCallbackButton
                                onHoldPressedIntervalCallback={handleVerticalScaleDecrease}
                            >
                                <Remove fontSize="inherit" />
                            </HoldPressedIntervalCallbackButton>
                        </Tooltip>
                    </>
                )}
                <ToolBarDivider />
                <Tooltip title={expanded ? "Collapse toolbar" : "Expand toolbar"} placement="bottom">
                    <Button onClick={() => setExpanded(!expanded)}>
                        {expanded ? (
                            <KeyboardDoubleArrowLeft fontSize="inherit" />
                        ) : (
                            <KeyboardDoubleArrowRight fontSize="inherit" />
                        )}
                    </Button>
                </Tooltip>
            </div>
        </GenericToolbar>
    );
}

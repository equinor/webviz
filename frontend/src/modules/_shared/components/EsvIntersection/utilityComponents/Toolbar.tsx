import React from "react";

import { Dropdown } from "@mui/base";
import { MenuButton as MuiMenuButton } from "@mui/base/MenuButton";
import {
    Add,
    FilterCenterFocus,
    GridOn,
    KeyboardDoubleArrowLeft,
    KeyboardDoubleArrowRight,
    Remove,
    SyncAlt,
} from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { ToggleButton } from "@lib/components/ToggleButton";
import { Tooltip } from "@lib/components/Tooltip";
import { Menu } from "@lib/newComponents/Menu";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Toolbar as GenericToolbar } from "@modules/_shared/components/Toolbar";
import { Separator } from "@lib/newComponents/Separator";

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
    color: string;
    views: ViewOption[];
    containsThisView: boolean;
};

export type ToolbarProps = {
    viewLinks?: readonly ViewLinkOption[];
    unlinkedViews?: readonly ViewOption[];
    visible: boolean;
    zFactor: number;
    gridVisible: boolean;
    onFitInView?: () => void;
    onGridLinesToggle: (active: boolean) => void;
    onVerticalScaleIncrease: () => void;
    onVerticalScaleDecrease: () => void;
    onToggleViewLink?: (viewId: string) => void;
    onHoverViewLink?: (viewIds: string[] | null) => void;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    const [expanded, setExpanded] = React.useState<boolean>(false);

    function handleFitInView() {
        props.onFitInView?.();
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
    const activeLink = viewLinks.find((l) => l.containsThisView);
    const isAnyLinked = activeLink !== undefined;
    const showLinkButton = (viewLinks.length > 0 || unlinkedViews.length > 0) && props.onToggleViewLink;

    if (!props.visible) {
        return null;
    }

    return (
        <GenericToolbar>
            <div className="flex items-center justify-start gap-1">
                <Tooltip title="Fit all data in view" placement="bottom">
                    <Button onClick={handleFitInView}>
                        <FilterCenterFocus fontSize="inherit" />
                    </Button>
                </Tooltip>
                {showLinkButton && (
                    <Dropdown
                        onOpenChange={(_event, open) => {
                            if (!open) {
                                props.onHoverViewLink?.(null);
                            }
                        }}
                    >
                        <Menu.Root>
                            <TooltipCompositions.Default content="Link this view with others" side="bottom">
                                <Menu.Trigger>
                                    <MuiMenuButton
                                        className={resolveClassNames(
                                            "inline-flex items-center rounded-md px-4 py-2 font-medium",

                                            isAnyLinked
                                                ? "text-white hover:text-white hover:opacity-75"
                                                : "bg-transparent text-indigo-600 hover:bg-indigo-100",
                                        )}
                                        slotProps={{
                                            root: {
                                                style: { backgroundColor: isAnyLinked ? activeLink.color : undefined },
                                            },
                                        }}
                                    >
                                        <SyncAlt fontSize="inherit" />
                                    </MuiMenuButton>
                                </Menu.Trigger>
                            </TooltipCompositions.Default>

                            <Menu.Popup itemSize="small" align="start" side="bottom">
                                {viewLinks.map((viewLink) => (
                                    <Menu.Item
                                        key={viewLink.id}
                                        layoutClassName={resolveClassNames(
                                            "flex items-center gap-2 overflow-hidden",
                                            viewLink.containsThisView ? "bg-indigo-50" : "",
                                        )}
                                        title={viewLink.views.map((v) => v.name).join(", ")}
                                        onClick={() => props.onToggleViewLink!(viewLink.views[0].id)}
                                        onMouseEnter={() => props.onHoverViewLink?.(viewLink.views.map((v) => v.id))}
                                        onMouseLeave={() => props.onHoverViewLink?.(null)}
                                    >
                                        <div
                                            className="-ml-1.5 flex items-center rounded px-1.5 py-0.5"
                                            style={{ backgroundColor: viewLink.color }}
                                        >
                                            <SyncAlt fontSize="inherit" className="shrink-0 text-white" />
                                        </div>
                                        {viewLink.views.map((v) => (
                                            <span
                                                key={v.id}
                                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: v.color ?? "#888" }}
                                            />
                                        ))}
                                        <span className="min-w-0 truncate">
                                            {viewLink.views.map((v) => v.name).join(", ")}
                                        </span>
                                    </Menu.Item>
                                ))}

                                {viewLinks.length > 0 && unlinkedViews.length > 0 && <Menu.Separator />}

                                {unlinkedViews.map((view) => (
                                    <Menu.Item
                                        key={view.id}
                                        layoutClassName="flex items-center gap-2"
                                        onClick={() => props.onToggleViewLink!(view.id)}
                                        onMouseEnter={() => props.onHoverViewLink?.([view.id])}
                                        onMouseLeave={() => props.onHoverViewLink?.(null)}
                                    >
                                        <span
                                            className="inline-block h-3 w-3 shrink-0 rounded-full"
                                            style={{ backgroundColor: view.color ?? "#888" }}
                                        />
                                        <span>{view.name}</span>
                                    </Menu.Item>
                                ))}
                            </Menu.Popup>
                        </Menu.Root>
                    </Dropdown>
                )}
                {expanded && (
                    <>
                        <Tooltip title="Toggle grid visibility" placement="bottom">
                            <ToggleButton onToggle={handleGridVisibilityToggle} active={props.gridVisible}>
                                <GridOn fontSize="inherit" />
                            </ToggleButton>
                        </Tooltip>
                        <Separator orientation="vertical" />
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
                <Separator orientation="vertical" />
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

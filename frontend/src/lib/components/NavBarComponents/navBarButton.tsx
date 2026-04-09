import React from "react";

import { Tooltip } from "@lib/components/Tooltip";
import { Tabs, type TabsProps } from "@lib/newComponents/Tabs";

export type NavBarButtonProps<TValue extends string> = {
    value: TValue;
    /**
     * The icon rendered on the left side of the text
     */
    icon: React.ReactElement;
    /**
     * An alternate icon to use when the button is in it's "active" state
     */
    activeIcon?: React.ReactElement;
    /**
     * Tooltip text
     */
    tooltip?: React.ReactNode;
    /**
     * Tooltip text when disabled
     */
    disabledTooltip?: React.ReactNode;
};

function resolveTabIcon(
    icon: React.ReactElement,
    activeIcon: React.ReactElement | undefined,
    isActive: boolean,
): React.ReactNode {
    if (isActive) return activeIcon ?? icon;
    return icon;
}

function NavBarButtonComponent<TValue extends string>(
    props: NavBarButtonProps<TValue> & TabsProps["Tab"],
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const { icon, activeIcon, disabledTooltip, tooltip, ...baseProps } = props;

    return (
        <Tooltip title={props.disabled ? disabledTooltip : tooltip} placement="right">
            {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
            <span>
                <Tabs.Tab {...baseProps} ref={ref}>
                    {({ isActive }) => resolveTabIcon(icon, activeIcon, isActive)}
                </Tabs.Tab>
            </span>
        </Tooltip>
    );
}

export const NavBarButton = React.forwardRef(NavBarButtonComponent);

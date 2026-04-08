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
     * Renders the button in it's active state
     */
    active?: boolean;
    /**
     * Tooltip text
     */
    tooltip?: React.ReactNode;
    /**
     * Tooltip text when disabled
     */
    disabledTooltip?: React.ReactNode;
};

function NavBarButtonComponent<TValue extends string>(
    props: NavBarButtonProps<TValue> & TabsProps["Tab"],
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const { icon, activeIcon, active, disabledTooltip, tooltip, ...baseProps } = props;

    let buttonIcon: React.ReactElement;

    if (active && activeIcon) buttonIcon = activeIcon;
    else buttonIcon = icon;

    return (
        <Tooltip title={props.disabled ? disabledTooltip : tooltip} placement="right">
            {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
            <span>
                <Tabs.Tab {...baseProps} ref={ref}>
                    {buttonIcon}
                </Tabs.Tab>
            </span>
        </Tooltip>
    );
}

export const NavBarButton = React.forwardRef(NavBarButtonComponent);

import React from "react";

import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Button } from "../Button";
import type { ButtonProps } from "../Button/button";

export type NavBarButtonProps = {
    /**
     * The icon rendered on the left side of the text
     */
    icon: React.ReactNode;
    /**
     * An alternate icon to use when the button is in it's "active" state
     */
    activeIcon?: React.ReactNode;
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

function NavBarButtonComponent(
    props: NavBarButtonProps & ButtonProps,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const { icon, activeIcon, active, disabledTooltip, tooltip, ...baseProps } = props;

    let buttonIcon: React.ReactNode;

    if (active && activeIcon) buttonIcon = activeIcon;
    else buttonIcon = icon;

    return (
        <Tooltip title={props.disabled ? disabledTooltip : tooltip} placement="right">
            {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
            <span>
                <Button
                    {...baseProps}
                    ref={ref}
                    className={resolveClassNames(
                        "w-full h-10 text-center px-3!",
                        active ? "bg-blue-500! text-white" : "text-slate-800!",
                    )}
                >
                    {buttonIcon}
                </Button>
            </span>
        </Tooltip>
    );
}

export const NavBarButton = React.forwardRef(NavBarButtonComponent);

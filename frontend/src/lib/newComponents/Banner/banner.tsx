import React from "react";

import { Close } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { LayoutClassProps } from "../_shared/utils/wrapperProps";
import { Button } from "../Button";

export type BannerProps = LayoutClassProps & {
    /** Controls the visual tone of the banner. @default "info" */
    tone?: "warning" | "danger" | "success" | "info";
    /** When true, shows a dismiss button. @default false */
    dismissable?: boolean;
    /** Called when the user clicks the dismiss button. */
    onDismiss?: () => void;
    /** The content displayed inside the banner. */
    children?: React.ReactNode;
};

const TONE_TO_CLASSNAMES: Record<NonNullable<Exclude<BannerProps["tone"], "default">>, string> = {
    warning: "bg-warning-surface border-warning-strong",
    danger: "bg-danger-surface border-danger-strong",
    success: "bg-success-surface border-success-strong",
    info: "bg-info-surface border-info-strong",
};

export const Banner = React.forwardRef<HTMLDivElement, BannerProps>(function Banner(props, ref) {
    const { tone = "info", dismissable = false } = props;

    return (
        <div
            ref={ref}
            className={resolveClassNames(
                props.layoutClassName,
                "p-sm gap-x-sm flex items-center rounded border",
                TONE_TO_CLASSNAMES[tone],
            )}
        >
            <span className="grow">{props.children}</span>
            {dismissable && (
                <Button variant="ghost" tone="neutral" size="small" onClick={props.onDismiss} iconOnly>
                    <Close fontSize="inherit" />
                </Button>
            )}
        </div>
    );
});

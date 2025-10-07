import type React from "react";

import type { BadgeProps as MuiBadgeProps } from "@mui/base";
import { Badge as MuiBadge } from "@mui/base";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type BadgeProps = MuiBadgeProps;

export const Badge: React.FC<BadgeProps> = (props) => {
    return (
        <MuiBadge
            slotProps={{
                root: {
                    className: resolveClassNames("relative"),
                },
                badge: {
                    className: resolveClassNames(
                        props.color || "bg-blue-500",
                        "rounded-full",
                        "text-white",
                        "h-4",
                        "absolute",
                        "right-0",
                        "top-0",
                        "flex",
                        "place-content-center",
                        "items-center",
                        "font-bold",
                        "min-w-[1rem]",
                        "box-border",

                        // Refer to MuI state class to hide badge when prop.invisible = true
                        "[&.MuiBadge-invisible]:invisible",
                    ),
                    style: {
                        fontSize: "0.65rem",
                        lineHeight: "1",
                        transform: "scale(1) translate(50%, -50%)",
                        transformOrigin: "100% 0%",
                    },
                },
            }}
            {...props}
        />
    );
};

Badge.displayName = "Badge";

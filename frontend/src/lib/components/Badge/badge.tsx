import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Badge as MuiBadge, BadgeProps as MuiBadgeProps } from "@mui/base";

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
                        "h-5",
                        "absolute",
                        "right-0",
                        "top-0",
                        "flex",
                        "place-content-center",
                        "items-center",
                        "font-bold",
                        "min-w-[1.25rem]",
                        "box-border"
                    ),
                    style: {
                        fontSize: "0.75rem",
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

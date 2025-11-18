import React from "react";

import { AssignmentTurnedIn, ContentPaste, ContentPasteOff } from "@mui/icons-material";

import { IconButton } from "@lib/components/IconButton";
import type { IconButtonProps } from "@lib/components/IconButton/iconButton";
import { Tooltip } from "@lib/components/Tooltip";
import { useTimeoutFunction } from "@lib/hooks/useTimeoutFunction";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type CopyCellValueProps = {
    onCopyRequested: () => string;
    children: React.ReactNode;
};

type CopyStatus = "idle" | "success" | "error";

const COLORSCHEME_BY_STATUS: Record<CopyStatus, IconButtonProps["color"]> = {
    idle: "primary",
    success: "success",
    error: "danger",
};

const TOOLTIP_BY_STATUS: Record<CopyStatus, string> = {
    idle: "Copy to clipboard",
    success: "Copied!",
    error: "Failed to copy",
};

export function CopyCellValue(props: CopyCellValueProps): React.ReactNode {
    const [status, setStatus] = React.useState<CopyStatus>("idle");
    const [isHovered, setIsHovered] = React.useState<boolean>(false);

    const timeoutFunction = useTimeoutFunction();

    function setStatusTemporarily(newStatus: CopyStatus) {
        setStatus(newStatus);
        timeoutFunction(() => {
            setStatus("idle");
        }, 2000);
    }

    function handleCopyClick() {
        if (status !== "idle") {
            return;
        }

        const valueToCopy = props.onCopyRequested();
        navigator.clipboard
            .writeText(valueToCopy)
            .then(() => {
                setStatusTemporarily("success");
            })
            .catch((error) => {
                console.error("Failed to copy value to clipboard:", error);
                setStatusTemporarily("error");
            });
    }

    function handleMouseEnter() {
        setIsHovered(true);
    }

    function handleMouseLeave() {
        setIsHovered(false);
    }

    return (
        <div className="w-full h-full relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div
                className={resolveClassNames(
                    "absolute top-1/2 transform transition-transform duration-200 -translate-y-1/2 right-1 z-10 bg-gray-100 text-black rounded-full",
                    { "scale-100": isHovered || status !== "idle", "scale-0": !isHovered && status === "idle" },
                )}
            >
                <Tooltip title={TOOLTIP_BY_STATUS[status]}>
                    <IconButton onClick={handleCopyClick} color={COLORSCHEME_BY_STATUS[status]}>
                        {status === "idle" && <ContentPaste fontSize="inherit" />}
                        {status === "success" && <AssignmentTurnedIn fontSize="inherit" />}
                        {status === "error" && <ContentPasteOff fontSize="inherit" />}
                    </IconButton>
                </Tooltip>
            </div>
            {props.children}
        </div>
    );
}

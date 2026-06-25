import React from "react";

import { AssignmentTurnedIn, ContentPaste, ContentPasteOff } from "@mui/icons-material";

import { useTimeoutFunction } from "@lib/hooks/useTimeoutFunction";
import { Button, type ButtonProps } from "@lib/newComponents/Button";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type CopyCellValueProps = {
    onCopyRequested: () => string;
    children: React.ReactNode;
};

type CopyStatus = "idle" | "success" | "error";

const COLORSCHEME_BY_STATUS: Record<CopyStatus, ButtonProps["tone"]> = {
    idle: "neutral",
    success: "accent",
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

    function handleCopyClick(e: React.MouseEvent<HTMLButtonElement>) {
        e.stopPropagation();

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
        <div className="relative h-full w-full" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div
                className={resolveClassNames(
                    "absolute top-1/2 right-1 z-10 -translate-y-1/2 transform rounded-full bg-gray-100 text-black transition-transform duration-200",
                    {
                        "scale-100": isHovered || status !== "idle",
                        "not-focus-within:scale-0": !isHovered && status === "idle",
                    },
                )}
            >
                <Tooltip content={TOOLTIP_BY_STATUS[status]}>
                    <Button
                        onClick={handleCopyClick}
                        tone={COLORSCHEME_BY_STATUS[status]}
                        size="small"
                        variant="contained"
                        round
                        iconOnly
                    >
                        {status === "idle" && <ContentPaste fontSize="inherit" />}
                        {status === "success" && <AssignmentTurnedIn fontSize="inherit" />}
                        {status === "error" && <ContentPasteOff fontSize="inherit" />}
                    </Button>
                </Tooltip>
            </div>
            {props.children}
        </div>
    );
}

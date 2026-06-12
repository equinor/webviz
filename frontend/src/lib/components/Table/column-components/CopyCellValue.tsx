import React from "react";

import { AssignmentTurnedIn, ContentPaste, ContentPasteOff } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";
import { useTimeoutFunction } from "@lib/hooks/useTimeoutFunction";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type CopyCellValueProps = {
    onCopyRequested: () => string;
    children: React.ReactNode;
    highlightRef?: React.RefObject<HTMLElement>;
};

type CopyStatus = "idle" | "success" | "error";

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

    function handleButtonFocus() {
        if (props.highlightRef?.current) {
            props.highlightRef.current.classList.add(
                "outline",
                "outline-focus",
                "transform",
                "scale-105",
                "transition-transform",
                "duration-200",
                "absolute",
            );
        }
    }

    function handleButtonBlur() {
        if (props.highlightRef?.current) {
            props.highlightRef.current.classList.remove(
                "outline",
                "outline-focus",
                "transform",
                "scale-105",
                "transition-transform",
                "duration-200",
                "absolute",
            );
        }
    }

    return (
        <div className="relative h-full w-full" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div
                className={resolveClassNames(
                    "bg-neutral z-elevated absolute top-1/2 right-1 -translate-y-1/2 transform rounded-full transition-transform duration-100",
                    { "scale-100": isHovered || status !== "idle", "scale-0": !isHovered && status === "idle" },
                )}
            >
                <Tooltip title={TOOLTIP_BY_STATUS[status]}>
                    <button
                        className={resolveClassNames(
                            "selectable bg-neutral hover:bg-neutral-hover active:bg-neutral-active text-neutral-strong shadow-elevation-overlay flex aspect-square items-center rounded-full",
                            {
                                "bg-success-strong hover:bg-success-strong active:bg-success-strong text-success-strong-on-emphasis":
                                    status === "success",
                                "bg-danger-strong hover:bg-danger-strong active:bg-danger-strong text-danger-strong-on-emphasis":
                                    status === "error",
                            },
                        )}
                        onClick={handleCopyClick}
                        onFocus={handleButtonFocus}
                        onBlur={handleButtonBlur}
                        onPointerEnter={handleButtonFocus}
                        onPointerLeave={handleButtonBlur}
                    >
                        {status === "idle" && <ContentPaste fontSize="inherit" />}
                        {status === "success" && <AssignmentTurnedIn fontSize="inherit" />}
                        {status === "error" && <ContentPasteOff fontSize="inherit" />}
                    </button>
                </Tooltip>
            </div>
            {props.children}
        </div>
    );
}

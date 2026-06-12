import React from "react";


import { BugReport, Info, Refresh } from "@mui/icons-material";

import crashIllustration from "@assets/moduleCrash.svg";

import { Button } from "@lib/newComponents/Button";
import { Code } from "@lib/newComponents/Code";
import { Dialog } from "@lib/newComponents/Dialog";
import { Separator } from "@lib/newComponents/Separator";
import { Heading, Paragraph } from "@lib/newComponents/Typography/compositions";
import { shouldSymbolicate, symbolicateStackTrace } from "@lib/utils/stackTraceSymbolication";

export type FormattedErrorProps = {
    moduleName: string;
    error: Error;
    errorInfo: React.ErrorInfo;
    onReload?: () => void;
};

function formatStackLine(line: string): React.ReactNode {
    const parts = line.trimStart().split(" ");

    const at = parts[0];
    const location = parts[1];
    const path = parts[2];

    return (
        <div className="ml-sm gap-x-2xs flex">
            <span>{at}</span>
            <strong>{location}</strong>
            {path && (
                <span className="">
                    (<span className="text-neutral-subtle underline">{path.replace("(", "").replace(")", "")}</span>)
                </span>
            )}
        </div>
    );
}

function formatStack(stack: string): React.ReactNode {
    const lines = stack.split("\n");

    return (
        <>
            {lines.map((line, index) => (
                <div key={"line-" + index} className="text-body-sm">
                    {index === 0 ? line : formatStackLine(line)}
                </div>
            ))}
        </>
    );
}

export function CrashView(props: FormattedErrorProps): React.ReactNode {
    const [showDetails, setShowDetails] = React.useState<boolean>(false);
    const [symbolicatingStack, setSymbolicatingStack] = React.useState<boolean>(false);

    const handleReload = () => {
        if (!props.onReload) {
            return;
        }

        props.onReload();
    };

    const handleShowDetails = () => {
        setShowDetails(true);
    };

    const handleReportError = async () => {
        setSymbolicatingStack(true);

        let stackToReport = props.error.stack || "";

        // Symbolicate the stack if in production and source maps are available
        if (shouldSymbolicate() && props.error) {
            try {
                stackToReport = await symbolicateStackTrace(props.error);
            } catch (err) {
                console.error("Failed to symbolicate stack trace:", err);
                // Fall back to original stack
                stackToReport = props.error.stack || "";
            }
        }

        setSymbolicatingStack(false);

        const title = encodeURIComponent(`[USER REPORTED ERROR] (${props.moduleName}) ${props.error.message}`);
        const body = encodeURIComponent(
            `<!-- ⚠️ DO NOT INCLUDE DATA/SCREENSHOTS THAT CAN'T BE PUBLICLY AVAILABLE.-->\n\n\
**How to reproduce**\nPlease describe what you were doing when the error occurred.\n\n\
**Screenshots**\nIf applicable, add screenshots to help explain your problem.\n\n\
**Error stack**\n\`\`\`\n${stackToReport}\n\`\`\`\n\n\
**Component stack**\n\`\`\`${props.errorInfo.componentStack}\n\`\`\``,
        );
        const label = encodeURIComponent("user reported error");
        window.open(
            `https://github.com/equinor/webviz/issues/new?title=${title}&body=${body}&labels=${label}`,
            "_blank",
        );
    };

    return (
        <div className="flex h-full w-full flex-col">
            <div className="px-md py-md gap-y-sm bg-danger flex min-h-[55%] flex-col items-center justify-center overflow-hidden text-center">
                <img
                    src={crashIllustration}
                    alt="Broken module"
                    aria-hidden="true"
                    className="h-auto max-h-[100px] w-auto"
                />
                <Paragraph size="sm" layoutClassName="w-full line-clamp-3" title={props.error.message}>
                    {props.error.message}
                </Paragraph>
            </div>
            <div className="px-md py-xs gap-y-sm flex h-[45%] flex-col items-center justify-center overflow-hidden text-center">
                <Paragraph
                    size="xs"
                    layoutClassName="w-full line-clamp-3"
                    title="The above error made your module instance crash. Unfortunately, this means that its state is lost. You can try to reset the instance to its initial state in order to start over."
                >
                    The above error made your module instance crash. Unfortunately, this means that its state is lost.
                    You can try to reset the instance to its initial state in order to start over.
                </Paragraph>
                <Separator orientation="horizontal" />
                <div className="gap-x-sm flex">
                    <Button onClick={handleReload} size="small">
                        <Refresh fontSize="inherit" /> Reset to initial state
                    </Button>
                    <Button onClick={handleShowDetails} size="small" variant="ghost" tone="neutral">
                        <Info fontSize="inherit" /> Show details
                    </Button>
                    <Button
                        onClick={handleReportError}
                        disabled={symbolicatingStack}
                        size="small"
                        variant="ghost"
                        tone="neutral"
                    >
                        <BugReport fontSize="inherit" />{" "}
                        {symbolicatingStack ? "Symbolicating stack..." : "Report error"}
                    </Button>
                </div>
            </div>
            {showDetails && (
                <Dialog.Popup onOpenChange={() => setShowDetails(false)} open modal>
                    <Dialog.Header closeIconVisible>
                        <Dialog.Title>Error Details</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body layoutClassName="flex flex-col gap-y-2xs max-h-[70vh] overflow-y-auto">
                        <Heading as="h6" weight="bolder">
                            {props.moduleName} crashed with the following error:
                        </Heading>
                        <Code>{props.error.message}</Code>
                        {props.error.stack && (
                            <>
                                <Heading as="h6" weight="bolder">
                                    Stack:
                                </Heading>
                                <Code layoutClassName="max-h-[20vh]">{formatStack(props.error.stack)}</Code>
                            </>
                        )}
                        <div>
                            <Heading as="h6" weight="bolder">
                                Component stack:
                            </Heading>
                            <Code layoutClassName="max-h-[20vh]">
                                {formatStack(props.errorInfo.componentStack ?? "")}
                            </Code>
                        </div>
                    </Dialog.Body>
                </Dialog.Popup>
            )}
        </div>
    );
}

CrashView.displayName = "CrashView";

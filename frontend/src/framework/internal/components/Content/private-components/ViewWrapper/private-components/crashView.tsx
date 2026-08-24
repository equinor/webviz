import React from "react";

import { BugReport, Info, OpenInNew, Refresh } from "@mui/icons-material";

import crashIllustration from "@assets/moduleCrash.svg";

import { SupportDocumentsGenerator } from "@framework/internal/components/SupportDocumentsGenerator";
import { makeServiceNowErrorReportUrl } from "@framework/utils/makeServiceNowErrorReportUrl";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Code } from "@lib/components/Code";
import { Dialog } from "@lib/components/Dialog";
import { Separator } from "@lib/components/Separator";
import { Heading, Paragraph } from "@lib/components/Typography/compositions";

export type FormattedErrorProps = {
    workbench: Workbench;
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
    const [showErrorReportDialog, setShowErrorReportDialog] = React.useState(false);

    const handleReload = () => {
        if (!props.onReload) {
            return;
        }

        props.onReload();
    };

    const handleShowDetails = () => {
        setShowDetails(true);
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

                    <Button size="small" variant="ghost" tone="neutral" onClick={() => setShowErrorReportDialog(true)}>
                        <BugReport fontSize="inherit" /> Report error
                    </Button>
                </div>
            </div>
            <Dialog.Popup width={500} open={showErrorReportDialog} onOpenChange={setShowErrorReportDialog}>
                <Dialog.Header>
                    <Dialog.Title>Report Error</Dialog.Title>
                    <Dialog.Close />
                </Dialog.Header>

                <Dialog.Body>
                    <Heading as="h6" weight="bolder">
                        {props.moduleName} crashed with the following error:
                    </Heading>
                    <Code layoutClassName="mt-xs">{props.error.message}</Code>
                </Dialog.Body>

                <Separator layoutClassName="mx-sm" />
                <Dialog.Body>
                    Errors should be reported on{" "}
                    <a
                        className="inline-anchor"
                        href={makeServiceNowErrorReportUrl().href}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ServiceNow <OpenInNew />
                    </a>
                    . Please provide as much detail as possible to explain what caused the error to happen, as this will
                    help us identify issue. You can use the button below to generate some extra debugging files to add
                    to the report.
                </Dialog.Body>

                <Dialog.Actions>
                    <SupportDocumentsGenerator
                        error={props.error}
                        activeWorkbench={props.workbench}
                        componentStack={props.errorInfo.componentStack}
                    />
                    <Button.AsLink
                        href={makeServiceNowErrorReportUrl().href}
                        target="_blank"
                        rel="noopener noreferrer"
                        external
                    >
                        ServiceNow
                    </Button.AsLink>
                </Dialog.Actions>
            </Dialog.Popup>

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

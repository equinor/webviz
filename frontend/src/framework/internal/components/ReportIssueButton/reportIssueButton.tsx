import React from "react";

import { BugReport, OpenInNew } from "@mui/icons-material";

import { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { SERVICE_NOW_HREF } from "@framework/utils/externalUrls";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { ButtonProps } from "@lib/components/Button";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Separator } from "@lib/components/Separator";

import { SupportDocumentsGenerator } from "../SupportDocumentsGenerator";

export type ReportIssueButtonProps = {
    error: Error | null;
    session: WorkbenchSession | null;
    componentStack: string | null | undefined;
    details?: React.ReactNode;
    title?: string;
    buttonSize?: ButtonProps["size"];
    dialogStacked?: boolean;
};

export function ReportIssueButton(props: ReportIssueButtonProps): React.ReactNode {
    const [isOpen, setIsOpen] = React.useState(false);

    let serializableSession: PrivateWorkbenchSession | null = null;
    if (props.session instanceof PrivateWorkbenchSession) {
        serializableSession = props.session;
    }

    return (
        <>
            <Button size={props.buttonSize} variant="ghost" tone="neutral" onClick={() => setIsOpen(true)}>
                <BugReport /> Report error
            </Button>
            <Dialog.Popup stacked={props.dialogStacked} width={500} open={isOpen} onOpenChange={setIsOpen}>
                <Dialog.Header>
                    <Dialog.Title>Report Error</Dialog.Title>
                    <Dialog.Close />
                </Dialog.Header>

                {props.details && <Dialog.Body>{props.details}</Dialog.Body>}
                {props.details && <Separator layoutClassName="mx-sm" />}

                <Dialog.Body>
                    Errors should be reported on{" "}
                    <a className="inline-anchor" href={SERVICE_NOW_HREF} target="_blank" rel="noopener noreferrer">
                        ServiceNow <OpenInNew />
                    </a>
                    . Please provide as much detail as possible to explain what caused the error to happen, as this will
                    help us identify issue. You can use the button below to generate some extra debugging files to add
                    to the report.
                </Dialog.Body>

                <Dialog.Actions>
                    <SupportDocumentsGenerator
                        error={props.error}
                        session={serializableSession ?? null}
                        componentStack={props.componentStack}
                    />
                    <Button.AsLink href={SERVICE_NOW_HREF} target="_blank" rel="noopener noreferrer" external>
                        ServiceNow
                    </Button.AsLink>
                </Dialog.Actions>
            </Dialog.Popup>
        </>
    );
}

import React from "react";

import { BugReport, Error } from "@mui/icons-material";

import { shouldSymbolicate, symbolicateStackTrace } from "@framework/utils/stackTraceSymbolication";
import { reportErrorToGithub } from "@lib/utils/errors";

import { Button } from "../Button";

import type { DialogProps } from "./dialog";
import { Dialog } from "./dialog";

export type ErrorDialogProps = {
    error: Error | null;
} & DialogProps;

export function ErrorDialog(props: ErrorDialogProps): React.ReactNode {
    const [isSymbolicatingStack, setIsSymbolicatingStack] = React.useState(false);

    async function maybeGetSymbolicatedTrace(error: Error) {
        if (!shouldSymbolicate()) return undefined;

        setIsSymbolicatingStack(true);

        try {
            return await symbolicateStackTrace(error);
        } catch (err) {
            console.error("Failed to symbolicate stack trace:", err);
            return undefined;
        } finally {
            setIsSymbolicatingStack(false);
        }
    }

    async function reportIssue() {
        if (!props.error) return;

        const symoblicatedTrace = await maybeGetSymbolicatedTrace(props.error);

        reportErrorToGithub(props.error, symoblicatedTrace);
    }

    return (
        <Dialog
            {...props}
            variant="error"
            title={
                <>
                    <Error className="align-sub" fontSize="small" /> {props.title}
                </>
            }
            actions={
                <>
                    <Button
                        wrapperClassName="mr-auto"
                        startIcon={<BugReport fontSize="small" />}
                        disabled={isSymbolicatingStack}
                        onClick={reportIssue}
                    >
                        Report issue
                    </Button>
                    {props.actions}
                </>
            }
        />
    );
}

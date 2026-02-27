import React from "react";

import { BugReport, Error } from "@mui/icons-material";

import { reportErrorToGithub } from "@lib/utils/errors";
import { shouldSymbolicate, symbolicateStackTrace } from "@lib/utils/stackTraceSymbolication";

import { Button } from "../Button";

import type { DialogProps } from "./dialog";
import { Dialog } from "./dialog";

export type ErrorDialogProps = {
    error: Error | null;
} & DialogProps;

function useIsMountedRef() {
    const isMountedRef = React.useRef(true);
    React.useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    return isMountedRef;
}

export function ErrorDialog(props: ErrorDialogProps): React.ReactNode {
    const isMountedRef = useIsMountedRef();
    const runIdRef = React.useRef(0);

    const [isSymbolicatingStack, setIsSymbolicatingStack] = React.useState(false);

    async function maybeGetSymbolicatedTrace(error: Error) {
        if (!shouldSymbolicate()) return undefined;

        setIsSymbolicatingStack(true);
        const runId = ++runIdRef.current;

        try {
            const trace = await symbolicateStackTrace(error);

            // If another run started since we began, ignore this result
            if (runId !== runIdRef.current) return undefined;

            return trace;
        } catch (err) {
            console.error(`Failed to symbolicate stack trace (run ${runId}): ${err}`);
            return undefined;
        } finally {
            if (runId === runIdRef.current && isMountedRef.current) {
                setIsSymbolicatingStack(false);
            }
        }
    }

    async function reportIssue() {
        if (!props.error) return;

        const symoblicatedTrace = await maybeGetSymbolicatedTrace(props.error);

        if (isMountedRef.current) {
            reportErrorToGithub(props.error, symoblicatedTrace);
        }
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

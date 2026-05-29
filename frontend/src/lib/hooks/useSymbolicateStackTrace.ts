import React from "react";
import { useIsMountedRef } from "./useIsMountedRef";
import { shouldSymbolicate, symbolicateStackTrace } from "@lib/utils/stackTraceSymbolication";
import { reportErrorToGithub } from "@lib/utils/errors";

export function useSymbolicateStackTrace(error?: Error) {
    const [isSymbolicatingStack, setIsSymbolicatingStack] = React.useState(false);

    const runIdRef = React.useRef(0);

    const isMountedRef = useIsMountedRef();

    async function maybeGetSymbolicatedTrace(error: Error) {
        if (!shouldSymbolicate()) return undefined;
        if (!isMountedRef.current) return undefined;

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
        if (!error) return;

        const symoblicatedTrace = await maybeGetSymbolicatedTrace(error);

        if (isMountedRef.current) {
            reportErrorToGithub(error, symoblicatedTrace);
        }
    }

    return { isSymbolicatingStack, reportIssue };
}

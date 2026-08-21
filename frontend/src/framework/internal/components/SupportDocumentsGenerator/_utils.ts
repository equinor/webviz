import type { Workbench } from "@framework/Workbench";
import type { DownloadFile } from "@lib/utils/downloadUtils";
import { shouldSymbolicate, symbolicateStackTrace } from "@lib/utils/stackTraceSymbolication";

export async function makeErrorFile(error: Error | null, componentStack: string | null): Promise<DownloadFile | null> {
    if (!error) return null;

    let stackTrace;
    if (shouldSymbolicate()) {
        try {
            stackTrace = await symbolicateStackTrace(error);
        } catch (err) {
            console.error("Failed to symbolicate stack trace:", err);
        }
    }

    stackTrace ||= error.stack || "Stack not available";
    componentStack ||= "Stack no available";

    return {
        filename: "report_error_details.txt",
        // prettier-ignore
        content:
`Error: ${error.name}
Message: ${error.message}
Stacktrace:
${stackTrace}

Component stack:
${componentStack}`,
    };
}

export async function makeUserAgentFile() {
    return {
        filename: "report_user_agent.txt",
        // prettier-ignore
        content: 
`User Agent: ${navigator.userAgent}
Platform: ${navigator.platform}
Vendor: ${navigator.vendor}
Screen Resolution: ${window.screen.width}x${window.screen.height}
Window Size: ${window.innerWidth}x${window.innerHeight}
Pixel Ratio: ${window.devicePixelRatio}`,
    };
}

export async function makeSessionStateFile(workbench: Workbench | null): Promise<DownloadFile | null> {
    if (!workbench) return null;

    const activeSession = workbench.getSessionManager().getActiveSessionOrNull();
    let content = "No session loaded";

    if (activeSession) {
        try {
            const serializedState = activeSession.serializeContentState();
            content = JSON.stringify(serializedState, null, 2);
        } catch (err) {
            if (typeof err === "string") {
                content = `!! Error while serializing state: ${err} `;
            } else if (err instanceof Error) {
                content = `!! Error while serializing state: ${err.name}::${err.message} `;
            } else {
                content = "!! Error while serializing state: unknown";
            }
        }
    }

    return {
        filename: "workbench_details.txt",
        content: content,
    };
}

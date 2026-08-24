import React from "react";

import { BugReport, ContentCopy } from "@mui/icons-material";

import { SupportDocumentsGenerator } from "@framework/internal/components/SupportDocumentsGenerator";
import { SERVICE_NOW_HREF } from "@framework/utils/externalUrls";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

type Props = {
    children?: React.ReactNode;
};

interface State {
    error: Error | null;
    componentStack: string | null;
    copiedToClipboard: boolean;
    activeWorkbench: Workbench | null;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
    state: State = {
        error: null,
        copiedToClipboard: false,
        componentStack: null,
        activeWorkbench: null,
    };

    private _boundHandleWindowError: (event: ErrorEvent) => void;
    private _boundHandleUnhandledRejection: (event: PromiseRejectionEvent) => void;
    private _boundRegisterActiveWorkbench: (wb: Workbench | null) => void;

    static getDerivedStateFromError(err: Error): Partial<State> {
        return { error: err, copiedToClipboard: false };
    }

    constructor(props: Props) {
        super(props);

        this._boundHandleWindowError = this.handleWindowError.bind(this);
        this._boundHandleUnhandledRejection = this.handleUnhandledRejection.bind(this);
        this._boundRegisterActiveWorkbench = this.registerActiveWorkbench.bind(this);
    }

    private handleWindowError(event: ErrorEvent) {
        // In development, React re-throws every render error to the window via
        // invokeGuardedCallbackDev (to produce a real browser stack trace) before
        // the inner error boundary even activates. That makes it impossible to
        // distinguish these from genuine unhandled errors at the time of the event.
        // Dev already surfaces errors via console + React's own overlay, so skip.
        if (import.meta.env.DEV) {
            return;
        }
        this.setState({ error: event.error });
    }

    private handleUnhandledRejection(event: PromiseRejectionEvent) {
        this.setState({ error: event.reason });
    }

    private registerActiveWorkbench(wb: Workbench | null) {
        // When we get an error, the entire component tree gets unmounted, which in turn means the workbench-wrapper will unmount. Avoid setting in this case so we can get info from the most recent workbench
        if (!(this.state.error && wb == null)) {
            this.setState({ activeWorkbench: wb });
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.setState({ componentStack: errorInfo.componentStack ?? null });
    }

    componentDidMount() {
        window.addEventListener("error", this._boundHandleWindowError);
        window.addEventListener("unhandledrejection", this._boundHandleUnhandledRejection);
    }

    componentWillUnmount() {
        window.removeEventListener("error", this._boundHandleWindowError);
        window.removeEventListener("unhandledrejection", this._boundHandleUnhandledRejection);
    }

    render() {
        const freshStartUrl = new URL(window.location.protocol + "//" + window.location.host);
        freshStartUrl.searchParams.set("cleanStart", "true");

        const copyToClipboard = () => {
            navigator.clipboard.writeText(freshStartUrl.toString());
            this.setState({ copiedToClipboard: true });
            setTimeout(() => this.setState({ copiedToClipboard: false }), 2000);
        };

        if (this.state.error) {
            return (
                <div className="bg-danger-canvas flex h-screen w-screen items-center justify-center">
                    <div className="bg-surface flex w-1/2 min-w-[600px] flex-col shadow-sm">
                        <div className="bg-danger-strong text-danger-strong-on-emphasis p-xs font-bolder flex w-full items-center shadow-sm">
                            Application terminated with error
                        </div>
                        <div className="px-sm py-sm gap-y-md flex w-full grow flex-col">
                            <div className="gap-y-xs flex flex-col">
                                The application was terminated due to the following error:
                                <div className="bg-neutral text-body-sm p-xs overflow-x-scroll font-mono whitespace-nowrap">
                                    <strong>{this.state.error.name}</strong>: {this.state.error.message}
                                </div>
                            </div>
                            <div className="gap-y-2xs flex flex-col">
                                You can use the following URL to start a clean session:
                                <div>
                                    <div className="bg-neutral text-body-sm flex items-center font-mono whitespace-nowrap">
                                        <a href={freshStartUrl.toString()} className="p-xs grow">
                                            {freshStartUrl.toString()}
                                        </a>
                                        <Button
                                            layoutClassName="m-4xs"
                                            onClick={copyToClipboard}
                                            title="Copy URL to clipboard"
                                            tone="accent"
                                            variant="ghost"
                                            iconOnly
                                        >
                                            <ContentCopy fontSize="small" />
                                        </Button>
                                    </div>
                                    <div
                                        className={resolveClassNames(
                                            "text-success-subtle text-body-sm font-bolder h-2 whitespace-nowrap transition-opacity",
                                            {
                                                "opacity-0": !this.state.copiedToClipboard,
                                            },
                                        )}
                                    >
                                        Copied to clipboard
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="gap-x-xs p-sm bg-canvas flex justify-end shadow-sm">
                            <SupportDocumentsGenerator
                                error={this.state.error}
                                session={
                                    this.state.activeWorkbench?.getSessionManager().getActiveSessionOrNull() ?? null
                                }
                                componentStack={this.state.componentStack}
                            />
                            <Button.AsLink href={SERVICE_NOW_HREF} target="_blank" rel="noopener noreferrer" external>
                                <BugReport fontSize="small" />
                                Report issue
                            </Button.AsLink>
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <GlobalErrorBoundaryContext.Provider
                value={{
                    registerActiveWorkbench: this._boundRegisterActiveWorkbench,
                }}
            >
                {this.props.children}
            </GlobalErrorBoundaryContext.Provider>
        );
    }
}

export const GlobalErrorBoundaryContext = React.createContext<{
    registerActiveWorkbench: (workbench: Workbench | null) => void;
} | null>(null);

export function useGlobalErrorBoundaryContext() {
    const context = React.useContext(GlobalErrorBoundaryContext);
    if (!context) {
        throw new Error("useGlobalErrorBoundaryContext must be used within a GlobalErrorBoundaryContext.Provider");
    }
    return context;
}

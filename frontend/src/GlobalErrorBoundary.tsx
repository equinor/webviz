import React from "react";

import { BugReport, ContentCopy } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";
import { IconButton } from "@lib/components/IconButton";
import { reportErrorToGithub } from "@lib/utils/errors";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { shouldSymbolicate, symbolicateStackTrace } from "@lib/utils/stackTraceSymbolication";

type Props = {
    children?: React.ReactNode;
};

interface State {
    error: Error | null;
    copiedToClipboard: boolean;
    symbolicatingStack: boolean;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
    state: State = {
        error: null,
        copiedToClipboard: false,
        symbolicatingStack: false,
    };

    private _boundHandleWindowError: (event: ErrorEvent) => void;
    private _boundHandleUnhandledRejection: (event: PromiseRejectionEvent) => void;

    static getDerivedStateFromError(err: Error): State {
        return { error: err, copiedToClipboard: false, symbolicatingStack: false };
    }

    constructor(props: Props) {
        super(props);

        this._boundHandleWindowError = this.handleWindowError.bind(this);
        this._boundHandleUnhandledRejection = this.handleUnhandledRejection.bind(this);
    }

    private handleWindowError(event: ErrorEvent) {
        this.setState({ error: event.error });
    }

    private handleUnhandledRejection(event: PromiseRejectionEvent) {
        this.setState({ error: event.reason });
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

        const reportIssue = async (error: Error) => {
            let customStackTrace;
            if (shouldSymbolicate()) {
                this.setState({ symbolicatingStack: true });

                try {
                    customStackTrace = await symbolicateStackTrace(error);
                } catch (err) {
                    console.error("Failed to symbolicate stack trace:", err);
                }

                this.setState({ symbolicatingStack: false });
            }

            reportErrorToGithub(error, customStackTrace);
        };

        const copyToClipboard = () => {
            navigator.clipboard.writeText(freshStartUrl.toString());
            this.setState({ copiedToClipboard: true });
            setTimeout(() => this.setState({ copiedToClipboard: false }), 2000);
        };

        if (this.state.error) {
            return (
                <div className="bg-danger-canvas flex h-screen w-screen items-center justify-center">
                    <div className="bg-surface flex w-1/2 min-w-[600px] flex-col shadow-sm">
                        <div className="bg-danger-strong text-danger-strong-on-emphasis px-horizontal-xs py-vertical-xs flex w-full items-center shadow-sm">
                            Application terminated with error
                        </div>
                        <div className="px-horizontal-sm py-vertical-sm gap-vertical-sm flex w-full grow flex-col">
                            The application was terminated due to the following error:
                            <div className="bg-neutral text-body-sm px-horizontal-xs py-vertical-xs my-2 overflow-x-scroll font-mono whitespace-nowrap">
                                <strong>{this.state.error.name}</strong>: {this.state.error.message}
                            </div>
                            You can use the following URL to start a clean session:
                            <div>
                                <div className="bg-neutral text-body-sm px-horizontal-xs py-vertical-xs my-2 flex items-center font-mono whitespace-nowrap">
                                    <a href={freshStartUrl.toString()} className="grow">
                                        {freshStartUrl.toString()}
                                    </a>
                                    <Button
                                        onClick={copyToClipboard}
                                        title="Copy URL to clipboard"
                                        tone="neutral"
                                        variant="text"
                                        iconOnly
                                    >
                                        <ContentCopy fontSize="small" />
                                    </Button>
                                </div>
                                <div
                                    className={resolveClassNames(
                                        "text-success-subtle text-body-sm font-bolder m-2 h-2 whitespace-nowrap transition-opacity",
                                        {
                                            "opacity-0": !this.state.copiedToClipboard,
                                        },
                                    )}
                                >
                                    Copied to clipboard
                                </div>
                            </div>
                        </div>
                        <div className="gap-horizontal-xs px-horizontal-sm py-vertical-sm flex bg-slate-100 shadow-sm">
                            <Button
                                onClick={() => this.state.error && reportIssue(this.state.error)}
                                disabled={this.state.symbolicatingStack}
                            >
                                <BugReport fontSize="small" />{" "}
                                {this.state.symbolicatingStack ? "Symbolicating stack..." : "Report issue"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

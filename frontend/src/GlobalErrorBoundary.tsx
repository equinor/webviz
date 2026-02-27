import React from "react";

import { BugReport, ContentCopy } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
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
                <div className="h-screen w-screen bg-red-200 flex items-center justify-center">
                    <div className="flex flex-col w-1/2 min-w-[600px] bg-white shadow-sm">
                        <div className="w-full bg-red-600 text-white p-4 flex items-center shadow-sm">
                            Application terminated with error
                        </div>
                        <div className="w-full grow p-4 flex flex-col gap-2">
                            The application was terminated due to the following error:
                            <div className="bg-slate-200 p-4 my-2 whitespace-nowrap font-mono text-sm overflow-x-scroll">
                                <strong>{this.state.error.name}</strong>: {this.state.error.message}
                            </div>
                            You can use the following URL to start a clean session:
                            <div>
                                <div className="bg-slate-200 p-4 py-2 my-2 whitespace-nowrap font-mono text-sm flex items-center">
                                    <a href={freshStartUrl.toString()} className="grow">
                                        {freshStartUrl.toString()}
                                    </a>
                                    <IconButton onClick={copyToClipboard} title="Copy URL to clipboard">
                                        <ContentCopy fontSize="small" />
                                    </IconButton>
                                </div>
                                <div
                                    className={resolveClassNames(
                                        "h-2 m-2 whitespace-nowrap text-sm transition-opacity text-green-800",
                                        {
                                            "opacity-0": !this.state.copiedToClipboard,
                                        },
                                    )}
                                >
                                    Copied to clipboard
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-100 flex gap-4 shadow-sm">
                            <Button
                                onClick={() => this.state.error && reportIssue(this.state.error)}
                                startIcon={<BugReport fontSize="small" />}
                                disabled={this.state.symbolicatingStack}
                            >
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

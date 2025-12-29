import React from "react";

import { BugReport, ContentCopy } from "@mui/icons-material";

import { shouldSymbolicate, symbolicateStackTrace } from "@framework/utils/stackTraceSymbolication";
import { Button } from "@lib/components/Button";
import { IconButton } from "@lib/components/IconButton";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

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
            this.setState({ symbolicatingStack: true });

            let stackToReport = error.stack || "";

            // Symbolicate the stack if in production and source maps are available
            if (shouldSymbolicate() && error) {
                try {
                    stackToReport = await symbolicateStackTrace(error);
                } catch (err) {
                    console.error("Failed to symbolicate stack trace:", err);
                    // Fall back to original stack
                    stackToReport = error.stack || "";
                }
            }

            this.setState({ symbolicatingStack: false });

            const errorMessage = `${error.name}: ${error.message}`;
            const title = encodeURIComponent(`[USER REPORTED ERROR] ${errorMessage}`);
            const body = encodeURIComponent(
                `<!-- ⚠️ DO NOT INCLUDE DATA/SCREENSHOTS THAT CAN'T BE PUBLICLY AVAILABLE.-->\n\n\
**How to reproduce**\nPlease describe what you were doing when the error occurred.\n\n\
**Screenshots**\nIf applicable, add screenshots to help explain your problem.\n\n\
**Error stack**\n\`\`\`\n${stackToReport}\n\`\`\``,
            );
            const label = encodeURIComponent("user reported error");
            window.open(
                `https://github.com/equinor/webviz/issues/new?title=${title}&body=${body}&labels=${label}`,
                "_blank",
            );
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

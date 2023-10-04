import React from "react";

import { Button } from "@lib/components/Button";
import { IconButton } from "@lib/components/IconButton";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { BugReport, ContentCopy } from "@mui/icons-material";

type Props = {
    children?: React.ReactNode;
};

interface State {
    error: Error | null;
    copiedToClipboard: boolean;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
    state: State = {
        error: null,
        copiedToClipboard: false,
    };

    static getDerivedStateFromError(err: Error): State {
        return { error: err, copiedToClipboard: false };
    }

    render() {
        const freshStartUrl = new URL(window.location.href);
        freshStartUrl.searchParams.set("cleanStart", "true");

        function reportIssue(errorMessage: string, errorStack: string) {
            const title = encodeURIComponent(`[USER REPORTED ERROR] ${errorMessage}`);
            const body = encodeURIComponent(
                `<!-- ⚠️ DO NOT INCLUDE DATA/SCREENSHOTS THAT CAN'T BE PUBLICLY AVAILABLE.-->\n\n\
**How to reproduce**\nPlease describe what you were doing when the error occurred.\n\n\
**Screenshots**\nIf applicable, add screenshots to help explain your problem.\n\n\
**Error stack**\n\`\`\`\n${errorStack}\n\`\`\``
            );
            const label = encodeURIComponent("user reported error");
            window.open(
                `https://github.com/equinor/webviz/issues/new?title=${title}&body=${body}&labels=${label}`,
                "_blank"
            );
        }

        const copyToClipboard = () => {
            navigator.clipboard.writeText(freshStartUrl.toString());
            this.setState({ copiedToClipboard: true });
            setTimeout(() => this.setState({ copiedToClipboard: false }), 2000);
        };

        if (this.state.error) {
            return (
                <div className="h-screen w-screen bg-red-200 flex items-center justify-center">
                    <div className="flex flex-col w-1/2 min-w-[600px] bg-white shadow">
                        <div className="w-full bg-red-600 text-white p-4 flex items-center shadow">
                            Application terminated with error
                        </div>
                        <div className="w-full flex-grow p-4 flex flex-col gap-2">
                            The application was terminated due to the following error:
                            <div className="bg-slate-200 p-4 my-2 whitespace-nowrap font-mono text-sm">
                                <strong>{this.state.error.name}</strong>: {this.state.error.message}
                            </div>
                            You can use the following URL to start a clean session:
                            <div>
                                <div className="bg-slate-200 p-4 py-2 my-2 whitespace-nowrap font-mono text-sm flex items-center">
                                    <a href={freshStartUrl.toString()} className="flex-grow">
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
                                        }
                                    )}
                                >
                                    Copied to clipboard
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-100 flex gap-4 shadow">
                            <Button
                                onClick={() =>
                                    reportIssue(
                                        `${this.state.error?.name ?? ""}: ${this.state.error?.message ?? ""}`,
                                        this.state.error?.stack ?? ""
                                    )
                                }
                                startIcon={<BugReport fontSize="small" />}
                            >
                                Report issue
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

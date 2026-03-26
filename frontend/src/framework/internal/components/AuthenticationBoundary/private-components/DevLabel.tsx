export function DevLabel() {
    return (
        <div className="bg-fill-warning-surface border-stroke-warning-strong text-text-warning-strong px-space-md py-space-sm max-w-100 rounded border text-justify">
            <strong>NOTE:</strong> This application is still under heavy development; bugs and occasional downtime
            should be expected. Please help us improve Webviz by reporting any undesired behaviour either on{" "}
            <a
                href="https://equinor.slack.com/messages/webviz/"
                target="blank"
                className="cursor-pointer underline"
                rel="noopener noreferrer"
            >
                Slack
            </a>{" "}
            or{" "}
            <a
                href="https://web.yammer.com/main/groups/eyJfdHlwZSI6Ikdyb3VwIiwiaWQiOiIxMzM5NzE0NyJ9"
                target="blank"
                className="cursor-pointer underline"
                rel="noopener noreferrer"
            >
                Yammer
            </a>
            .
        </div>
    );
}

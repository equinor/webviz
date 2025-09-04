export function DevLabel() {
    return (
        <div className="bg-orange-600 text-white px-3 py-2 rounded-sm max-w-[400px] text-sm text-justify mt-4 z-50 shadow-sm">
            <strong>NOTE:</strong> This application is still under heavy development; bugs and occasional downtime
            should be expected. Please help us improve Webviz by reporting any undesired behaviour either on{" "}
            <a
                href="https://equinor.slack.com/messages/webviz/"
                target="blank"
                className="underline cursor-pointer"
                rel="noopener noreferrer"
            >
                Slack
            </a>{" "}
            or{" "}
            <a
                href="https://web.yammer.com/main/groups/eyJfdHlwZSI6Ikdyb3VwIiwiaWQiOiIxMzM5NzE0NyJ9"
                target="blank"
                className="underline cursor-pointer"
                rel="noopener noreferrer"
            >
                Yammer
            </a>
            .
        </div>
    );
}

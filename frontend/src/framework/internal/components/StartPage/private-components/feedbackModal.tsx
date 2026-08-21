import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { comment_discussion } from "@equinor/eds-icons";

import { makeServiceNowErrorReportUrl } from "@framework/utils/makeServiceNowErrorReportUrl";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Tooltip } from "@lib/components/Tooltip";
import { Paragraph } from "@lib/components/Typography/compositions";

import { SupportDocumentsGenerator } from "../../SupportDocumentsGenerator";

Icon.add({ comment_discussion });

const VIVA_ENGAGE_HREF = "https://engage.cloud.microsoft/main/groups/eyJfdHlwZSI6Ikdyb3VwIiwiaWQiOiIxMzM5NzE0NyJ9/all";
const SLACK_HREF = "https://app.slack.com/client/E086B9P9JM9/CB94AEYM9";
const GITHUB_HREF = "https://github.com/equinor/webviz";
const SERVICE_NOW_HREF = makeServiceNowErrorReportUrl().href;

export function FeedbackDialog(props: { iconOnly?: boolean; workbench: Workbench }): React.ReactNode {
    const [open, setOpen] = React.useState(false);

    return (
        <>
            <Tooltip content="Feedback/support" disabled={!props.iconOnly}>
                <Button
                    tone="accent"
                    variant="ghost"
                    iconOnly={props.iconOnly}
                    // The speech-bubble tail makes the icon look off-center. Margins slightly push it down to better align with text */}
                    icon={<Icon className="-mb-4xs mt-4xs" name="comment_discussion" />}
                    onClick={() => {
                        setOpen(true);
                    }}
                >
                    Feedback
                </Button>
            </Tooltip>

            <Dialog.Popup open={open} onOpenChange={setOpen} modal stacked>
                <Dialog.Header>
                    <Dialog.Title>Let us know what you think!</Dialog.Title>
                    <Dialog.Close />
                </Dialog.Header>

                <Dialog.Body>
                    <Paragraph size="md">
                        Have you found some issues with Webviz, or is there some functionality you want us to add?
                        Webviz is under active development, and we would love your feedback! The feedback will help us
                        better prioritize important changes!
                    </Paragraph>

                    <Paragraph size="md" layoutClassName="mt-md">
                        For general thoughts and comments, you can contact us on{" "}
                        <a className="inline-anchor" href={SLACK_HREF} target="_blank" rel="noopener noreferrer">
                            Slack
                        </a>{" "}
                        or{" "}
                        <a className="inline-anchor" href={VIVA_ENGAGE_HREF} target="_blank" rel="noopener noreferrer">
                            Viva Engage
                        </a>
                        . For bugs and other technical issues you can report issues on{" "}
                        <a className="inline-anchor" href={SERVICE_NOW_HREF} target="_blank" rel="noopener noreferrer">
                            ServiceNow
                        </a>{" "}
                        or{" "}
                        <a className="inline-anchor" href={GITHUB_HREF} target="_blank" rel="noopener noreferrer">
                            Github
                        </a>
                        .
                    </Paragraph>
                </Dialog.Body>

                <Dialog.Actions>
                    <SupportDocumentsGenerator error={null} activeWorkbench={props.workbench} componentStack={null}>
                        Get debugging info
                    </SupportDocumentsGenerator>
                    <Button tone="accent" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </Dialog.Actions>
            </Dialog.Popup>
        </>
    );
}

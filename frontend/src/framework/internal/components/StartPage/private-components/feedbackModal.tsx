import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { comment_discussion } from "@equinor/eds-icons";

import { SupportDocumentsGenerator } from "@framework/components/SupportDocumentsGenerator";
import { GITHUB_HREF, SERVICE_NOW_HREF, SLACK_HREF, VIVA_ENGAGE_HREF } from "@framework/utils/externalUrls";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Tooltip } from "@lib/components/Tooltip";
import { Paragraph } from "@lib/components/Typography/compositions";

Icon.add({ comment_discussion });

export function FeedbackDialog(props: { iconOnly?: boolean; workbench: Workbench }): React.ReactNode {
    const [open, setOpen] = React.useState(false);

    return (
        <>
            <Tooltip content="Feedback/support" disabled={!props.iconOnly}>
                <Button
                    tone="accent"
                    variant="ghost"
                    iconOnly={props.iconOnly}
                    // The speech-bubble tail makes the icon look off-center. Margins slightly push it down to better align with text
                    icon={<Icon className="-mb-4xs mt-4xs" name="comment_discussion" />}
                    onClick={() => {
                        setOpen(true);
                    }}
                >
                    Feedback
                </Button>
            </Tooltip>

            <Dialog.Popup open={open} modal width={600} onOpenChange={setOpen}>
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
                    <SupportDocumentsGenerator
                        error={null}
                        session={props.workbench.getSessionManager().getActiveSessionOrNull() ?? null}
                        componentStack={null}
                    />
                    <Button tone="accent" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </Dialog.Actions>
            </Dialog.Popup>
        </>
    );
}

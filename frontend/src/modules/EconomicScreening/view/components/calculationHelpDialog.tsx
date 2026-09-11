import React from "react";

import { MarkdownWrapper } from "@framework/Markdown";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import calculationHelpMarkdown from "@modules/EconomicScreening/calculationHelp.md?raw";

export function CalculationHelpDialog(): React.ReactNode {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <>
            <Button variant="ghost" tone="accent" onClick={() => setIsOpen(true)}>
                How calculations work
            </Button>
            <Dialog.Popup open={isOpen} onOpenChange={setIsOpen} width={720} height="80vh">
                <Dialog.Header>
                    <Dialog.Title>How calculations work</Dialog.Title>
                    <Dialog.Close />
                </Dialog.Header>
                <Dialog.Body layoutClassName="min-h-0 grow overflow-y-auto">
                    <MarkdownWrapper disallowedElements={["h1"]}>{calculationHelpMarkdown}</MarkdownWrapper>
                </Dialog.Body>
                <Dialog.Actions>
                    <Button variant="ghost" tone="accent" onClick={() => setIsOpen(false)}>
                        Close
                    </Button>
                </Dialog.Actions>
            </Dialog.Popup>
        </>
    );
}
import React from "react";

import type { Workbench } from "@framework/Workbench";
import { Popover } from "@lib/components/Popover";

import { SupportDocumentsGeneratorForm } from "./supportDocumentsGeneratorForm";

export type SupportDocumentsGeneratorProps = {
    error: Error | null;
    activeWorkbench: Workbench | null;
    componentStack: string | null | undefined;
    children?: React.ReactNode;
};

export function SupportDocumentsGenerator(props: SupportDocumentsGeneratorProps): React.ReactNode {
    const [popoverOpen, setPopoverOpen] = React.useState(false);

    return (
        <Popover.Root
            open={popoverOpen}
            onOpenChange={(newValue) => {
                setPopoverOpen(newValue);
            }}
        >
            <Popover.Trigger variant="ghost" tone="neutral">
                {props.children ?? "Generate debugging files"}
            </Popover.Trigger>

            <Popover.Popup side="top" align="end">
                <Popover.Title>
                    Include the generated file(s) in your report to help us troubleshoot your issue!
                </Popover.Title>
                <SupportDocumentsGeneratorForm
                    error={props.error}
                    activeWorkbench={props.activeWorkbench}
                    componentStack={props.componentStack}
                    onFilesGenerated={(success) => setPopoverOpen(!success)}
                />
            </Popover.Popup>
        </Popover.Root>
    );
}

import React from "react";

import { useQuery } from "@tanstack/react-query";

import { getMediaSasTokenOptions } from "@api";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Dialog } from "@lib/components/Dialog";

import { TutorialCollection } from "./TutorialCollection";
import { TutorialDetails } from "./TutorialDetails";
import { TUTORIAL_VIDEOS } from "./tutorials.generated";

export type TutorialsDialogProps = {
    workbench: Workbench;
};

export function TutorialsDialog(props: TutorialsDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.TutorialsDialogOpen);
    const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);

    // Re-fetched each time the dialog opens so the token stays fresh.
    const sasTokenQuery = useQuery({ ...getMediaSasTokenOptions(), enabled: isOpen });
    const sasToken = sasTokenQuery.data?.sasToken;

    if (!isOpen) {
        return null;
    }

    function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (!open) {
            // Unmount the player as soon as the dialog closes.
            setSelectedSlug(null);
        }
    }

    const selectedVideo = TUTORIAL_VIDEOS.find((video) => video.slug === selectedSlug) ?? null;

    return (
        <Dialog.Popup
            open={isOpen}
            modal
            onOpenChange={handleOpenChange}
            minHeight="min(480px, calc(100vh - 64px))"
            height="calc(100vh - 64px)"
            width="calc(100vw - 64px)"
        >
            <Dialog.Header closeIconVisible>
                <Dialog.Title>Tutorials</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body layoutClassName="grow min-h-0">
                {selectedVideo ? (
                    <TutorialDetails
                        key={selectedVideo.slug}
                        video={selectedVideo}
                        sasToken={sasToken}
                        onBack={() => runViewTransition(() => setSelectedSlug(null))}
                    />
                ) : (
                    <TutorialCollection
                        sasToken={sasToken}
                        onSelect={(video) => runViewTransition(() => setSelectedSlug(video.slug))}
                    />
                )}
            </Dialog.Body>
        </Dialog.Popup>
    );
}

function runViewTransition(update: () => void): void {
    const documentWithViewTransition = document as Document & {
        startViewTransition?: (callback: () => void) => unknown;
    };
    if (documentWithViewTransition.startViewTransition) {
        documentWithViewTransition.startViewTransition(update);
        return;
    }
    update();
}

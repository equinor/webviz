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

// The backend SAS token is valid for 8h; we cache it just under that so the media URLs (which carry the
// token as a query string) stay stable. A stable URL lets the browser revalidate its stored copy
// (ETag -> 304) instead of re-downloading; we refetch the token before it expires.
const SAS_TOKEN_CACHE_MS = 7 * 60 * 60 * 1000;

export function TutorialsDialog(props: TutorialsDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.TutorialsDialogOpen);
    const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);

    // Cached for the token's lifetime so the media URLs stay stable (and thus browser-cacheable), and
    // refetched on an interval so a long-open dialog gets a fresh token before the current one expires.
    const sasTokenQuery = useQuery({
        ...getMediaSasTokenOptions(),
        enabled: isOpen,
        staleTime: SAS_TOKEN_CACHE_MS,
        gcTime: SAS_TOKEN_CACHE_MS,
        refetchInterval: SAS_TOKEN_CACHE_MS,
        refetchIntervalInBackground: true,
    });
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

import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { play_circle } from "@equinor/eds-icons";
import { KeyboardArrowLeft } from "@mui/icons-material";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Dialog } from "@lib/components/Dialog";
import { Heading, Paragraph } from "@lib/components/Typography/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { TUTORIAL_VIDEOS, type TutorialVideo } from "./tutorials.generated";

Icon.add({ play_circle });

export type TutorialsDialogProps = {
    workbench: Workbench;
};

export function TutorialsDialog(props: TutorialsDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.TutorialsDialogOpen);
    const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);

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
                    <TutorialDetails video={selectedVideo} onBack={() => runViewTransition(() => setSelectedSlug(null))} />
                ) : (
                    <TutorialCollection
                        onSelect={(video) => runViewTransition(() => setSelectedSlug(video.slug))}
                    />
                )}
            </Dialog.Body>
        </Dialog.Popup>
    );
}

type TutorialCollectionProps = {
    onSelect: (video: TutorialVideo) => void;
};

function TutorialCollection(props: TutorialCollectionProps): React.ReactNode {
    return (
        <div className="gap-y-sm p-2xs flex h-full min-h-0 flex-col overflow-y-auto">
            {groupByCategory(TUTORIAL_VIDEOS).map(([category, videos]) => (
                <div key={category} className="gap-y-2xs flex flex-col">
                    <Heading as="h6">{category}</Heading>
                    <div className="gap-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {videos.map((video) => (
                            <TutorialCard key={video.slug} video={video} onClick={() => props.onSelect(video)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
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

function groupByCategory(videos: TutorialVideo[]): [string, TutorialVideo[]][] {
    const map = new Map<string, TutorialVideo[]>();
    for (const video of videos) {
        const list = map.get(video.category) ?? [];
        list.push(video);
        map.set(video.category, list);
    }
    return Array.from(map.entries());
}

type TutorialCardProps = {
    video: TutorialVideo;
    onClick: () => void;
};

function TutorialCard(props: TutorialCardProps): React.ReactNode {
    return (
        <div
            className="border-neutral-subtle bg-surface shadow-elevation-raised group selectable gap-y-2xs box-border flex cursor-pointer flex-col select-none rounded-md border p-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevation-overlay focus-within:outline-2"
            onClick={props.onClick}
        >
            <div
                className="bg-neutral-subtle relative aspect-video w-full overflow-hidden rounded-sm"
                style={{ viewTransitionName: `tutorial-${props.video.slug}` } as React.CSSProperties}
            >
                {/* loading="lazy" + no <video> here: only the poster image is fetched until a card is clicked. */}
                <img src={props.video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                <Icon name="play_circle" className="absolute inset-0 m-auto text-4xl text-white drop-shadow" />
            </div>
            <div className="font-bolder text-body-sm line-clamp-1">{props.video.title}</div>
            <div className="text-body-xs line-clamp-2" title={props.video.description}>
                {props.video.description}
            </div>
        </div>
    );
}

type TutorialDetailsProps = {
    video: TutorialVideo | null;
    onBack: () => void;
};

type TutorialStep = {
    title: string;
    startSeconds: number;
};

function TutorialDetails(props: TutorialDetailsProps): React.ReactNode {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [steps, setSteps] = React.useState<TutorialStep[]>([]);
    const [currentTime, setCurrentTime] = React.useState(0);

    React.useEffect(() => {
        if (!props.video) {
            setSteps([]);
            return;
        }

        const controller = new AbortController();
        setSteps([]);
        setCurrentTime(0);
        fetch(props.video.stepsUrl, { signal: controller.signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload: unknown) => {
                if (!payload || typeof payload !== "object" || !("steps" in payload)) {
                    return;
                }
                const candidateSteps = (payload as { steps?: unknown }).steps;
                if (!Array.isArray(candidateSteps)) {
                    return;
                }
                setSteps(
                    candidateSteps.filter(
                        (step): step is TutorialStep =>
                            typeof step === "object" &&
                            step !== null &&
                            typeof (step as TutorialStep).title === "string" &&
                            Number.isFinite((step as TutorialStep).startSeconds) &&
                            (step as TutorialStep).startSeconds >= 0,
                    ),
                );
            })
            .catch(() => undefined);

        return () => controller.abort();
    }, [props.video]);

    if (!props.video) {
        return (
            <Paragraph
                layoutClassName="flex h-full items-center justify-center"
                tone="neutral"
                variant="subtle"
                size="sm"
            >
                Select a video to play it
            </Paragraph>
        );
    }

    const currentStepIndex = getCurrentStepIndex(steps, currentTime);

    function seekTo(startSeconds: number) {
        const player = videoRef.current;
        if (!player) {
            return;
        }

        player.currentTime = startSeconds;
        setCurrentTime(startSeconds);
        void player.play();
    }

    return (
        <div className="gap-x-sm p-xs flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
            <aside className="gap-y-sm flex min-h-0 shrink-0 flex-col overflow-hidden lg:w-72">
                <button
                    type="button"
                    className="text-accent-strong gap-x-2xs inline-flex cursor-pointer items-center self-start rounded-sm px-2xs py-2xs text-body-sm transition-colors hover:bg-accent-canvas focus-visible:outline-2 focus-visible:outline-offset-1"
                    onClick={props.onBack}
                >
                    <KeyboardArrowLeft fontSize="small" aria-hidden="true" />
                    <span>Back to tutorials</span>
                </button>
                <div className="gap-y-2xs flex flex-col">
                    <Heading as="h5" layoutClassName="text-xl leading-tight font-bolder">
                        {props.video.title}
                    </Heading>
                    <div className="border-neutral-subtle text-neutral-subtle border-b pb-sm text-body-sm leading-relaxed">
                        {props.video.description}
                    </div>
                </div>
                {steps.length > 0 && (
                    <nav aria-label="Video steps" className="gap-y-2xs flex min-h-0 flex-1 flex-col pt-sm">
                        <Heading as="h6" layoutClassName="text-body-xs text-neutral-subtle uppercase tracking-wide">
                            Steps
                        </Heading>
                        <div className="relative min-h-0 flex-1 overflow-y-auto pl-sm">
                            {steps.map((step, index) => {
                                const isCurrentStep = currentStepIndex === index;
                                return (
                                    <button
                                        key={`${step.title}-${step.startSeconds}`}
                                        type="button"
                                        aria-current={isCurrentStep ? "step" : undefined}
                                        className={resolveClassNames(
                                            "relative mb-2xs flex w-full cursor-pointer items-start gap-x-2xs rounded-sm px-2xs py-2xs text-left text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
                                            isCurrentStep
                                                ? "bg-accent-canvas text-accent-strong font-bolder"
                                                : "text-neutral-strong hover:bg-accent-canvas hover:text-accent-strong",
                                        )}
                                        onClick={() => seekTo(step.startSeconds)}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={resolveClassNames(
                                                "absolute top-1/2 -left-[calc(0.5rem+3px)] z-10 h-2 w-2 -translate-y-1/2 rounded-full border-2",
                                                isCurrentStep
                                                    ? "border-accent-strong bg-accent-strong"
                                                    : "border-neutral-subtle bg-canvas",
                                            )}
                                        />
                                        <span>{step.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                )}
            </aside>
            <div className="flex min-h-0 min-w-0 grow items-center justify-center overflow-hidden">
                {/* key={slug} unmounts the previous player, so only the selected video is ever fetched. */}
                <video
                    key={props.video.slug}
                    ref={videoRef}
                    controls
                    autoPlay
                    preload="metadata"
                    poster={props.video.thumbnailUrl}
                    src={props.video.videoUrl}
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    className="border-neutral-subtle shadow-elevation-overlay h-full max-h-full max-w-full rounded-md border-2 object-contain"
                    style={{ viewTransitionName: `tutorial-${props.video.slug}` } as React.CSSProperties}
                />
            </div>
        </div>
    );
}

function getCurrentStepIndex(steps: TutorialStep[], currentTime: number): number {
    let currentIndex = -1;
    steps.forEach((step, index) => {
        if (step.startSeconds <= currentTime) {
            currentIndex = index;
        }
    });
    return currentIndex;
}

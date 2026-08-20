import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { play_circle } from "@equinor/eds-icons";

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
                    <div className="gap-xs grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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
            className="group selectable gap-y-2xs p-2xs box-border flex cursor-pointer flex-col select-none transition-transform duration-200 hover:scale-[1.01]"
            onClick={props.onClick}
        >
            <div
                className="bg-neutral-subtle relative aspect-video w-full overflow-hidden"
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

type TutorialChapter = {
    title: string;
    startSeconds: number;
};

function TutorialDetails(props: TutorialDetailsProps): React.ReactNode {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [chapters, setChapters] = React.useState<TutorialChapter[]>([]);
    const [currentTime, setCurrentTime] = React.useState(0);

    React.useEffect(() => {
        if (!props.video) {
            setChapters([]);
            return;
        }

        const controller = new AbortController();
        setChapters([]);
        setCurrentTime(0);
        fetch(props.video.chaptersUrl, { signal: controller.signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload: unknown) => {
                if (!payload || typeof payload !== "object" || !("chapters" in payload)) {
                    return;
                }
                const candidateChapters = (payload as { chapters?: unknown }).chapters;
                if (!Array.isArray(candidateChapters)) {
                    return;
                }
                setChapters(
                    candidateChapters.filter(
                        (chapter): chapter is TutorialChapter =>
                            typeof chapter === "object" &&
                            chapter !== null &&
                            typeof (chapter as TutorialChapter).title === "string" &&
                            Number.isFinite((chapter as TutorialChapter).startSeconds) &&
                            (chapter as TutorialChapter).startSeconds >= 0,
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

    const currentChapterIndex = getCurrentChapterIndex(chapters, currentTime);

    return (
        <div className="gap-x-sm p-xs flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
            <aside className="gap-y-sm flex min-h-0 shrink-0 flex-col overflow-y-auto lg:w-64">
                <button
                    type="button"
                    className="text-accent-strong self-start text-body-sm hover:underline"
                    onClick={props.onBack}
                >
                    &lt; Back to tutorials
                </button>
                <Heading as="h6">{props.video.title}</Heading>
                <div className="text-neutral-subtle text-body-sm">{props.video.description}</div>
                {chapters.length > 0 && (
                    <nav aria-label="Video chapters" className="gap-y-2xs flex min-h-0 flex-col">
                        <Heading as="h6">Chapters</Heading>
                        <div className="gap-y-2xs flex min-h-0 flex-col overflow-y-auto">
                            {chapters.map((chapter, index) => {
                                const isCurrentChapter = currentChapterIndex === index;
                                return (
                                    <button
                                        key={`${chapter.title}-${chapter.startSeconds}`}
                                        type="button"
                                        aria-current={isCurrentChapter ? "step" : undefined}
                                        className={resolveClassNames(
                                            "text-left text-body-sm hover:underline",
                                            isCurrentChapter
                                                ? "bg-accent-strong text-neutral-strong-on-emphasis"
                                                : "text-accent-strong",
                                        )}
                                        onClick={() => {
                                            const player = videoRef.current;
                                            if (!player) {
                                                return;
                                            }
                                            player.currentTime = chapter.startSeconds;
                                            setCurrentTime(chapter.startSeconds);
                                            void player.play();
                                        }}
                                    >
                                        {formatChapterTime(chapter.startSeconds)} {chapter.title}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                )}
            </aside>
            <div className="flex min-h-0 min-w-0 grow items-center justify-center overflow-hidden bg-black">
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
                    className="h-full max-h-full max-w-full object-contain"
                    style={{ viewTransitionName: `tutorial-${props.video.slug}` } as React.CSSProperties}
                />
            </div>
        </div>
    );
}

function getCurrentChapterIndex(chapters: TutorialChapter[], currentTime: number): number {
    let currentIndex = -1;
    chapters.forEach((chapter, index) => {
        if (chapter.startSeconds <= currentTime) {
            currentIndex = index;
        }
    });
    return currentIndex;
}

function formatChapterTime(seconds: number): string {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

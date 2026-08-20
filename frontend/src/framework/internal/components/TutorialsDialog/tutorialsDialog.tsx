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
    const categories = groupByCategory(TUTORIAL_VIDEOS);

    return (
        <Dialog.Popup open={isOpen} modal onOpenChange={handleOpenChange} minHeight={480} height="80vh" width="900px">
            <Dialog.Header closeIconVisible>
                <Dialog.Title>Tutorials</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body layoutClassName="grow min-h-0">
                <div className="gap-x-2xs flex h-full min-h-0">
                    <div className="gap-y-sm p-2xs flex min-h-0 grow flex-col overflow-y-auto">
                        {categories.map(([category, videos]) => (
                            <div key={category} className="gap-y-2xs flex flex-col">
                                <Heading as="h6">{category}</Heading>
                                <div className="gap-xs grid grid-cols-2">
                                    {videos.map((video) => (
                                        <TutorialCard
                                            key={video.slug}
                                            video={video}
                                            selected={video.slug === selectedSlug}
                                            onClick={() => setSelectedSlug(video.slug)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="border-neutral-subtle bg-canvas flex h-full w-[420px] min-w-[420px] flex-col overflow-y-auto border-l">
                        <TutorialDetails video={selectedVideo} />
                    </div>
                </div>
            </Dialog.Body>
        </Dialog.Popup>
    );
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
    selected: boolean;
    onClick: () => void;
};

function TutorialCard(props: TutorialCardProps): React.ReactNode {
    return (
        <div
            className={resolveClassNames(
                "group selectable gap-y-2xs p-2xs box-border flex cursor-pointer flex-col select-none",
                {
                    "bg-accent-strong text-neutral-strong-on-emphasis hover:bg-accent-strong-hover active:bg-accent-strong-active":
                        props.selected,
                },
            )}
            data-selected={props.selected ? "true" : undefined}
            onClick={props.onClick}
        >
            <div className="bg-neutral-subtle relative aspect-video w-full overflow-hidden">
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
};

type TutorialChapter = {
    title: string;
    startSeconds: number;
};

function TutorialDetails(props: TutorialDetailsProps): React.ReactNode {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [chapters, setChapters] = React.useState<TutorialChapter[]>([]);

    React.useEffect(() => {
        if (!props.video) {
            setChapters([]);
            return;
        }

        const controller = new AbortController();
        setChapters([]);
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

    return (
        <div className="gap-y-sm px-sm py-xs flex flex-col">
            <Heading as="h6">{props.video.title}</Heading>
            {/* key={slug} unmounts the previous player, so only the selected video is ever fetched. */}
            <video
                key={props.video.slug}
                ref={videoRef}
                controls
                autoPlay
                preload="none"
                poster={props.video.thumbnailUrl}
                src={props.video.videoUrl}
                className="w-full bg-black"
            />
            {chapters.length > 0 && (
                <nav aria-label="Video chapters" className="gap-y-2xs flex flex-col">
                    <Heading as="h6">Chapters</Heading>
                    {chapters.map((chapter) => (
                        <button
                            key={`${chapter.title}-${chapter.startSeconds}`}
                            type="button"
                            className="text-accent-strong text-left text-body-sm hover:underline"
                            onClick={() => {
                                const player = videoRef.current;
                                if (!player) {
                                    return;
                                }
                                player.currentTime = chapter.startSeconds;
                                void player.play();
                            }}
                        >
                            {formatChapterTime(chapter.startSeconds)} {chapter.title}
                        </button>
                    ))}
                </nav>
            )}
            <div className="text-neutral-subtle text-body-sm">{props.video.description}</div>
        </div>
    );
}

function formatChapterTime(seconds: number): string {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

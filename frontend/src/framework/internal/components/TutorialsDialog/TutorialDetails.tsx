import React from "react";

import { KeyboardArrowLeft } from "@mui/icons-material";

import { Heading, Paragraph } from "@lib/components/Typography/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { appendSasToken, getStepsUrl, getThumbnailUrl, getVideoUrl } from "./tutorialMedia";
import type { TutorialVideo } from "./tutorials.generated";

export type TutorialDetailsProps = {
    video: TutorialVideo | null;
    sasToken: string | undefined;
    onBack: () => void;
};

type TutorialStep = {
    title: string;
    startSeconds: number;
};

export function TutorialDetails(props: TutorialDetailsProps): React.ReactNode {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [steps, setSteps] = React.useState<TutorialStep[]>([]);
    const [currentTime, setCurrentTime] = React.useState(0);

    const video = props.video;
    const sasToken = props.sasToken;

    React.useEffect(() => {
        if (!video || !sasToken) {
            return;
        }

        const controller = new AbortController();
        fetch(`${getStepsUrl(video.slug)}?${sasToken}`, { signal: controller.signal })
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
    }, [video, sasToken]);

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
                <video
                    key={props.video.slug}
                    ref={videoRef}
                    controls
                    autoPlay
                    preload="metadata"
                    poster={appendSasToken(getThumbnailUrl(props.video.slug), sasToken)}
                    src={appendSasToken(getVideoUrl(props.video.slug), sasToken)}
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    className="border-neutral-subtle shadow-elevation-overlay aspect-video h-auto max-h-full w-auto max-w-full rounded-md border-2 object-contain"
                    style={{ viewTransitionName: `tutorial-${props.video.slug}` } as React.CSSProperties}
                />
            </div>
        </div>
    );
}

function getCurrentStepIndex(steps: TutorialStep[], currentTime: number): number {
    return steps.findLastIndex((step) => step.startSeconds <= currentTime);
}

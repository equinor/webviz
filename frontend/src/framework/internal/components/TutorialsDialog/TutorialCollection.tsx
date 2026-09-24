import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { play_circle } from "@equinor/eds-icons";

import { Heading, Paragraph } from "@lib/components/Typography/compositions";

import { appendSasToken, getThumbnailUrl } from "./tutorialMedia";
import { TUTORIAL_VIDEOS, type TutorialVideo } from "./tutorials.generated";

Icon.add({ play_circle });

export type TutorialCollectionProps = {
    sasToken: string | undefined;
    onSelect: (video: TutorialVideo) => void;
};

export function TutorialCollection(props: TutorialCollectionProps): React.ReactNode {
    return (
        <div className="gap-y-lg p-2xs flex h-full min-h-0 flex-col overflow-y-auto">
            <Paragraph
                size="sm"
                tone="warning"
                italic
                layoutClassName="bg-warning-canvas py-2xs px-sm self-start rounded"
            >
                More short tutorial videos are on the way — check back for additional content going forward.
            </Paragraph>
            {groupByCategory(TUTORIAL_VIDEOS).map(([category, videos]) => (
                <div key={category} className="gap-y-xs flex flex-col">
                    <Heading as="h6">{category}</Heading>
                    <div className="gap-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                        {videos.map((video) => (
                            <TutorialCard
                                key={video.slug}
                                video={video}
                                sasToken={props.sasToken}
                                onClick={() => props.onSelect(video)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
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
    sasToken: string | undefined;
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
                <img
                    src={appendSasToken(getThumbnailUrl(props.video.slug), props.sasToken)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                />
                <Icon name="play_circle" className="absolute inset-0 m-auto text-4xl text-white drop-shadow" />
            </div>
            <div className="font-bolder text-body-md line-clamp-1">{props.video.title}</div>
            <div className="text-body-sm line-clamp-2" title={props.video.description}>
                {props.video.description}
            </div>
        </div>
    );
}

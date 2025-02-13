import React from "react";

import { DeckGLRef } from "@deck.gl/react";
import { Vec2 } from "@lib/utils/vec2";

export type Label = {
    name: string;
    referencePosition: [number, number, number];
};

export class LabelOrganizer {
    private _labelsMap: Map<string, Label[]> = new Map();
    private _animationFrameId: number | null = null;
    private _subscribers: ((project: (pos: [number, number, number]) => Vec2) => void)[] = [];

    private _ref: DeckGLRef | null;

    constructor(ref: DeckGLRef | null) {
        this._ref = ref;
    }

    setDeckRef(ref: DeckGLRef | null) {
        this._ref = ref;
        this.maybeUpdateLabels();
    }

    private maybeUpdateLabels() {
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
        }

        this._animationFrameId = requestAnimationFrame(() => {
            this._animationFrameId = null;
            this.maybeUpdateLabels();
        });

        if (!this._ref?.deck?.isInitialized) {
            return;
        }
        const viewport = this._ref?.deck?.getViewports()[0];
        if (!viewport) {
            return;
        }
        const project = (position: [number, number, number]) => {
            const pos = viewport.project(position);
            return {
                x: pos[0],
                y: pos[1],
            };
        };
        this._subscribers.forEach((s) => s(project));
    }

    subscribe(func: (project: (pos: [number, number, number]) => Vec2) => void) {
        this._subscribers.push(func);
    }

    registerLabels(layerId: string, labels: Label[]) {
        this._labelsMap.set(layerId, labels);
    }

    makeLabelComponents(): { viewportId: string; labels: LabelComponentProps[] }[] {
        const viewports = this._ref?.deck?.getViewports();
        if (!viewports) {
            return [];
        }

        this._subscribers = [];

        const result: { viewportId: string; labels: LabelComponentProps[] }[] = [];

        for (const [layerId, labels] of this._labelsMap) {
            for (const viewport of viewports) {
                const viewportId = viewport.id;
                const viewportLabels: LabelComponentProps[] = labels.map((label) => {
                    return {
                        id: label.name,
                        name: label.name,
                        referencePosition: label.referencePosition,
                        position: label.referencePosition,
                        projectFunc: (position: [number, number, number]) => {
                            const pos = viewport.project(position);
                            return {
                                x: pos[0],
                                y: pos[1],
                            };
                        },
                        subscribeToViewportChange: this.subscribe.bind(this),
                    };
                });

                const existing = result.find((r) => r.viewportId === viewportId);
                if (existing) {
                    existing.labels.push(...viewportLabels);
                    continue;
                }

                result.push({
                    viewportId,
                    labels: viewportLabels,
                });
            }
        }

        return result;
    }
}

type LabelComponentProps = {
    id: string;
    name: string;
    referencePosition: [number, number, number];
    position: [number, number, number];
    projectFunc: (position: [number, number, number]) => Vec2;
    subscribeToViewportChange: (func: (projectionFunc: (position: [number, number, number]) => Vec2) => void) => void;
};

export function LabelComponent(props: LabelComponentProps) {
    const { projectFunc, subscribeToViewportChange } = props;
    const [position, setPosition] = React.useState(props.projectFunc(props.referencePosition));

    React.useEffect(() => {
        props.subscribeToViewportChange((project) => {
            const newPosition = project(props.referencePosition);
            setPosition(newPosition);
        });
    }, [props.referencePosition, subscribeToViewportChange]);

    return (
        <div
            className="absolute"
            style={{
                left: position.x,
                top: position.y,
                transform: "translate(-50%, -50%)",
                backgroundColor: "white",
                padding: "4px",
                borderRadius: "4px",
            }}
        >
            {props.name}
        </div>
    );
}

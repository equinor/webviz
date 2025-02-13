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
    private _subscribers: (() => void)[] = [];

    private _ref: DeckGLRef | null;

    constructor(ref: DeckGLRef | null) {
        this._ref = ref;
    }

    setDeckRef(ref: DeckGLRef | null) {
        this._ref = ref;
        if (this._ref?.deck) {
            this._ref.deck.props.onViewStateChange = () => {
                this.maybeUpdateLabels();
            };
        }
    }

    private maybeUpdateLabels() {
        this._subscribers.forEach((s) => s());
    }

    subscribe(func: () => void) {
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
                const projectFunc = viewport.project;
                const viewportId = viewport.id;
                const viewportLabels: LabelComponentProps[] = labels.map((label) => {
                    return {
                        id: label.name,
                        name: label.name,
                        referencePosition: label.referencePosition,
                        position: label.referencePosition,
                        projectFunc: (position: [number, number, number]) => {
                            const pos = projectFunc(position);
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
    subscribeToViewportChange: (func: () => void) => void;
};

export function LabelComponent(props: LabelComponentProps) {
    const [position, setPosition] = React.useState(props.projectFunc(props.referencePosition));

    React.useEffect(() => {
        props.subscribeToViewportChange(() => {
            const newPosition = props.projectFunc(props.referencePosition);
            setPosition(newPosition);
        });
    }, [props.projectFunc, props.referencePosition, props.subscribeToViewportChange]);

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

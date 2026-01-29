import { RefObject } from "react";

import { Vec2, Vec3 } from "./definitions";

import { AnnotationOrganizer } from "../AnnotationOrganizer";

export type BaseAnnotation = {
    id: string;
    type: "label" | "pie-chart";
    position: Vec3;
    alternativePositions?: Vec3[];
    scope?: string;
    data?: any;
    priority?: number;
    direction?: Vec3;
    group?: string;
    onMouseOver?: () => void;
    onMouseOut?: () => void;
    onClick?: () => void;
};

export type LabelAnnotation = BaseAnnotation & {
    type: "label";
    name: string;
};

export type PieChartAnnotation = BaseAnnotation & {
    type: "pie-chart";
    data: {
        values: number[];
        colors: string[];
        labels: string[];
    };
};

export type AnnotationComponentProps = BaseAnnotation & {
    instanceId: string;
};

export type AnnotationLayer = {
    id: string;
    name: string;
    visible: boolean;
    priority: number;
    distanceFactor: number;
    minDistance: number;
    maxDistance: number;
    labelOffset: number;
    anchorOcclusionRadius: number;
    anchorSize: number;
    anchorColor: string;
    connectorWidth: number;
    connectorColor: string;
    onClick?: (annotation: AnnotationComponentProps) => void;
    labelComponent?: (props: AnnotationComponentProps) => JSX.Element;
    //annotations: AnnotationProps[],
};

export type ScreenPositionCandidate = {
    originalIndex: number;
    screenPosition: Vec3;
    rank: number;
    quadrant: number;
    distance: number;
    scaleFactor: number;
    inViewSpace: boolean;
};

export type AnnotationInstanceState = {
    visible: boolean;
    health: number;
    distance: number;
    inViewSpace?: boolean;
    occluded?: boolean;
    inTransition?: boolean;
    transitionTime?: number;
    quadrant?: number;
    positionSlot?: number;
    screenPosition: Vec3;
    screenPositionCandidates: ScreenPositionCandidate[];
    screenPositionCandidatesLastIndex: number;
    labelPosition?: Vec2;
    scaledOffset?: Vec2;
    anchorPosition?: Vec2;
    prevAnchorPosition?: Vec2;
    prevLabelPosition?: Vec2;
    prevQuadrant?: number;
    scaleFactor?: number;
    labelHovered?: boolean;
    boost?: boolean;
    kill?: boolean;
    cooldown?: number;
    opacity?: number;
    labelWidth: number;
    labelHeight: number;
    labelX?: number;
    labelY?: number;
    anchorX?: number;
    anchorY?: number;
    zIndex: number;
    capped?: boolean;
    _visibility?: string;
    _opacity?: string;
    _zIndex?: string;
    _transform?: string;
    _needsUpdate?: boolean;
};

export type AnnotationInstance = {
    id: string;
    ref: RefObject<HTMLDivElement> | null;
    layerId: string;
    organizer: AnnotationOrganizer;
    annotation: BaseAnnotation;
    priority: number;
    rank: number;
    state: AnnotationInstanceState;
};

import { Viewport } from "@deck.gl/core";

import RBush from "rbush";

import { Vec2, Vec3 } from "./definitions";
import {
    calcDistance,
    clamp,
    edgeOfRectangle,
    getLabelQuadrant,
    labelAngles,
    labelAnglesMap,
    mixVec2,
    occlusionTest,
} from "./helpers";
import { AnnotationInstance, ScreenPositionCandidate } from "./types";

// Constants for viewport bounds and collision detection
const viewportX = [-0.99, 0.99] as const;
const viewportY = [-0.99, 0.99] as const;
const collisionMargin = 1;
const collisionMargin2 = collisionMargin * 2;

// Animation rate constants
const healthChangeRate = 10; // Fast fade in/out (0.1 seconds)
const transitionRate = 8; // Fast position transitions

// Mutable state for timing - stored in a closure to avoid polluting module scope
// while still persisting across calls
const animationState = {
    prevTime: Date.now() / 1000.0,
};

// Reusable RBush instances - cleared at start of each postProcessInstances call
// These are kept at module level for performance (avoid allocating new trees each frame)
const nearTree = new RBush();
const distantTree = new RBush();

function calculateLabelPosition(
    instance: AnnotationInstance,
    positionSlot: number,
    size: Vec2,
    viewportOffset: Vec2 = [0, 0],
) {
    const scale = instance.state.scaleFactor!;
    const positionOptions = labelAnglesMap[instance.state.quadrant!];

    const angle = labelAngles[positionOptions[positionSlot]];

    const labelWidth = instance.state.labelWidth || 0;
    const labelHeight = instance.state.labelHeight || 0;
    const scaledWidth = labelWidth * scale;
    const scaledHeight = labelHeight * scale;

    const labelEdge = edgeOfRectangle([scaledWidth, scaledHeight], angle);

    const direction: Vec2 = [Math.cos(angle), -Math.sin(angle)];
    const offset = instance.organizer.getParams().labelOffset! * scale;

    const anchorPosition: Vec2 = [
        (instance.state.screenPosition![0] * 0.5 + 0.5) * size[0] + direction[0] * offset,
        (-instance.state.screenPosition![1] * 0.5 + 0.5) * size[1] + direction[1] * offset,
    ];

    instance.state.anchorPosition = anchorPosition;

    instance.state.scaledOffset = [(labelWidth - scaledWidth) / 2, (labelHeight - scaledHeight) / 2];

    instance.state.labelPosition = [
        anchorPosition[0] - scaledWidth / 2 + labelEdge[0] + viewportOffset[0],
        anchorPosition[1] - scaledHeight / 2 + labelEdge[1] + viewportOffset[1],
    ];
}

function setTransition(
    instance: AnnotationInstance,
    assignedSlot: number,
    prevLabelPosition: Vec2 | null,
    prevAnchorPosition: Vec2 | null,
) {
    if (
        instance.state.visible &&
        (instance.state.positionSlot !== assignedSlot ||
            (instance.state.prevQuadrant && instance.state.prevQuadrant !== instance.state.quadrant)) &&
        prevLabelPosition
    ) {
        instance.state.inTransition = true;
        instance.state.transitionTime = 0;
        instance.state.prevLabelPosition = prevLabelPosition;
        if (prevAnchorPosition) instance.state.prevAnchorPosition = prevAnchorPosition;
    }
}

/**
 * PRE-PROCESS INSTANCES
 */
export function preprocessInstances(instances: AnnotationInstance[], viewport: Viewport, maxVisible: number) {
    const currentTime = Date.now() / 1000.0;
    const deltaTime = currentTime - animationState.prevTime;

    const cameraPosition = viewport.cameraPosition as Vec3;
    const fov = 2.0 * Math.atan(1.0 / viewport.projectionMatrix[5]);
    const fovRad = (fov * Math.PI) / 180.0;

    let nInViewSpace = 0;
    const inViewspace: AnnotationInstance[] = [];

    instances.forEach((instance, i) => {
        instance.state.capped = false;
        instance.state._needsUpdate = false;
        if (!instance.state.visible) {
            instance.state.health = 0;
            instance.state.prevAnchorPosition = undefined;
            instance.state.prevLabelPosition = undefined;
        }

        if (instance.state.kill) {
            if (instance.state.health === 0) {
                instance.state.kill = false;
                instance.state.visible = false;
            } else if (instance.state.health > 0) {
                instance.state.health = Math.max(0, instance.state.health - deltaTime * healthChangeRate);
            }
        } else if (instance.state.health < 1) {
            instance.state.health = Math.min(1, Math.max(0, instance.state.health + deltaTime * healthChangeRate));
        }

        if (instance.state.inTransition) {
            instance.state.transitionTime! += deltaTime * transitionRate;
            if (instance.state.transitionTime! >= 1) {
                instance.state.inTransition = false;
                instance.state.transitionTime = 0;
                instance.state.prevAnchorPosition = undefined;
                instance.state.prevLabelPosition = undefined;
            }
        }

        const positions: Vec3[] = [instance.annotation.position];
        if (instance.annotation.alternativePositions) {
            positions.push(...instance.annotation.alternativePositions);
        }

        let scaleFactor = 0.25;
        let distance = 0;
        let isInViewSpace = false;
        let position: Vec3 = [0, 0, 0];

        const candidates: ScreenPositionCandidate[] = [];

        for (let j = 0; j < positions.length; j++) {
            const candidate: ScreenPositionCandidate = {
                originalIndex: j,
                screenPosition: [0, 0, 0],
                rank: 0,
                quadrant: 0,
                distance: 0,
                scaleFactor: 0,
                inViewSpace: false,
            };

            position = positions[j];
            distance = calcDistance(position, cameraPosition);
            scaleFactor = Math.max(
                0.25,
                Math.min(
                    1,
                    (1 / (2 * Math.tan(fovRad / 2) * distance)) * instance.organizer.getParams().distanceFactor,
                ),
            );

            const screenPosition = viewport.project(position) as Vec3;
            screenPosition[0] = (2.0 * screenPosition[0]) / viewport.width - 1.0;
            screenPosition[1] = 1.0 - (2.0 * screenPosition[1]) / viewport.height;

            const depthOk = screenPosition[2] >= 0 && screenPosition[2] <= 1;
            const xOk = screenPosition[0] >= viewportX[0] && screenPosition[0] <= viewportX[1];
            const yOk = screenPosition[1] >= viewportY[0] && screenPosition[1] <= viewportY[1];
            const minDistOk =
                !instance.organizer.getParams().minDistance || distance >= instance.organizer.getParams().minDistance;
            const maxDistOk =
                !instance.organizer.getParams().maxDistance || distance <= instance.organizer.getParams().maxDistance;

            isInViewSpace = depthOk && xOk && yOk && minDistOk && maxDistOk;

            candidate.screenPosition = screenPosition;
            candidate.distance = distance;
            candidate.scaleFactor = scaleFactor;
            candidate.inViewSpace = isInViewSpace;

            candidates.push(candidate);
        }

        instance.state.screenPositionCandidates = candidates;

        const minOneCandidateInViewSpace = candidates.filter((el) => el.inViewSpace).length > 0;

        const lastCandidate = instance.state.screenPositionCandidates[instance.state.screenPositionCandidatesLastIndex];
        instance.state.screenPosition = [...lastCandidate.screenPosition];
        instance.state.scaleFactor = lastCandidate.scaleFactor;
        instance.state.distance = lastCandidate.distance;
        instance.state.inViewSpace = minOneCandidateInViewSpace;

        if (instance.state.cooldown && instance.state.visible === false) {
            instance.state.cooldown = Math.max(0, instance.state.cooldown - deltaTime);
            instance.rank = 0;
        } else {
            // calculate heuristics
            for (let j = 0; j < candidates.length; j++) {
                const candidate = candidates[j];

                const hPositionPenalty = clamp(
                    (candidate.screenPosition[0] ** 2 + candidate.screenPosition[1] ** 2) / 2,
                    0,
                    1,
                );
                const hDistancePenalty = candidate.distance / instance.organizer.getParams().maxDistance;
                candidate.rank = 1000;
                candidate.rank += instance.priority * 1000 - (hPositionPenalty * 100 + hDistancePenalty * 100);

                /*
                if (instance.state.visible) {
                    candidate.rank += 100;
                } else {
                    candidate.rank -= 100;
                }
                */

                candidate.rank += instances.length - i;

                if (instance.state.boost) {
                    candidate.rank += 100000;
                }

                if (j === instance.state.screenPositionCandidatesLastIndex) {
                    candidate.rank += 1000;
                }

                if (candidate.inViewSpace && nInViewSpace < maxVisible) {
                    candidate.quadrant = instance.annotation.direction
                        ? getLabelQuadrant(
                              candidate.screenPosition,
                              positions[j],
                              instance.annotation.direction,
                              viewport.project,
                          )
                        : 0;
                }
            }

            if (nInViewSpace < maxVisible && minOneCandidateInViewSpace) {
                nInViewSpace++;
                instance.state.prevQuadrant = instance.state.quadrant;
                instance.state.quadrant = lastCandidate.quadrant;
            } else {
                instance.state.visible = false;
                instance.state.quadrant = 0;
                if (i >= maxVisible) {
                    instance.state.capped = true;
                }
            }

            /*
            instance.rank = 1000;
            instance.rank += instance.priority * 1000 - (hPositionPenalty * 100 + hDistancePenalty);

            if (instance.state.visible) {
                instance.rank += 100;
            } else {
                instance.rank -= 100;
            }

            if (isInViewSpace && nInViewSpace < maxVisible) {
                nInViewSpace++;
                instance.state.prevQuadrant = instance.state.quadrant;
                instance.state.quadrant = instance.annotation.direction
                    ? getLabelQuadrant(screenPosition, position, instance.annotation.direction, viewport.project)
                    : 0;
            } else {
                instance.state.quadrant = 0;
                instance.state.visible = false;
                if (i >= maxVisible) {
                    instance.state.capped = true;
                }
            }
            */
        }

        instance.rank += instances.length - i;

        if (instance.state.boost) {
            instance.state.kill = false;
            instance.state.cooldown = 0;
            instance.state.visible = true;
            instance.rank += 100000;
            instance.state.positionSlot = 0;
            instance.state.boost = false;
        }

        if (minOneCandidateInViewSpace && !instance.state.capped) {
            instance.state.screenPositionCandidates = instance.state.screenPositionCandidates.filter(
                (el) => el.inViewSpace,
            );
            inViewspace.push(instance);
        } else {
            if (instance.state._visibility !== "hidden") {
                instance.state.visible = false;
                instance.state._visibility = "hidden";
                instance.state._needsUpdate = true;
            }
        }
    });

    animationState.prevTime = currentTime;

    return inViewspace;
}

/**
 * OCCLUSION TEST
 */
export async function occlustionTestIntstances(
    candidates: { instance: AnnotationInstance; position: Vec3 }[],
    depthBuffer: Float32Array,
    depthBufferWidth: number,
    depthBufferHeight: number,
) {
    candidates.forEach((candidate) => {
        const isOccluded = occlusionTest(candidate.position, depthBufferWidth, depthBufferHeight, depthBuffer);

        if (!candidate.instance.state.occluded && isOccluded) {
            candidate.instance.state.kill = true;
        }
        candidate.instance.state.occluded = isOccluded;
    });
}

// Threshold for considering two screen positions as the same anchor point (in normalized coords)
const SAME_ANCHOR_THRESHOLD = 0.01;

// Get a string key for an anchor position (for grouping annotations at the same point)
function getAnchorKey(screenPosition: Vec3): string {
    // Round to threshold precision to group nearby positions
    const x = Math.round(screenPosition[0] / SAME_ANCHOR_THRESHOLD) * SAME_ANCHOR_THRESHOLD;
    const y = Math.round(screenPosition[1] / SAME_ANCHOR_THRESHOLD) * SAME_ANCHOR_THRESHOLD;
    return `${x.toFixed(3)},${y.toFixed(3)}`;
}

/**
 * POST PROCESS INSTANCES
 */
export function postProcessInstances(instances: AnnotationInstance[], size: Vec2, offset: Vec2) {
    nearTree.clear();
    distantTree.clear();

    const instanceCandidates: ({ instance: AnnotationInstance } & ScreenPositionCandidate)[] = [];
    for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];
        const screenPositionCandidates = instance.state.screenPositionCandidates;
        for (let j = 0; j < screenPositionCandidates.length; j++) {
            instanceCandidates.push({
                instance,
                ...{ ...screenPositionCandidates[j], rank: instance.rank + screenPositionCandidates[j].rank },
            });
        }
    }

    instanceCandidates.sort((a, b) => b.rank - a.rank);

    const handledInstanceIds = new Set<string>();
    // Track which quadrants are occupied for each anchor position
    // Key: anchor position string, Value: Set of occupied quadrants (0-3)
    const occupiedQuadrantsPerAnchor = new Map<string, Set<number>>();

    for (const instanceCandidate of instanceCandidates) {
        const instance = instanceCandidate.instance;
        if (handledInstanceIds.has(instance.id)) {
            continue;
        }

        const prevLabelPosition: Vec2 | null = instance.state.labelPosition ? [...instance.state.labelPosition] : null;
        const prevAnchorPosition: Vec2 | null = instance.state.anchorPosition
            ? [...instance.state.anchorPosition]
            : null;

        const currentSlot = instance.state.positionSlot || 0;
        const element = instance.ref?.current;

        if (element) {
            instance.state.labelWidth = element.clientWidth;
            instance.state.labelHeight = element.clientHeight;
        }

        if (instance.state.kill || instance.state.occluded) {
            calculateLabelPosition(instance, currentSlot, size, offset);
            setTransition(instance, currentSlot, prevLabelPosition, prevAnchorPosition);
            handledInstanceIds.add(instance.id);
        } else if (instance.state.cooldown) {
            instance.state.visible = false;
            handledInstanceIds.add(instance.id);
        } else {
            // calculate label size
            const labelWidth = instance.state.labelWidth;
            const labelHeight = instance.state.labelHeight;

            const scaledWidth = labelWidth * instance.state.scaleFactor!;
            const scaledHeight = labelHeight * instance.state.scaleFactor!;

            // Get anchor key to track quadrant usage for this position
            const anchorKey = getAnchorKey(instanceCandidate.screenPosition);
            if (!occupiedQuadrantsPerAnchor.has(anchorKey)) {
                occupiedQuadrantsPerAnchor.set(anchorKey, new Set());
            }
            const occupiedQuadrants = occupiedQuadrantsPerAnchor.get(anchorKey)!;

            // Try all 4 quadrants (0=NE, 1=NW, 2=SW, 3=SE), preferring unoccupied ones first
            // Start with the candidate's quadrant, then try others
            const preferredQuadrant = instanceCandidate.quadrant;
            const quadrantsToTry: number[] = [];

            // First, add unoccupied quadrants (starting with preferred)
            if (!occupiedQuadrants.has(preferredQuadrant)) {
                quadrantsToTry.push(preferredQuadrant);
            }
            for (let q = 0; q < 4; q++) {
                if (q !== preferredQuadrant && !occupiedQuadrants.has(q)) {
                    quadrantsToTry.push(q);
                }
            }
            // Then add occupied quadrants as fallback (will likely collide but try anyway)
            for (let q = 0; q < 4; q++) {
                if (!quadrantsToTry.includes(q)) {
                    quadrantsToTry.push(q);
                }
            }

            const slots = [0, 1]; // Two slot positions per quadrant

            let positionFound = false;
            outerLoop: for (const quadrant of quadrantsToTry) {
                for (const slot of slots) {
                    instance.state.screenPosition = instanceCandidate.screenPosition;
                    instance.state.quadrant = quadrant;
                    instance.state.scaleFactor = instanceCandidate.scaleFactor;
                    calculateLabelPosition(instance, slot, size, offset);

                    // test for overlaps
                    const rect = {
                        minX: instance.state.labelPosition![0] - collisionMargin,
                        minY: instance.state.labelPosition![1] - collisionMargin,
                        maxX: instance.state.labelPosition![0] + scaledWidth + collisionMargin2,
                        maxY: instance.state.labelPosition![1] + scaledHeight + collisionMargin2,
                    };

                    const collisionTree = instanceCandidate.scaleFactor! >= 0.5 ? nearTree : distantTree;

                    if (!collisionTree.collides(rect)) {
                        collisionTree.insert(rect);
                        positionFound = true;
                        occupiedQuadrants.add(quadrant);
                        instance.state.screenPositionCandidatesLastIndex = instanceCandidate.originalIndex;
                        setTransition(instance, slot, prevLabelPosition, prevAnchorPosition);
                        instance.state.positionSlot = slot;
                        break outerLoop;
                    }
                }
            }

            if (!positionFound) {
                instance.state.kill = true;
                instance.state.cooldown = 0.1; // Short cooldown to avoid flickering
            } else {
                instance.state.visible = true;
                instance.state.kill = false;
                instance.state.cooldown = 0;
                handledInstanceIds.add(instance.id);
            }
        }

        if (!handledInstanceIds.has(instance.id)) {
            continue;
        }

        if (instance.state.visible) {
            instance.state.zIndex = instance.state.labelHovered
                ? 1000000
                : instance.state.kill
                  ? 0
                  : Math.round((1 / instanceCandidate.distance!) * 100000);
            instance.state.opacity = Math.max(0.75, instanceCandidate.scaleFactor!) * instance.state.health;

            let labelX: number, labelY: number;
            if (instance.state.inTransition && instance.state.prevLabelPosition) {
                [labelX, labelY] = mixVec2(
                    instance.state.prevLabelPosition,
                    instance.state.labelPosition!,
                    instance.state.transitionTime,
                );
            } else {
                [labelX, labelY] = instance.state.labelPosition!;
            }

            instance.state.labelX = labelX - instance.state.scaledOffset![0];
            instance.state.labelY = labelY - instance.state.scaledOffset![1];

            // Always compute style values, even if element doesn't exist yet
            // This ensures updates happen on the next frame when the element is mounted
            const newTransform = `translate(${instance.state.labelX}px,${instance.state.labelY}px) scale(${instance.state
                .scaleFactor!})`;
            if (newTransform !== instance.state._transform) {
                instance.state._transform = newTransform;
                instance.state._needsUpdate = true;
            }
            const newOpacity = `${instance.state.opacity!}`;
            if (newOpacity !== instance.state._opacity) {
                instance.state._opacity = newOpacity;
                instance.state._needsUpdate = true;
            }
            const newZIndex = `${instance.state.zIndex!}`;
            if (newZIndex !== instance.state._zIndex) {
                instance.state._zIndex = newZIndex;
                instance.state._needsUpdate = true;
            }
            if (instance.state._visibility !== "visible") {
                instance.state._visibility = "visible";
                instance.state._needsUpdate = true;
            }
        } else if (instance.state._visibility !== "hidden") {
            instance.state._visibility = "hidden";
            instance.state._needsUpdate = true;
        }
    }
    /*
    instances.forEach((instance) => {
        const prevLabelPosition: Vec2 | null = instance.state.labelPosition ? [...instance.state.labelPosition] : null;
        const prevAnchorPosition: Vec2 | null = instance.state.anchorPosition
            ? [...instance.state.anchorPosition]
            : null;

        const currentSlot = instance.state.positionSlot || 0;
        const element = instance.ref?.current;

        if (element) {
            instance.state.labelWidth = element.clientWidth;
            instance.state.labelHeight = element.clientHeight;
        }

        if (instance.state.kill || instance.state.occluded) {
            calculateLabelPosition(instance, currentSlot, size, offset);
            setTransition(instance, currentSlot, prevLabelPosition, prevAnchorPosition);
        } else if (!instance.state.cooldown) {
            let positionFound = false;

            const slots = currentSlot === 0 ? [0, 1] : [1, 0];

            // calculate label size
            const labelWidth = instance.state.labelWidth;
            const labelHeight = instance.state.labelHeight;

            const scaledWidth = labelWidth * instance.state.scaleFactor!;
            const scaledHeight = labelHeight * instance.state.scaleFactor!;

            const sortedCandidates = instance.state.screenPositionCandidates.sort((a, b) => b.rank - a.rank);

            for (let i = 0; i < slots.length; i++) {
                for (let j = 0; j < sortedCandidates.length; j++) {
                    const candidate = sortedCandidates[j];
                    instance.state.screenPosition = candidate.screenPosition;
                    instance.state.quadrant = candidate.quadrant;
                    instance.state.prevQuadrant = candidate.quadrant;
                    calculateLabelPosition(instance, slots[i], size, offset);

                    // test for overlaps
                    const rect = {
                        minX: instance.state.labelPosition![0] - collisionMargin,
                        minY: instance.state.labelPosition![1] - collisionMargin,
                        maxX: instance.state.labelPosition![0] + scaledWidth + collisionMargin2,
                        maxY: instance.state.labelPosition![1] + scaledHeight + collisionMargin2,
                    };

                    const collisionTree = candidate.scaleFactor! >= 0.5 ? nearTree : distantTree;

                    if (!collisionTree.collides(rect)) {
                        collisionTree.insert(rect);
                        positionFound = true;
                        instance.state.screenPositionCandidatesLastIndex = candidate.originalIndex;
                        setTransition(instance, slots[i], prevLabelPosition, prevAnchorPosition);
                        instance.state.positionSlot = slots[i];
                        break;
                    }
                }
                if (positionFound) break;
            }

            if (!positionFound) {
                instance.state.kill = true;
                instance.state.cooldown = 2.5;
            } else {
                instance.state.visible = true;
            }
        } else {
            instance.state.visible = false;
        }

        if (instance.state.visible) {
            instance.state.zIndex = instance.state.labelHovered
                ? 1000000
                : instance.state.kill
                ? 0
                : Math.round((1 / instance.state.distance!) * 100000);
            instance.state.opacity = Math.max(0.75, instance.state.scaleFactor!) * instance.state.health;

            if (instance.state.inTransition && instance.state.prevLabelPosition) {
                [x, y] = mixVec2(
                    instance.state.prevLabelPosition,
                    instance.state.labelPosition!,
                    instance.state.transitionTime
                );
            } else {
                [x, y] = instance.state.labelPosition!;
            }

            instance.state.labelX = x - instance.state.scaledOffset![0];
            instance.state.labelY = y - instance.state.scaledOffset![1];

            if (element) {
                _transform = `translate(${instance.state.labelX}px,${instance.state.labelY}px) scale(${instance.state
                    .scaleFactor!})`;
                if (_transform !== instance.state._transform) {
                    instance.state._transform = _transform;
                    instance.state._needsUpdate = true;
                }
                _opacity = `${instance.state.opacity!}`;
                if (_opacity !== instance.state._opacity) {
                    instance.state._opacity = _opacity;
                    instance.state._needsUpdate = true;
                }
                _zIndex = `${instance.state.zIndex!}`;
                if (_zIndex !== instance.state._zIndex) {
                    instance.state._zIndex = _zIndex;
                    instance.state._needsUpdate = true;
                }
                if (instance.state._visibility !== "visible") {
                    instance.state._visibility = "visible";
                    instance.state._needsUpdate = true;
                }
            }
        } else if (instance.state._visibility !== "hidden") {
            instance.state._visibility = "hidden";
            instance.state._needsUpdate = true;
        }
    });
    */
}

export function updateInstanceDOMElements(instances: AnnotationInstance[]) {
    instances
        .filter((d) => d.state._needsUpdate)
        .forEach((instance) => {
            const element = instance.ref?.current;
            if (element) {
                if (instance.state._transform) element.style.transform = instance.state._transform;
                if (instance.state._opacity) element.style.opacity = instance.state._opacity;
                if (instance.state._zIndex) element.style.zIndex = instance.state._zIndex;
                if (instance.state._visibility) element.style.visibility = instance.state._visibility;
            }
        });
}

import React from "react";

import { Layer as DeckGlLayer, View as DeckGlView } from "@deck.gl/core";
import { DeckGLRef } from "@deck.gl/react";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import { IntersectionPolylinesEvent } from "@framework/userCreatedItems/IntersectionPolylines";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { converter } from "culori";

import { ContextMenu } from "./ContextMenu";
import { ReadooutWrapperProps, ReadoutWrapper } from "./ReadoutWrapper";
import { Toolbar } from "./Toolbar";

import { DeckGlInstanceManager, DeckGlInstanceManagerTopic } from "../utils/DeckGlInstanceManager";
import { LabelComponent, LabelOrganizer } from "../utils/LabelOrganizer";
import { Polyline, PolylinesPlugin, PolylinesPluginTopic } from "../utils/PolylinesPlugin";

export type InteractionWrapperProps = {} & Omit<
    ReadooutWrapperProps,
    "deckGlManager" | "triggerHome" | "verticalScale" | "deckGlRef"
>;

export function InteractionWrapper(props: InteractionWrapperProps): React.ReactNode {
    const deckGlRef = React.useRef<DeckGLRef>(null);
    deckGlRef.current?.deck?.needsRedraw;
    const [deckGlManager, setDeckGlManager] = React.useState<DeckGlInstanceManager>(
        new DeckGlInstanceManager(deckGlRef.current)
    );
    const [labelOrganizer, setLabelOrganizer] = React.useState<LabelOrganizer>(new LabelOrganizer(deckGlRef.current));
    const [polylinesPlugin, setPolylinesPlugin] = React.useState<PolylinesPlugin>(new PolylinesPlugin(deckGlManager));

    usePublishSubscribeTopicValue(deckGlManager, DeckGlInstanceManagerTopic.REDRAW);

    const intersectionPolylines = useIntersectionPolylines(props.workbenchSession);
    const colorSet = props.workbenchSettings.useColorSet();

    const colorGenerator = React.useCallback(
        function* colorGenerator() {
            const colors: [number, number, number][] = colorSet.getColorArray().map((c) => {
                const rgb = converter("rgb")(c);
                if (!rgb) {
                    return [0, 0, 0];
                }
                return [rgb.r * 255, rgb.g * 255, rgb.b * 255];
            });
            let i = 0;
            while (true) {
                yield colors[i % colors.length];
                i++;
            }
        },
        [colorSet]
    );

    React.useEffect(
        function setupDeckGlManager() {
            const manager = new DeckGlInstanceManager(deckGlRef.current);
            setDeckGlManager(manager);

            labelOrganizer.setDeckRef(deckGlRef.current);

            const polylinesPlugin = new PolylinesPlugin(manager, colorGenerator());
            polylinesPlugin.setPolylines(intersectionPolylines.getPolylines());
            manager.addPlugin(polylinesPlugin);
            setPolylinesPlugin(polylinesPlugin);

            const unsubscribeFromPolylinesPlugin = polylinesPlugin
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PolylinesPluginTopic.EDITING_POLYLINE_ID)(() => {
                if (polylinesPlugin.getCurrentEditingPolylineId() === null) {
                    intersectionPolylines.setPolylines(polylinesPlugin.getPolylines());
                }
            });

            const unsubscribeFromIntersectionPolylines = intersectionPolylines.subscribe(
                IntersectionPolylinesEvent.CHANGE,
                () => {
                    polylinesPlugin.setPolylines(intersectionPolylines.getPolylines());
                }
            );

            return function cleanupDeckGlManager() {
                manager.beforeDestroy();
                unsubscribeFromPolylinesPlugin();
                unsubscribeFromIntersectionPolylines();
            };
        },
        [intersectionPolylines, colorGenerator, labelOrganizer]
    );

    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [gridVisible, setGridVisible] = React.useState<boolean>(false);
    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [polylines, setPolylines] = React.useState<Polyline[]>([]);

    function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }

    function handleGridVisibilityChange(visible: boolean) {
        setGridVisible(visible);
    }

    function handleVerticalScaleChange(value: number) {
        setVerticalScale(value);
    }

    const activePolylineId = polylinesPlugin.getCurrentEditingPolylineId();

    const handlePolylineNameChange = React.useCallback(
        function handlePolylineNameChange(name: string): void {
            if (!activePolylineId) {
                return;
            }

            setPolylines((prev) =>
                prev.map((polyline) => {
                    if (polyline.id === activePolylineId) {
                        return {
                            ...polyline,
                            name,
                        };
                    }

                    return polyline;
                })
            );
        },
        [activePolylineId]
    );

    let adjustedLayers: DeckGlLayer[] = [];
    for (const layer of props.layers) {
        adjustedLayers.push(
            layer.clone({
                // @ts-expect-error - we need to add the registerLabels function to the layer
                reportLabels: labelOrganizer.registerLabels.bind(labelOrganizer),
            })
        );
    }
    if (!gridVisible) {
        adjustedLayers = adjustedLayers.filter((layer) => !(layer instanceof AxesLayer));
    }

    const viewportLabels = labelOrganizer.makeLabelComponents();
    const viewportAnnotations = viewportLabels.map((el) => {
        return (
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            /* @ts-expect-error */
            <DeckGlView key={el.viewportId} id={el.viewportId}>
                <div className="h-full w-full relative top-0 left-0 overflow-hidden">
                    {el.labels.map((label) => (
                        <LabelComponent {...label} />
                    ))}
                </div>
            </DeckGlView>
        );
    });

    const adjustedViewportAnnotations = [...props.viewportAnnotations, ...viewportAnnotations];

    return (
        <>
            <Toolbar
                onFitInView={handleFitInViewClick}
                onGridVisibilityChange={handleGridVisibilityChange}
                polylinesPlugin={polylinesPlugin}
                onVerticalScaleChange={handleVerticalScaleChange}
                verticalScale={verticalScale}
                hasActivePolyline={Boolean()}
                onPolylineNameChange={handlePolylineNameChange}
                activePolylineName={polylines.find((p) => p.id === activePolylineId)?.name}
            />
            <ContextMenu deckGlManager={deckGlManager} />
            <ReadoutWrapper
                {...props}
                deckGlRef={deckGlRef}
                viewportAnnotations={adjustedViewportAnnotations}
                layers={adjustedLayers}
                deckGlManager={deckGlManager}
                verticalScale={verticalScale}
                triggerHome={triggerHomeCounter}
            />
        </>
    );
}

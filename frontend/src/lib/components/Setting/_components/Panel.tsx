import React from "react";

import { isEqual } from "lodash-es";

import { useElementSize } from "@lib/hooks/useElementSize";

import type { SettingAnnotation, Overlay } from "./Field";
import { PanelAnnotationsContext } from "./PanelAnnotationsContext";
import type { BannerMessage } from "./PanelBannerMessagesContext";
import { PanelBannerMessagesContext } from "./PanelBannerMessagesContext";
import { PanelOverlaysContext } from "./PanelOverlaysContext";

export type PanelProps = {
    /** The Setting.Field items to render inside the panel. */
    children?: React.ReactNode;
    /** Flattened `SettingAnnotation[]` from every field; filter by `type` as needed. */
    onAnnotationsChange?: (annotations: SettingAnnotation[]) => void;
    /** Flattened `Overlay[]` from every field; filter by `type`. An overlay blocks interaction with its field. */
    onOverlaysChange?: (overlays: Overlay[]) => void;
    /** Flattened messages reported by `Setting.Banner`s (opt-in via `report`); filter by `type`. */
    onBannerMessagesChange?: (messages: BannerMessage[]) => void;
};

export type Layout = "inline" | "stacked";

const LAYOUT_BREAKPOINT = 350;

export const LayoutContext = React.createContext<Layout>("inline");

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel(props, ref) {
    const { onAnnotationsChange, onOverlaysChange, onBannerMessagesChange } = props;

    const [layout, setLayout] = React.useState<Layout>("stacked");
    const localRef = React.useRef<HTMLDivElement>(null);
    const size = useElementSize(localRef);

    const [fieldAnnotations, setFieldAnnotations] = React.useState<Record<string, SettingAnnotation[]>>({});

    const reportFieldAnnotations = React.useCallback(function reportFieldAnnotations(
        fieldId: string,
        annotations: SettingAnnotation[],
    ) {
        setFieldAnnotations((prev) => {
            if (annotations.length === 0) {
                if (!(fieldId in prev)) {
                    return prev;
                }
                const next = { ...prev };
                delete next[fieldId];
                return next;
            }
            if (isEqual(prev[fieldId], annotations)) {
                return prev;
            }
            return { ...prev, [fieldId]: annotations };
        });
    }, []);

    const allAnnotations = React.useMemo(() => Object.values(fieldAnnotations).flat(), [fieldAnnotations]);

    React.useEffect(
        function notifyAnnotationsChange() {
            onAnnotationsChange?.(allAnnotations);
        },
        // eslint-disable-next-line @eslint-react/exhaustive-deps -- Only re-notify when the annotations themselves change
        [allAnnotations],
    );

    const [fieldOverlays, setFieldOverlays] = React.useState<Record<string, Overlay>>({});

    const reportFieldOverlay = React.useCallback(function reportFieldOverlay(fieldId: string, overlay: Overlay | null) {
        setFieldOverlays((prev) => {
            if (overlay === null) {
                if (!(fieldId in prev)) {
                    return prev;
                }
                const next = { ...prev };
                delete next[fieldId];
                return next;
            }
            if (isEqual(prev[fieldId], overlay)) {
                return prev;
            }
            return { ...prev, [fieldId]: overlay };
        });
    }, []);

    const allOverlays = React.useMemo(() => Object.values(fieldOverlays), [fieldOverlays]);

    React.useEffect(
        function notifyOverlaysChange() {
            onOverlaysChange?.(allOverlays);
        },
        // eslint-disable-next-line @eslint-react/exhaustive-deps -- Only re-notify when the overlays themselves change
        [allOverlays],
    );

    const [bannerMessages, setBannerMessages] = React.useState<Record<string, BannerMessage>>({});

    const reportBannerMessage = React.useCallback(function reportBannerMessage(
        bannerId: string,
        message: BannerMessage | null,
    ) {
        setBannerMessages((prev) => {
            if (message === null) {
                if (!(bannerId in prev)) {
                    return prev;
                }
                const next = { ...prev };
                delete next[bannerId];
                return next;
            }
            if (isEqual(prev[bannerId], message)) {
                return prev;
            }
            return { ...prev, [bannerId]: message };
        });
    }, []);

    const allBannerMessages = React.useMemo(() => Object.values(bannerMessages), [bannerMessages]);

    React.useEffect(
        function notifyBannerMessagesChange() {
            onBannerMessagesChange?.(allBannerMessages);
        },
        // eslint-disable-next-line @eslint-react/exhaustive-deps -- Only re-notify when the messages themselves change
        [allBannerMessages],
    );

    React.useImperativeHandle(ref, () => localRef.current as HTMLDivElement, []);

    React.useEffect(
        function updateLayout() {
            if (size.width > LAYOUT_BREAKPOINT) {
                setLayout("inline");
            } else {
                setLayout("stacked");
            }
        },
        [size.width],
    );

    return (
        <LayoutContext.Provider value={layout}>
            <PanelAnnotationsContext.Provider value={reportFieldAnnotations}>
                <PanelOverlaysContext.Provider value={reportFieldOverlay}>
                    <PanelBannerMessagesContext.Provider value={reportBannerMessage}>
                        <div ref={localRef} data-in-group className="gap-x-md grid grid-cols-[auto_1fr_auto]">
                            {props.children}
                        </div>
                    </PanelBannerMessagesContext.Provider>
                </PanelOverlaysContext.Provider>
            </PanelAnnotationsContext.Provider>
        </LayoutContext.Provider>
    );
});

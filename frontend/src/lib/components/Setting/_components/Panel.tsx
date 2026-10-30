import React from "react";

import { isEqual } from "lodash-es";

import { useElementSize } from "@lib/hooks/useElementSize";

import { PanelAnnotationsContext } from "../_contexts/PanelAnnotationsContext";
import type { BannerMessage } from "../_contexts/PanelBannerMessagesContext";
import { PanelBannerMessagesContext } from "../_contexts/PanelBannerMessagesContext";
import { PanelOverlaysContext } from "../_contexts/PanelOverlaysContext";

import type { SettingAnnotation, Overlay } from "./Field";

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

/**
 * Returns a record with the entry for `key` set to `value`, or removed when `value` is null.
 * Returns the same record reference when nothing changes, so state updates can bail out.
 */
function setOrRemoveEntry<T>(record: Record<string, T>, key: string, value: T | null): Record<string, T> {
    if (value === null) {
        if (!(key in record)) {
            return record;
        }
        const next = { ...record };
        delete next[key];
        return next;
    }
    if (isEqual(record[key], value)) {
        return record;
    }
    return { ...record, [key]: value };
}

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
        setFieldAnnotations((prev) => setOrRemoveEntry(prev, fieldId, annotations.length === 0 ? null : annotations));
    }, []);

    const allAnnotations = React.useMemo(() => Object.values(fieldAnnotations).flat(), [fieldAnnotations]);

    React.useEffect(
        function notifyAnnotationsChange() {
            onAnnotationsChange?.(allAnnotations);
        },
        [allAnnotations, onAnnotationsChange],
    );

    const [fieldOverlays, setFieldOverlays] = React.useState<Record<string, Overlay>>({});

    const reportFieldOverlay = React.useCallback(function reportFieldOverlay(fieldId: string, overlay: Overlay | null) {
        setFieldOverlays((prev) => setOrRemoveEntry(prev, fieldId, overlay));
    }, []);

    const allOverlays = React.useMemo(() => Object.values(fieldOverlays), [fieldOverlays]);

    React.useEffect(
        function notifyOverlaysChange() {
            onOverlaysChange?.(allOverlays);
        },
        [allOverlays, onOverlaysChange],
    );

    const [bannerMessages, setBannerMessages] = React.useState<Record<string, BannerMessage>>({});

    const reportBannerMessage = React.useCallback(function reportBannerMessage(
        bannerId: string,
        message: BannerMessage | null,
    ) {
        setBannerMessages((prev) => setOrRemoveEntry(prev, bannerId, message));
    }, []);

    const allBannerMessages = React.useMemo(() => Object.values(bannerMessages), [bannerMessages]);

    React.useEffect(
        function notifyBannerMessagesChange() {
            onBannerMessagesChange?.(allBannerMessages);
        },
        [allBannerMessages, onBannerMessagesChange],
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

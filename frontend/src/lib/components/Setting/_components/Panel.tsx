import React from "react";

import { isEqual } from "lodash-es";

import { useElementSize } from "@lib/hooks/useElementSize";

import type { SettingAnnotation, Overlay } from "./Field";
import { PanelAnnotationsContext } from "./PanelAnnotationsContext";
import { PanelOverlaysContext } from "./PanelOverlaysContext";
import { PanelWarningMessagesContext } from "./PanelWarningMessagesContext";

export type PanelProps = {
    /** The Setting.Field items to render inside the panel. */
    children?: React.ReactNode;
    /** Flattened `SettingAnnotation[]` from every field; filter by `type` as needed. */
    onAnnotationsChange?: (annotations: SettingAnnotation[]) => void;
    /** Flattened `Overlay[]` from every field; filter by `type`. An overlay blocks interaction with its field. */
    onOverlaysChange?: (overlays: Overlay[]) => void;
    /** Flattened `warningMessage` list from every field. */
    onWarningMessagesChange?: (messages: string[]) => void;
};

export type Layout = "inline" | "stacked";

const LAYOUT_BREAKPOINT = 350;

export const LayoutContext = React.createContext<Layout>("inline");

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel(props, ref) {
    const { onAnnotationsChange, onOverlaysChange, onWarningMessagesChange } = props;

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

    const [fieldWarningMessages, setFieldWarningMessages] = React.useState<Record<string, string>>({});

    const reportFieldWarningMessage = React.useCallback(function reportFieldWarningMessage(
        fieldId: string,
        message: string | null,
    ) {
        setFieldWarningMessages((prev) => {
            if (message === null) {
                if (!(fieldId in prev)) {
                    return prev;
                }
                const next = { ...prev };
                delete next[fieldId];
                return next;
            }
            if (prev[fieldId] === message) {
                return prev;
            }
            return { ...prev, [fieldId]: message };
        });
    }, []);

    const warningMessages = React.useMemo(() => Object.values(fieldWarningMessages), [fieldWarningMessages]);

    React.useEffect(
        function notifyWarningMessagesChange() {
            onWarningMessagesChange?.(warningMessages);
        },
        // eslint-disable-next-line @eslint-react/exhaustive-deps -- Only re-notify when the messages themselves change
        [warningMessages],
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
                    <PanelWarningMessagesContext.Provider value={reportFieldWarningMessage}>
                        <div ref={localRef} data-in-group className="gap-x-md grid grid-cols-[auto_1fr_auto]">
                            {props.children}
                        </div>
                    </PanelWarningMessagesContext.Provider>
                </PanelOverlaysContext.Provider>
            </PanelAnnotationsContext.Provider>
        </LayoutContext.Provider>
    );
});

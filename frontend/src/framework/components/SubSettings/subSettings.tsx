import { DenseIconButton } from "@lib/components/DenseIconButton";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { useElementSize } from "@lib/hooks/useElementSize";
import { createPortal } from "@lib/utils/createPortal";
import { Close } from "@mui/icons-material";
import React from "react";

export type SubSettingsProps = {
    title: string;
    anchorElement: React.RefObject<HTMLElement | SVGSVGElement>;
    isOpen: boolean;
    keepMounted?: boolean;
    children: React.ReactNode;
    onClose?: () => void;
    width?: number | string;
};

export function SubSettings(props: SubSettingsProps) {
    const titleRef = React.useRef<HTMLDivElement>(null);
    const settingsPanelRef = React.useRef<HTMLDivElement | null>(null);
    const anchorRect = useElementBoundingRect(props.anchorElement);
    const settingsPanelRect = useElementBoundingRect(settingsPanelRef);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const contentRect = useElementSize(contentRef);
    const titleRect = useElementSize(titleRef);

    React.useEffect(function onMountEffect() {
        settingsPanelRef.current = document.getElementById("module-settings-panel") as HTMLDivElement;
    }, []);

    const style = React.useMemo(
        function calculateStyle() {
            if (!anchorRect) {
                return {};
            }

            let top = anchorRect.top + window.scrollY;
            if (top + contentRect.height + titleRect.height > window.innerHeight + window.scrollY) {
                top = window.innerHeight + window.scrollY - contentRect.height - titleRect.height - 10; // 10px padding from bottom
            }
            if (top < 0 + window.scrollY) {
                top = 0 + window.scrollY + 100; // 10px padding from top
            }

            const baseStyle: React.CSSProperties = {
                top,
                left: settingsPanelRect.right + window.scrollX + 2,
                display: anchorRect.height === 0 ? "none" : undefined,
            };

            return baseStyle;
        },
        [anchorRect, settingsPanelRect],
    );

    const contentHeight = React.useMemo(() => {
        const maxHeight = window.innerHeight - 100 - titleRect.height; // 20px total padding
        if (contentRect.height > maxHeight) {
            return maxHeight;
        }
        return contentRect.height;
    }, [props.isOpen, contentRect, titleRect]);

    return createPortal(
        <div
            className="absolute bg-white shadow-lg z-40"
            style={{ ...style, width: props.width, display: props.isOpen ? undefined : "none" }}
        >
            <div className="bg-slate-100 p-2 font-semibold flex items-center" ref={titleRef}>
                <span className="grow">{props.title}</span>
                <DenseIconButton onClick={props.onClose}>
                    <Close fontSize="inherit" />
                </DenseIconButton>
            </div>
            <div className="overflow-y-auto max-h-full" style={{ maxHeight: contentHeight }}>
                <div ref={contentRef}>{props.children}</div>
            </div>
        </div>,
    );
}

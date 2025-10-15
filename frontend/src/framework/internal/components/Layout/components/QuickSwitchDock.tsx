import React from "react";

import { ArrowLeftRounded, ArrowRightRounded, WebAsset } from "@mui/icons-material";

import type { LayoutElement } from "@framework/internal/Dashboard";
import { Button } from "@lib/components/Button";
import { IconButton } from "@lib/components/IconButton";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type QuickSwitchDockProps = {
    isOpen: boolean;
    layoutElements: LayoutElement[];
    getModuleInstanceName: (moduleInstanceId: string) => string | undefined;
    onActiveModuleChange: (moduleInstanceId: string) => void;
};

export function QuickSwitchDock(props: QuickSwitchDockProps) {
    const { onActiveModuleChange } = props;

    const [visible, setVisible] = React.useState<boolean>(false);

    const scrollerRef = React.useRef<HTMLDivElement>(null);
    const chipRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

    const activeModuleInstanceIndex = React.useMemo(() => {
        return props.layoutElements.findIndex((el) => el.maximized);
    }, [props.layoutElements]);

    const activeModuleInstanceId = React.useMemo(() => {
        return props.layoutElements[activeModuleInstanceIndex]?.moduleInstanceId;
    }, [activeModuleInstanceIndex, props.layoutElements]);

    const handlePreviousModuleInstanceClick = React.useCallback(
        function handlePreviousModuleInstanceClick() {
            let newIndex = activeModuleInstanceIndex - 1;
            if (newIndex < 0) {
                newIndex = props.layoutElements.length - 1;
            }
            const id = props.layoutElements[newIndex].moduleInstanceId;
            if (!id) {
                return;
            }
            onActiveModuleChange(id);
        },
        [activeModuleInstanceIndex, props.layoutElements, onActiveModuleChange],
    );

    const handleNextModuleInstanceClick = React.useCallback(
        function handleNextModuleInstanceClick() {
            let newIndex = activeModuleInstanceIndex + 1;
            if (newIndex >= props.layoutElements.length) {
                newIndex = 0;
            }
            const id = props.layoutElements[newIndex].moduleInstanceId;
            if (!id) {
                return;
            }
            onActiveModuleChange(id);
        },
        [activeModuleInstanceIndex, props.layoutElements, onActiveModuleChange],
    );

    const handleModuleInstanceClick = React.useCallback(
        function handleModuleInstanceClick(moduleInstanceId: string) {
            onActiveModuleChange(moduleInstanceId);
        },
        [onActiveModuleChange],
    );

    function handleToggleVisibilityClick() {
        setVisible((prev) => !prev);
    }

    React.useEffect(
        function scrollIntoView() {
            const btn = activeModuleInstanceId ? chipRefs.current[activeModuleInstanceId] : null;
            btn?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
        },
        [activeModuleInstanceId],
    );

    if (!props.isOpen || props.layoutElements.length === 0) {
        return null;
    }

    return (
        <div className="absolute flex-col items-center justify-items-center w-full z-20 bottom-2 bg-transparent">
            <Tooltip title={visible ? "Hide quick switch dock" : "Show quick switch dock"} placement="top">
                <div
                    className="bg-white p-2 flex items-center gap-1 rounded-t-md border border-b-0 border-gray-300 -mb-[0.125rem] z-20 relative hover:bg-blue-100 cursor-pointer"
                    onClick={handleToggleVisibilityClick}
                >
                    <ArrowLeftRounded fontSize="inherit" />
                    <WebAsset fontSize="inherit" />
                    <ArrowRightRounded fontSize="inherit" />
                </div>
            </Tooltip>
            <div
                className={resolveClassNames(
                    "bg-white p-2 flex items-center gap-2 border border-gray-300 rounded shadow-md z-10 w-4/6",
                    { hidden: !visible },
                )}
            >
                <Tooltip title="Previous module" placement="top">
                    <IconButton onClick={handlePreviousModuleInstanceClick}>
                        <ArrowLeftRounded />
                    </IconButton>
                </Tooltip>

                <div className="relative grow overflow-x-auto overflow-y-hidden flex whitespace-nowrap gap-2">
                    <div
                        ref={scrollerRef}
                        className="grow overflow-x-auto overflow-y-hidden flex whitespace-nowrap gap-2"
                    >
                        {props.layoutElements
                            .filter((el) => el.moduleInstanceId)
                            .map((el) => {
                                return (
                                    <Tooltip
                                        key={el.moduleInstanceId ?? el.moduleName}
                                        title={`Show "${el.moduleName}" module`}
                                        placement="top"
                                        enterDelay="medium"
                                    >
                                        <Button
                                            ref={(node: HTMLDivElement | null) =>
                                                (chipRefs.current[el.moduleInstanceId!] = node)
                                            }
                                            onClick={() => handleModuleInstanceClick(el.moduleInstanceId!)}
                                            variant={el.maximized ? "contained" : "outlined"}
                                            role="tab"
                                            size="medium"
                                        >
                                            {props.getModuleInstanceName(el.moduleInstanceId!)}
                                        </Button>
                                    </Tooltip>
                                );
                            })}
                    </div>
                </div>
                <Tooltip title="Next module" placement="top">
                    <IconButton onClick={handleNextModuleInstanceClick}>
                        <ArrowRightRounded />
                    </IconButton>
                </Tooltip>
            </div>
        </div>
    );
}

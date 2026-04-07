import React from "react";

import type { BaseUIEvent } from "@base-ui/react";
import { Close, CloudDone, CloudOff, Help, HistoryToggleOff, Science, WebAsset } from "@mui/icons-material";

import type { GuiMessageBroker } from "@framework/GuiMessageBroker";
import { GuiEvent, GuiState, RightDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { Drawer } from "@framework/internal/components/Drawer";
import type { Module } from "@framework/Module";
import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTags } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import type { DrawPreviewFunc } from "@framework/Preview";
import { debugFlagIsEnabled, SHOW_DEBUG_MODULES_FLAG } from "@framework/utils/debug";
import type { Workbench } from "@framework/Workbench";
import { Tooltip } from "@lib/components/Tooltip";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Button } from "@lib/newComponents/Button";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { createPortal } from "@lib/utils/createPortal";
import { isDevMode } from "@lib/utils/devMode";
import type { Size2D } from "@lib/utils/geometry";
import { MANHATTAN_LENGTH, pointRelativeToDomRect } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import type { Vec2 } from "@lib/utils/vec2";
import { point2Distance, subtractVec2, vec2FromPointerEvent } from "@lib/utils/vec2";

const makeStyle = (isDragged: boolean, dragSize: Size2D, dragPosition: Vec2): React.CSSProperties => {
    if (isDragged) {
        return {
            width: dragSize.width,
            height: dragSize.height,
            left: dragPosition.x,
            top: dragPosition.y,
            zIndex: 50,
            opacity: 0.5,
            position: "absolute",
        };
    }
    return {
        zIndex: 0,
        opacity: 1,
    };
};

type ModulesListItemProps = {
    name: string;
    devState: ModuleDevState;
    displayName: string;
    description: string | null;
    isSerializable: boolean;
    drawPreviewFunc: DrawPreviewFunc | null;
    guiMessageBroker: GuiMessageBroker;
    onShowDetails: (moduleName: string, yPos: number) => void;
    onHover: (moduleName: string, yPos: number) => void;
    onDraggingStart: () => void;
};

const ModulesListItem: React.FC<ModulesListItemProps> = (props) => {
    const { onDraggingStart } = props;
    const ref = React.useRef<HTMLDivElement>(null);
    const [isDragged, setIsDragged] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [dragSize, setDragSize] = React.useState<Size2D>({ width: 0, height: 0 });

    React.useEffect(
        function pointerEventsEffect() {
            const refCurrent = ref.current;
            let pointerDownPoint: Vec2 | null = null;
            let dragging = false;
            let pointerDownElementPosition: Vec2 | null = null;
            let pointerToElementDiff: Vec2 = { x: 0, y: 0 };

            const handlePointerDown = (e: PointerEvent) => {
                if (ref.current) {
                    document.body.classList.add("touch-none");
                    const point = vec2FromPointerEvent(e);
                    const rect = ref.current.getBoundingClientRect();
                    pointerDownElementPosition = subtractVec2(point, pointRelativeToDomRect(point, rect));
                    props.guiMessageBroker.publishEvent(GuiEvent.NewModulePointerDown, {
                        moduleName: props.name,
                        elementPosition: subtractVec2(point, pointRelativeToDomRect(point, rect)),
                        elementSize: { width: rect.width, height: rect.height },
                        pointerPosition: point,
                    });
                    pointerDownPoint = point;
                    addDraggingEventListeners();
                }
            };

            const handlePointerUp = () => {
                if (!pointerDownPoint) {
                    return;
                }
                pointerDownPoint = null;
                dragging = false;
                setIsDragged(false);
                document.body.classList.remove("touch-none");
                pointerDownElementPosition = null;

                removeDraggingEventListeners();
            };

            const handlePointerMove = (e: PointerEvent) => {
                if (!pointerDownPoint) {
                    return;
                }

                if (
                    !dragging &&
                    point2Distance(vec2FromPointerEvent(e), pointerDownPoint) > MANHATTAN_LENGTH &&
                    pointerDownElementPosition
                ) {
                    dragging = true;
                    setIsDragged(true);
                    onDraggingStart();
                    if (ref.current) {
                        const rect = ref.current.getBoundingClientRect();
                        setDragSize({ width: rect.width, height: rect.height });
                    }
                    pointerToElementDiff = subtractVec2(pointerDownPoint, pointerDownElementPosition);
                    return;
                }

                if (dragging) {
                    setDragPosition(subtractVec2(vec2FromPointerEvent(e), pointerToElementDiff));
                }
            };

            function addDraggingEventListeners() {
                document.addEventListener("pointerup", handlePointerUp);
                document.addEventListener("pointermove", handlePointerMove);
                document.addEventListener("pointercancel", handlePointerUp);
                document.addEventListener("blur-sm", handlePointerUp);
            }

            function removeDraggingEventListeners() {
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointercancel", handlePointerUp);
                document.removeEventListener("blur-sm", handlePointerUp);
            }

            if (ref.current) {
                ref.current.addEventListener("pointerdown", handlePointerDown);
            }

            return () => {
                if (refCurrent) {
                    refCurrent.removeEventListener("pointerdown", handlePointerDown);
                }
                removeDraggingEventListeners();
            };
        },
        [props.guiMessageBroker, props.name, onDraggingStart],
    );

    function handleShowDetails(e: BaseUIEvent<React.MouseEvent<HTMLButtonElement, MouseEvent>>) {
        e.stopPropagation();
        const target = e.currentTarget.parentElement;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        props.onShowDetails(props.name, target.getBoundingClientRect().top);
    }

    function handleHover(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        const target = e.currentTarget;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        props.onHover(props.name, target.getBoundingClientRect().top);
    }

    function makePreviewImage() {
        if (props.drawPreviewFunc) {
            const pixels = convertRemToPixels(2.5);
            return (
                <svg width={pixels} height={pixels} viewBox={`0 0 ${pixels} ${pixels}`}>
                    {props.drawPreviewFunc(pixels, pixels)}
                </svg>
            );
        }
        return (
            <div className="border-stroke-neutral-subtle bg-fill-neutral flex h-full w-full items-center justify-center border" />
        );
    }

    function makeItem() {
        return (
            <div
                ref={isDragged ? undefined : ref}
                className={resolveClassNames(
                    "hover:bg-fill-accent-hover text-body-md flex h-12 w-full touch-none flex-col select-none",
                    {
                        "cursor-move": !isDragged,
                        "cursor-grabbing": isDragged,
                    },
                )}
                style={makeStyle(isDragged, dragSize, dragPosition)}
                onMouseOver={handleHover}
            >
                <div className="flex h-full items-center gap-2 px-2 text-sm" title={props.displayName}>
                    <div className="h-12 w-12 min-w-12 shrink-0 overflow-hidden p-1">{makePreviewImage()}</div>
                    <span className="grow overflow-hidden text-ellipsis whitespace-nowrap">{props.displayName}</span>
                    <span
                        className={resolveClassNames({
                            "text-fill-warning-strong": props.devState === ModuleDevState.DEV,
                            "text-fill-danger-strong": props.devState === ModuleDevState.DEPRECATED,
                        })}
                    >
                        {makeDevStateIcon(props.devState)}
                    </span>
                    <span
                        className={resolveClassNames({
                            "text-fill-success-strong": props.isSerializable,
                            "text-fill-neutral-strong": !props.isSerializable,
                        })}
                        title={props.isSerializable ? "This module is persistable" : "This module is not persistable"}
                    >
                        {props.isSerializable ? <CloudDone fontSize="inherit" /> : <CloudOff fontSize="inherit" />}
                    </span>
                    <Tooltip title="Show details">
                        <Button variant="text" tone="accent" size="small" onClick={handleShowDetails}>
                            <Help fontSize="inherit" />
                        </Button>
                    </Tooltip>
                </div>
            </div>
        );
    }

    if (isDragged) {
        return (
            <>
                <div ref={ref} className="h-12 w-full bg-blue-300" />
                {createPortal(makeItem())}
            </>
        );
    }
    return makeItem();
};

function makeDevStateIcon(devState: ModuleDevState): React.ReactNode {
    if (devState === ModuleDevState.DEPRECATED) {
        return (
            <span title="Deprecated" className="inline-block align-middle text-base">
                <HistoryToggleOff fontSize="inherit" />
            </span>
        );
    }
    if (devState === ModuleDevState.DEV) {
        return (
            <span title="Experimental" className="inline-block align-middle text-base">
                <Science fontSize="inherit" />
            </span>
        );
    }

    return null;
}

type DetailsPopupProps = {
    module: Module<any, any>;
    right: number;
    top: number;
    onClose: () => void;
};

function DetailsPopup(props: DetailsPopupProps): React.ReactNode {
    function makeDevState(devState: ModuleDevState): React.ReactNode {
        if (devState === ModuleDevState.DEPRECATED) {
            return (
                <div className="text-fill-danger-strong flex items-center gap-2 text-xs">
                    {makeDevStateIcon(devState)}
                    <span className="mt-[0.2rem]">Deprecated</span>
                </div>
            );
        }
        if (devState === ModuleDevState.DEV) {
            return (
                <div className="text-fill-warning-strong flex items-center gap-2 text-xs">
                    {makeDevStateIcon(devState)}
                    <span className="mt-[0.2rem]">Experimental</span>
                </div>
            );
        }
    }

    function makePersistenceState(isSerializable: boolean): React.ReactNode {
        if (isSerializable) {
            return (
                <div className="text-fill-success-strong flex items-center gap-2 text-xs">
                    <CloudDone fontSize="inherit" />
                    <span className="mt-[0.2rem]">Module is persistable</span>
                </div>
            );
        }
        return (
            <div className="text-fill-disabled flex items-center gap-2 text-xs">
                <CloudOff fontSize="inherit" />
                <span className="mt-[0.2rem]">Module is not persistable</span>
            </div>
        );
    }
    function makeDataTags(): React.ReactNode[] {
        const tags: React.ReactNode[] = [];
        for (const tag of props.module.getDataTagIds()) {
            const tagObj = ModuleDataTags.find((el) => el.id === tag);
            if (tagObj) {
                tags.push(
                    <div key={tag} className="font-bold text-indigo-600">
                        #{tagObj.name}
                    </div>,
                );
            }
        }

        return tags;
    }

    const style: React.CSSProperties = { right: props.right };
    if (props.top > window.innerHeight / 2) {
        style.bottom = window.innerHeight - props.top - convertRemToPixels(3);
    } else {
        style.top = props.top;
    }

    const previewFunc = props.module.getDrawPreviewFunc();

    return (
        <div
            className="z-tooltip border-stroke-neutral-subtle bg-fill-floating p-space-sm text-body-md absolute flex w-96 gap-4 border shadow-lg"
            style={style}
        >
            <svg width={64} height={64} viewBox={`0 0 ${64} ${64}`}>
                {previewFunc?.(64, 64)}
            </svg>
            <div className="grow">
                <div className="flex items-center">
                    <span className="grow font-bold">{props.module.getDefaultTitle()}</span>
                    <div className="cursor-pointer hover:text-blue-600" onClick={props.onClose} title="Close popup">
                        <Close fontSize="inherit" />
                    </div>
                </div>
                <span className="flex flex-row gap-4">
                    {makeDevState(props.module.getDevState())}
                    {makePersistenceState(props.module.canBeSerialized())}
                </span>
                <div className="mt-2 text-xs">{props.module.getDescription()}</div>
                <div className="text-bold mt-2 flex flex-wrap gap-2 text-xs">{makeDataTags()}</div>
            </div>
        </div>
    );
}

export type ModulesListProps = {
    workbench: Workbench;
    onClose: () => void;
};

const MODULE_CATEGORIES: { category: ModuleCategory; label: string }[] = [
    {
        category: ModuleCategory.MAIN,
        label: "Main modules",
    },
    { category: ModuleCategory.SUB, label: "Sub modules" },
    { category: ModuleCategory.DEBUG, label: "Debug modules" },
];

// Opt-in dev and deprecated modules (included by default in dev mode)
type RequiredModuleDevState = ModuleDevState.PROD;
type OptionalModuleDevState = Exclude<ModuleDevState, RequiredModuleDevState>;
const INITIAL_OPTIONAL_DEV_STATES: OptionalModuleDevState[] = [];
if (isDevMode()) {
    INITIAL_OPTIONAL_DEV_STATES.push(ModuleDevState.DEV);
    INITIAL_OPTIONAL_DEV_STATES.push(ModuleDevState.DEPRECATED);
}

export const ModulesList: React.FC<ModulesListProps> = (props) => {
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);

    const ref = React.useRef<HTMLDivElement>(null);
    const boundingClientRect = useElementBoundingRect(ref);

    const [searchQuery, setSearchQuery] = React.useState("");
    const [optionalDevStates, setOptionalDevStates] =
        React.useState<OptionalModuleDevState[]>(INITIAL_OPTIONAL_DEV_STATES);
    const [showDetailsForModule, setShowDetailsForModule] = React.useState<string | null>(null);
    const [detailsPosY, setDetailsPosY] = React.useState<number>(0);

    function handleSearchQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSearchQuery(e.target.value);
        handleHideDetails();
    }

    function handleShowDetails(moduleName: string, yPos: number) {
        if (showDetailsForModule) {
            setShowDetailsForModule(null);
            return;
        }
        setShowDetailsForModule(moduleName);
        setDetailsPosY(yPos);
    }

    function handleHideDetails() {
        setShowDetailsForModule(null);
    }

    function handleChangeDetails(moduleName: string, yPos: number) {
        if (!showDetailsForModule) {
            return;
        }
        setShowDetailsForModule(moduleName);
        setDetailsPosY(yPos);
    }

    const handleDraggingStart = React.useCallback(function handleDraggingStart() {
        setShowDetailsForModule(null);
    }, []);

    function handleClose() {
        props.onClose();
    }

    // Always include PROD modules
    const validModuleDevStates: ModuleDevState[] = [ModuleDevState.PROD, ...optionalDevStates];
    const filteredModules = Object.values(ModuleRegistry.getRegisteredModules())
        .filter((mod) => validModuleDevStates.includes(mod.getDevState()))
        .filter((mod) => mod.getDefaultTitle().toLowerCase().includes(searchQuery.toLowerCase()));
    const showDebugModules = isDevMode() || debugFlagIsEnabled(SHOW_DEBUG_MODULES_FLAG);

    let right = 0;
    if (boundingClientRect) {
        right = window.innerWidth - boundingClientRect.left + 10;
    }

    const isVisible = drawerContent === RightDrawerContent.ModulesList;
    const visibleModuleCategories = MODULE_CATEGORIES.filter(
        (el) => el.category !== ModuleCategory.DEBUG || showDebugModules,
    );

    return (
        <div ref={ref} className={resolveClassNames("relative h-full w-full", { hidden: !isVisible })}>
            <Drawer
                visible={true}
                onClose={handleClose}
                title="Add modules"
                icon={<WebAsset />}
                showSearch
                searchInputPlaceholder="Search modules..."
                onSearchQueryChange={handleSearchQueryChange}
                filterItems={[
                    {
                        value: ModuleDevState.DEPRECATED,
                        label: (
                            <>
                                <span className="inline-block align-middle text-orange-600">
                                    {makeDevStateIcon(ModuleDevState.DEPRECATED)}
                                </span>
                                <span className="mt-[0.2rem]">Show deprecated</span>
                            </>
                        ),
                        initiallySelected: optionalDevStates.includes(ModuleDevState.DEPRECATED),
                    },
                    {
                        value: ModuleDevState.DEV,
                        label: (
                            <>
                                <span className="inline-block align-middle text-yellow-500">
                                    {makeDevStateIcon(ModuleDevState.DEV)}
                                </span>
                                <span className="mt-[0.2rem]">Show experimental</span>
                            </>
                        ),
                        initiallySelected: optionalDevStates.includes(ModuleDevState.DEV),
                    },
                ]}
                onFilterItemSelectionChange={setOptionalDevStates}
            >
                <Collapsible.ScrollArea>
                    {visibleModuleCategories.map((el) => (
                        <Collapsible.Group key={el.category} title={el.label} defaultOpen>
                            {filteredModules
                                .filter((mod) => mod.getCategory() === el.category)
                                .map((mod) => (
                                    <ModulesListItem
                                        key={mod.getName()}
                                        name={mod.getName()}
                                        devState={mod.getDevState()}
                                        displayName={mod.getDefaultTitle()}
                                        isSerializable={mod.canBeSerialized()}
                                        description={mod.getDescription()}
                                        drawPreviewFunc={mod.getDrawPreviewFunc()}
                                        guiMessageBroker={props.workbench.getGuiMessageBroker()}
                                        onShowDetails={handleShowDetails}
                                        onHover={handleChangeDetails}
                                        onDraggingStart={handleDraggingStart}
                                    />
                                ))}
                        </Collapsible.Group>
                    ))}
                </Collapsible.ScrollArea>
            </Drawer>
            {showDetailsForModule &&
                isVisible &&
                createPortal(
                    <DetailsPopup
                        module={ModuleRegistry.getModule(showDetailsForModule)}
                        onClose={handleHideDetails}
                        right={right}
                        top={detailsPosY}
                    />,
                )}
        </div>
    );
};

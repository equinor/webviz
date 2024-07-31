import React from "react";

import { GuiEvent, GuiMessageBroker, GuiState, LeftDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { Module, ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTags } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { DrawPreviewFunc } from "@framework/Preview";
import { Workbench } from "@framework/Workbench";
import { Drawer } from "@framework/internal/components/Drawer";
import { useModuleInstances } from "@framework/internal/hooks/workbenchHooks";
import { Checkbox } from "@lib/components/Checkbox";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { isDevMode } from "@lib/utils/devMode";
import { MANHATTAN_LENGTH, Size2D, pointRelativeToDomRect } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { Vec2, point2Distance, subtractVec2, vec2FromPointerEvent } from "@lib/utils/vec2";
import {
    Attribution,
    Close,
    ExpandLess,
    ExpandMore,
    Help,
    HistoryToggleOff,
    Science,
    WebAsset,
} from "@mui/icons-material";

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
    drawPreviewFunc: DrawPreviewFunc | null;
    relContainer: HTMLDivElement | null;
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

    React.useEffect(() => {
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
                const rect = props.relContainer?.getBoundingClientRect();
                if (rect) {
                    setDragPosition(subtractVec2(subtractVec2(vec2FromPointerEvent(e), rect), pointerToElementDiff));
                }
            }
        };

        function addDraggingEventListeners() {
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointercancel", handlePointerUp);
            document.addEventListener("blur", handlePointerUp);
        }

        function removeDraggingEventListeners() {
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointercancel", handlePointerUp);
            document.removeEventListener("blur", handlePointerUp);
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
    }, [props.relContainer, props.guiMessageBroker, props.name, onDraggingStart]);

    function handleShowDetails(e: React.MouseEvent<HTMLDivElement>) {
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
            return props.drawPreviewFunc(pixels, pixels);
        }
        return <div className="border bg-slate-200 border-slate-300 flex items-center justify-center w-full h-full" />;
    }

    return (
        <>
            {isDragged && <div ref={ref} className="bg-blue-300 w-full h-12" />}
            <div
                ref={isDragged ? undefined : ref}
                className={resolveClassNames(
                    "touch-none flex flex-col border-solid text-sm text-gray-700 w-full h-12 select-none hover:bg-blue-100 bg-white",
                    {
                        "cursor-move": !isDragged,
                        "cursor-grabbing": isDragged,
                    }
                )}
                style={makeStyle(isDragged, dragSize, dragPosition)}
                onMouseOver={handleHover}
            >
                <div ref={ref} className="px-2 flex items-center h-full text-sm gap-2" title={props.displayName}>
                    <div className="h-12 w-12 min-w-12 overflow-hidden p-1 flex-shrink-0">{makePreviewImage()}</div>
                    <span className="flex-grow text-ellipsis whitespace-nowrap overflow-hidden">
                        {props.displayName}
                    </span>
                    <span
                        className={resolveClassNames({
                            "text-green-600": props.devState === ModuleDevState.PROD,
                            "text-teal-600": props.devState === ModuleDevState.DEV,
                            "text-orange-600": props.devState === ModuleDevState.DEPRECATED,
                        })}
                    >
                        {makeDevStateIcon(props.devState)}
                    </span>
                    <span className="cursor-pointer text-blue-800" title="Show details" onClick={handleShowDetails}>
                        <Help fontSize="inherit" />
                    </span>
                </div>
            </div>
        </>
    );
};

type DevStatesFilterProps = {
    initialDevStates: ModuleDevState[];
    onFilterChange: (devStates: ModuleDevState[]) => void;
};

function DevStatesFilter(props: DevStatesFilterProps): React.ReactNode {
    const [expanded, setExpanded] = React.useState(false);
    const [devStates, setDevStates] = React.useState<ModuleDevState[]>(props.initialDevStates);

    function toggleExpanded() {
        setExpanded(!expanded);
    }

    function handleFilterChange(devState: ModuleDevState) {
        let newDevStates: ModuleDevState[] = [];
        if (devStates.includes(devState)) {
            newDevStates = devStates.filter((state) => state !== devState);
        } else {
            newDevStates = [...devStates, devState];
        }
        setDevStates(newDevStates);
        props.onFilterChange(newDevStates);
    }

    return (
        <div className="flex flex-col gap-1 text-sm">
            <div className="flex gap-2 cursor-pointer items-center" onClick={toggleExpanded}>
                <span className="flex-grow font-bold">Filter by development state</span>
                {expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </div>
            {expanded && (
                <>
                    <Checkbox
                        label={
                            <div className="flex gap-2 items-center">
                                <span className="text-green-600 flex items-center">
                                    {makeDevStateIcon(ModuleDevState.PROD)}
                                </span>
                                <span className="mt-[0.2rem]">Ready for user testing</span>
                            </div>
                        }
                        onChange={() => handleFilterChange(ModuleDevState.PROD)}
                        checked={devStates.includes(ModuleDevState.PROD)}
                    />
                    <Checkbox
                        label={
                            <div className="flex gap-2 items-center">
                                <span className="text-orange-600">{makeDevStateIcon(ModuleDevState.DEPRECATED)}</span>
                                <span className="mt-[0.2rem]">Deprecated</span>
                            </div>
                        }
                        onChange={() => handleFilterChange(ModuleDevState.DEPRECATED)}
                        checked={devStates.includes(ModuleDevState.DEPRECATED)}
                    />
                    <Checkbox
                        label={
                            <div className="flex gap-2 items-center">
                                <span className="text-teal-600 inline-block align-middle">
                                    {makeDevStateIcon(ModuleDevState.DEV)}
                                </span>
                                <span className="mt-[0.2rem]">Under development</span>
                            </div>
                        }
                        onChange={() => handleFilterChange(ModuleDevState.DEV)}
                        checked={devStates.includes(ModuleDevState.DEV)}
                    />
                </>
            )}
        </div>
    );
}

type ModulesListCategoryProps = {
    title: string;
    children: React.ReactNode[];
};

function ModulesListCategory(props: ModulesListCategoryProps): React.ReactNode {
    const [expanded, setExpanded] = React.useState(true);

    function toggleExpanded() {
        setExpanded(!expanded);
    }

    if (props.children.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1">
            <div
                className="flex gap-2 cursor-pointer items-center bg-slate-100 p-2 text-sm shadow sticky top-0 z-20"
                onClick={toggleExpanded}
            >
                <span className="flex-grow font-bold">{props.title}</span>
                {expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </div>
            {expanded && <div className="flex flex-col bg-slate-100 gap-0.5">{props.children}</div>}
        </div>
    );
}

function makeDevStateIcon(devState: ModuleDevState): React.ReactNode {
    if (devState === ModuleDevState.PROD) {
        return (
            <span title="Ready for user testing" className="inline-block align-middle text-base">
                <Attribution fontSize="inherit" />
            </span>
        );
    }
    if (devState === ModuleDevState.DEPRECATED) {
        return (
            <span title="Deprecated" className="inline-block align-middle text-base">
                <HistoryToggleOff fontSize="inherit" />
            </span>
        );
    }
    if (devState === ModuleDevState.DEV) {
        return (
            <span title="Under development" className="inline-block align-middle text-base">
                <Science fontSize="inherit" />
            </span>
        );
    }

    return null;
}

type DetailsPopupProps = {
    module: Module<any>;
    left: number;
    top: number;
    onClose: () => void;
};

function DetailsPopup(props: DetailsPopupProps): React.ReactNode {
    function makeDevState(devState: ModuleDevState): React.ReactNode {
        if (devState === ModuleDevState.PROD) {
            return (
                <div className="flex gap-2 text-green-600 text-xs items-center">
                    {makeDevStateIcon(devState)}
                    <span className="mt-[0.2rem]">Ready for user testing</span>
                </div>
            );
        }
        if (devState === ModuleDevState.DEPRECATED) {
            return (
                <div className="flex gap-2 text-orange-600 text-xs items-center">
                    {makeDevStateIcon(devState)}
                    <span className="mt-[0.2rem]">Deprecated</span>
                </div>
            );
        }
        if (devState === ModuleDevState.DEV) {
            return (
                <div className="flex items-center gap-2 text-teal-600 text-xs">
                    {makeDevStateIcon(devState)}
                    <span className="mt-[0.2rem]">Under development</span>
                </div>
            );
        }
    }

    function makeDataTags(): React.ReactNode[] {
        const tags: React.ReactNode[] = [];
        for (const tag of props.module.getDataTagIds()) {
            const tagObj = ModuleDataTags.find((el) => el.id === tag);
            if (tagObj) {
                tags.push(
                    <div key={tag} className="font-bold text-indigo-600">
                        #{tagObj.name}
                    </div>
                );
            }
        }

        return tags;
    }

    const style: React.CSSProperties = { left: props.left };
    if (props.top > window.innerHeight / 2) {
        style.bottom = window.innerHeight - props.top - convertRemToPixels(3);
    } else {
        style.top = props.top;
    }

    const previewFunc = props.module.getDrawPreviewFunc();

    return (
        <div
            className="absolute bg-white border border-gray-300 shadow-lg p-4 z-50 w-96 text-sm flex gap-4"
            style={style}
        >
            <div>{previewFunc && previewFunc(64, 64)}</div>
            <div className="flex-grow">
                <div className="flex items-center">
                    <span className="font-bold flex-grow">{props.module.getDefaultTitle()}</span>
                    <div className="cursor-pointer hover:text-blue-600" onClick={props.onClose} title="Close popup">
                        <Close fontSize="inherit" />
                    </div>
                </div>
                {makeDevState(props.module.getDevState())}
                <div className="text-xs mt-2">{props.module.getDescription()}</div>
                <div className="text-xs mt-2 flex gap-2 text-bold">{makeDataTags()}</div>
            </div>
        </div>
    );
}

type ModulesListProps = {
    workbench: Workbench;
    relContainer: HTMLDivElement | null;
};

const MODULE_CATEGORIES: { category: ModuleCategory; label: string }[] = [
    {
        category: ModuleCategory.MAIN,
        label: "Main modules",
    },
    { category: ModuleCategory.SUB, label: "Sub modules" },
    { category: ModuleCategory.DEBUG, label: "Debug modules" },
];

const INITIAL_DEV_STATES = [ModuleDevState.PROD];
if (isDevMode()) {
    INITIAL_DEV_STATES.push(ModuleDevState.DEV);
    INITIAL_DEV_STATES.push(ModuleDevState.DEPRECATED);
}

export const ModulesList: React.FC<ModulesListProps> = (props) => {
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.LeftDrawerContent);
    const moduleInstances = useModuleInstances(props.workbench);

    const ref = React.useRef<HTMLDivElement>(null);
    const boundingClientRect = useElementBoundingRect(ref);

    const [searchQuery, setSearchQuery] = React.useState("");
    const [devStates, setDevStates] = React.useState<ModuleDevState[]>(INITIAL_DEV_STATES);
    const [showDetailsForModule, setShowDetailsForModule] = React.useState<string | null>(null);
    const [detailsPosY, setDetailsPosY] = React.useState<number>(0);

    function handleSearchQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSearchQuery(e.target.value);
        handleHideDetails();
    }

    function handleDevStatesChange(devStates: ModuleDevState[]) {
        setDevStates(devStates);
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

    function handleNotificationClick() {
        props.workbench.getGuiMessageBroker().setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
    }

    const handleDraggingStart = React.useCallback(function handleDraggingStart() {
        setShowDetailsForModule(null);
    }, []);

    const filteredModules = Object.values(ModuleRegistry.getRegisteredModules())
        .filter((mod) => devStates.includes(mod.getDevState()))
        .filter((mod) => mod.getDefaultTitle().toLowerCase().includes(searchQuery.toLowerCase()));

    let left = 0;
    if (boundingClientRect) {
        left = boundingClientRect.left + boundingClientRect.width + 10;
    }

    const visible = drawerContent === LeftDrawerContent.ModulesList;

    return (
        <div ref={ref} className={resolveClassNames("w-full h-full", { hidden: !visible })}>
            <Drawer
                visible
                title="Add modules"
                icon={<WebAsset />}
                showFilter
                filterPlaceholder="Filter modules..."
                onFilterChange={handleSearchQueryChange}
                headerChildren={
                    <>
                        <Notification onClick={handleNotificationClick} visible={moduleInstances.length > 0} />
                        <DevStatesFilter onFilterChange={handleDevStatesChange} initialDevStates={devStates} />
                    </>
                }
            >
                <>
                    {MODULE_CATEGORIES.map((el) => (
                        <ModulesListCategory key={el.category} title={el.label}>
                            {filteredModules
                                .filter((mod) => mod.getCategory() === el.category)
                                .map((mod) => (
                                    <ModulesListItem
                                        relContainer={props.relContainer}
                                        key={mod.getName()}
                                        name={mod.getName()}
                                        devState={mod.getDevState()}
                                        displayName={mod.getDefaultTitle()}
                                        description={mod.getDescription()}
                                        drawPreviewFunc={mod.getDrawPreviewFunc()}
                                        guiMessageBroker={props.workbench.getGuiMessageBroker()}
                                        onShowDetails={handleShowDetails}
                                        onHover={handleChangeDetails}
                                        onDraggingStart={handleDraggingStart}
                                    />
                                ))}
                        </ModulesListCategory>
                    ))}
                </>
            </Drawer>
            {showDetailsForModule &&
                visible &&
                createPortal(
                    <DetailsPopup
                        module={ModuleRegistry.getModule(showDetailsForModule)}
                        onClose={handleHideDetails}
                        left={left}
                        top={detailsPosY}
                    />
                )}
        </div>
    );
};

type NotificationProps = {
    visible: boolean;
    onClick: () => void;
};

function Notification(props: NotificationProps): React.ReactNode {
    if (!props.visible) {
        return null;
    }
    return (
        <div
            className="bg-green-600 hover:bg-green-500 p-2 mb-4 text-sm cursor-pointer text-white"
            onClick={props.onClick}
        >
            <p className="font-bold mb-1">Done editing?</p>
            Click here or on a module header to start using your dashboard.
        </div>
    );
}

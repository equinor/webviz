import React from "react";

import { WebAsset } from "@mui/icons-material";

import { GuiState, RightDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { Drawer } from "@framework/internal/components/Drawer";
import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { debugFlagIsEnabled, SHOW_DEBUG_MODULES_FLAG } from "@framework/utils/debug";
import type { Workbench } from "@framework/Workbench";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { isDevMode } from "@lib/utils/devMode";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ModuleDetailsPopover } from "./moduleDetailsPopover";
import { DevStateIcon } from "./moduleIcons";
import { ModulesListItem } from "./moduleListItem";

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

    const [searchQuery, setSearchQuery] = React.useState("");
    const [optionalDevStates, setOptionalDevStates] =
        React.useState<OptionalModuleDevState[]>(INITIAL_OPTIONAL_DEV_STATES);
    const [detailsOpen, setDetailsOpen] = React.useState<boolean>(false);
    const [lastHoveredModule, setLastHoveredModule] = React.useState<string | null>(null);
    const [detailsPopoverAnchor, setDetailsPopoverAnchor] = React.useState<HTMLElement>();

    function handleSearchQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSearchQuery(e.target.value);
        setDetailsOpen(false);
        setLastHoveredModule(null);
    }

    function handleShowDetails() {
        setDetailsOpen(true);
    }

    const handleDraggingStart = React.useCallback(function handleDraggingStart() {
        setDetailsOpen(false);
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

    const isVisible = drawerContent === RightDrawerContent.ModulesList;
    const visibleModuleCategories = MODULE_CATEGORIES.filter(
        (el) => el.category !== ModuleCategory.DEBUG || showDebugModules,
    );

    function handleItemHover(moduleName: string, ref: React.RefObject<HTMLDivElement>) {
        setLastHoveredModule(moduleName);
        setDetailsPopoverAnchor(ref.current ?? undefined);
    }

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
                        label: <span className="mt-[0.2rem]">Show deprecated</span>,
                        initiallySelected: optionalDevStates.includes(ModuleDevState.DEPRECATED),
                        icon: (
                            <span className="text-warning-subtle inline-block align-middle">
                                <DevStateIcon devState={ModuleDevState.DEPRECATED} />
                            </span>
                        ),
                    },
                    {
                        value: ModuleDevState.DEV,
                        label: <span className="mt-[0.2rem]">Show experimental</span>,
                        initiallySelected: optionalDevStates.includes(ModuleDevState.DEV),
                        icon: (
                            <span className="text-danger-subtle inline-block align-middle">
                                <DevStateIcon devState={ModuleDevState.DEV} />
                            </span>
                        ),
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
                                        onDraggingStart={handleDraggingStart}
                                        onShowDetails={handleShowDetails}
                                        onHover={handleItemHover}
                                    />
                                ))}
                        </Collapsible.Group>
                    ))}
                </Collapsible.ScrollArea>
            </Drawer>

            <ModuleDetailsPopover
                open={detailsOpen && !!lastHoveredModule}
                anchor={detailsPopoverAnchor}
                module={lastHoveredModule ? ModuleRegistry.getModule(lastHoveredModule) : null}
                onOpenChange={setDetailsOpen}
            />
        </div>
    );
};

import React from "react";

import { Icon } from "@equinor/eds-core-react";
import type { IconData } from "@equinor/eds-icons";
import { fault, grid_layer, surface_layer, timeline, wellbore } from "@equinor/eds-icons";
import {
    Add,
    CheckCircle,
    ChevronRight,
    Delete,
    Difference,
    Edit,
    Error as ErrorIcon,
    ErrorOutline,
    ExpandMore,
    Folder,
    Layers,
    Link,
    MoreHoriz,
    Panorama,
    PushPin,
    SelectAll,
    SettingsApplications,
    UnfoldLessDouble,
    UnfoldMoreDouble,
    Warning,
} from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { MenuCompositions } from "@lib/components/Menu/compositions";
import type { MenuItem } from "@lib/components/Menu/compositions/types";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import { GroupType } from "../../groups/groupTypes";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { instanceofItemGroup } from "../../interfacesAndTypes/entities";
import { isContextBoundary } from "../ContextBoundary/ContextBoundary";
import { DataProviderStatus, DataProviderTopic, isDataProvider } from "../DataProvider/DataProvider";
import type { DataProvider } from "../DataProvider/DataProvider";
import { DeltaSurface } from "../DeltaSurface/DeltaSurface";
import { isErrorPlaceholder } from "../ErrorPlaceholder/ErrorPlaceholder";
import { isGroup } from "../Group/Group";
import type { Group } from "../Group/Group";
import { SettingTopic } from "../SettingManager/SettingManager";
import { isSharedSetting } from "../SharedSetting/SharedSetting";
import type { SharedSetting } from "../SharedSetting/SharedSetting";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";

import type { AddRow, Guide, ItemRow, SectionRow } from "./treeModel";
import { ROW_HEIGHT_PX, isSource } from "./treeModel";

const GUIDE_WIDTH_PX = 16;

/** The ├ / └ connectors and the continuing lines of the ancestors, one 16px column per nesting level. */
function BranchGuides(props: { guides: Guide[] }): React.ReactNode {
    return props.guides.map((guide, level) => (
        // eslint-disable-next-line @eslint-react/no-array-index-key -- one column per nesting level, purely positional
        <span key={level} className="relative h-full shrink-0" style={{ width: GUIDE_WIDTH_PX }}>
            {(guide === "line" || guide === "mid") && (
                <span className="border-neutral absolute top-0 bottom-0 left-[7px] border-l" />
            )}
            {guide === "last" && <span className="border-neutral absolute top-0 left-[7px] h-1/2 border-l" />}
            {(guide === "mid" || guide === "last") && (
                <span className="border-neutral absolute top-1/2 left-[7px] w-[9px] border-t" />
            )}
        </span>
    ));
}

/*
 * Providers don't declare an icon, so it is derived from the provider type, using the same icons as the modules' add
 * menus. Grid is checked before wells, as there is a grid provider with "WELLBORE" in its type.
 */
function getProviderIconData(providerType: string): IconData | null {
    const type = providerType.toUpperCase();
    if (type.includes("GRID")) {
        return grid_layer;
    }
    if (type.includes("WELL")) {
        return wellbore;
    }
    if (type.includes("POLYGON") || type.includes("FAULT") || type.includes("POLYLINE")) {
        return fault;
    }
    if (type.includes("FENCE") || type === "INTERSECTION_SEISMIC") {
        return timeline;
    }
    if (type.includes("SURFACE") || type.includes("SLICE")) {
        return surface_layer;
    }
    return null;
}

/** Views show their assigned colour, kept up to date. */
function ViewIcon(props: { view: Group<any, any> }): React.ReactNode {
    const color = usePublishSubscribeTopicValue(props.view.getGroupDelegate(), GroupDelegateTopic.COLOR);
    return <Panorama style={{ fontSize: 16, color: color ?? undefined }} />;
}

export function ItemIcon(props: { item: Item; color?: string }): React.ReactNode {
    const style = { fontSize: 16, color: props.color };
    const { item } = props;
    if (isGroup(item) && item.getGroupType() === GroupType.VIEW) {
        return <ViewIcon view={item} />;
    }
    if (isErrorPlaceholder(item)) {
        return <ErrorOutline className="text-danger-subtle" style={style} />;
    }
    if (isDataProvider(item)) {
        const ownIcon = item.getIcon();
        if (ownIcon) {
            return <span style={style}>{ownIcon}</span>;
        }
        const iconData = getProviderIconData(item.getType());
        if (iconData) {
            return <Icon data={iconData} size={16} color={props.color} />;
        }
        return <Layers style={style} />;
    }
    if (isSharedSetting(item)) {
        return <Link style={style} />;
    }
    if (isContextBoundary(item)) {
        return <SettingsApplications style={style} />;
    }
    if (item instanceof DeltaSurface) {
        return <Difference style={style} />;
    }
    if (isGroup(item)) {
        return <span style={style}>{item.getIcon() ?? <Folder fontSize="inherit" />}</span>;
    }
    return <Folder style={style} />;
}

function ProviderStatus(props: { dataProvider: DataProvider<any, any> }): React.ReactNode {
    const status = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.STATUS);

    if (status === DataProviderStatus.LOADING) {
        return <CircularProgress size={16} />;
    }
    if (status === DataProviderStatus.ERROR) {
        const error = props.dataProvider.getError();
        const message = typeof error === "string" ? error : (error?.message ?? "Error");
        return (
            <Tooltip content={message} side="bottom">
                <ErrorIcon className="text-danger-subtle" style={{ fontSize: 14 }} />
            </Tooltip>
        );
    }
    if (status === DataProviderStatus.INVALID_SETTINGS) {
        const invalidSettings = props.dataProvider.getSettingsContextDelegate().getInvalidSettings();
        return (
            <Tooltip content={`Invalid settings: ${invalidSettings.join(", ")}`} side="bottom">
                <Warning className="text-warning-subtle" style={{ fontSize: 14 }} />
            </Tooltip>
        );
    }
    if (status === DataProviderStatus.SUCCESS) {
        return <CheckCircle className="text-success-subtle" style={{ fontSize: 14 }} />;
    }
    return null;
}

/** The current value of a shared setting as text, kept up to date. */
export function useSharedSettingValueText(sharedSetting: SharedSetting<any>): React.ReactNode {
    const setting = sharedSetting.getWrappedSetting();
    const value = usePublishSubscribeTopicValue(setting, SettingTopic.INTERNAL_VALUE);
    const manager = sharedSetting.getItemDelegate().getDataProviderManager();
    return setting.valueToRepresentation(value, manager.getWorkbenchSession(), manager.getWorkbenchSettings());
}

/** The current value of a shared setting, shown as text in its row. */
export function SharedSettingValue(props: { sharedSetting: SharedSetting<any> }): React.ReactNode {
    const representation = useSharedSettingValueText(props.sharedSetting);

    // Shrinks long before the name, which only truncates once the value is fully collapsed
    return (
        <span className="text-neutral-subtle text-body-xs min-w-0 shrink-999 truncate whitespace-nowrap">
            {representation}
        </span>
    );
}

export function ItemName(props: { item: Item; color?: string; onDoubleClick?: () => void }): React.ReactNode {
    const name = usePublishSubscribeTopicValue(props.item.getItemDelegate(), ItemDelegateTopic.NAME);
    const isBold = instanceofItemGroup(props.item) || isSource(props.item);

    return (
        <span
            className={resolveClassNames("min-w-0 shrink truncate whitespace-nowrap", { "font-bolder": isBold })}
            style={{ color: props.color }}
            title={props.onDoubleClick ? "Double-click to rename" : undefined}
            onDoubleClick={props.onDoubleClick}
        >
            {name}
        </span>
    );
}

type InlineNameEditorProps = {
    item: Item;
    onDone: () => void;
};

function InlineNameEditor(props: InlineNameEditorProps): React.ReactNode {
    const { item, onDone } = props;
    const [value, setValue] = React.useState(() => item.getItemDelegate().getName());
    const isDoneRef = React.useRef(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(function focusInputAfterMenuClosed() {
        // One frame later - a menu that just closed returns the focus to its trigger, which would end the edit at once
        const frame = requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    function finish(save: boolean) {
        if (isDoneRef.current) {
            return;
        }
        isDoneRef.current = true;
        const name = value.trim();
        if (save && name) {
            item.getItemDelegate().setName(name);
        }
        onDone();
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        // Escape would otherwise clear the selection in the tree
        event.stopPropagation();
        if (event.key === "Enter") {
            finish(true);
        } else if (event.key === "Escape") {
            finish(false);
        }
    }

    function stopPropagation(event: React.SyntheticEvent) {
        event.stopPropagation();
    }

    return (
        <input
            ref={inputRef}
            type="text"
            aria-label="Item name"
            className="border-neutral bg-surface text-body-sm px-3xs min-w-0 grow rounded-sm border"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => finish(true)}
            onKeyDown={handleKeyDown}
            onPointerDown={stopPropagation}
            onClick={stopPropagation}
            onDoubleClick={stopPropagation}
        />
    );
}

const MENU_RENAME = "rename";
const MENU_REMOVE = "remove";
const MENU_EXPAND_ALL = "expandAll";
const MENU_COLLAPSE_ALL = "collapseAll";
const MENU_SELECT_CONTROLLED = "selectControlled";

type RowMenuProps = {
    item: Item;
    hasControlledItems: boolean;
    onSelectControlled: () => void;
    onRename: () => void;
};

function RowMenu(props: RowMenuProps): React.ReactNode {
    const { item, hasControlledItems, onSelectControlled, onRename } = props;
    const isRenamePendingRef = React.useRef(false);

    const menuItems = React.useMemo(() => {
        const entries: MenuItem[] = [{ id: MENU_RENAME, label: "Rename", icon: <Edit fontSize="inherit" /> }];
        if (instanceofItemGroup(item)) {
            entries.push(
                { id: MENU_EXPAND_ALL, label: "Expand all", icon: <UnfoldMoreDouble fontSize="inherit" /> },
                { id: MENU_COLLAPSE_ALL, label: "Collapse all", icon: <UnfoldLessDouble fontSize="inherit" /> },
            );
        }
        if (isSource(item)) {
            entries.push({
                id: MENU_SELECT_CONTROLLED,
                label: "Select controlled items",
                icon: <SelectAll fontSize="inherit" />,
                disabled: !hasControlledItems,
            });
        }
        entries.push({ type: "divider" });
        entries.push({ id: MENU_REMOVE, label: "Remove", icon: <Delete fontSize="inherit" />, tone: "danger" });
        return entries;
    }, [item, hasControlledItems]);

    function setExpandedRecursively(group: ItemGroup, expanded: boolean) {
        group.getItemDelegate().setExpanded(expanded);
        for (const descendant of group.getGroupDelegate().getDescendantItems(instanceofItemGroup)) {
            descendant.getItemDelegate().setExpanded(expanded);
        }
    }

    function handleActionClicked(id: string) {
        if (id === MENU_RENAME) {
            isRenamePendingRef.current = true;
        } else if (id === MENU_REMOVE) {
            item.getItemDelegate().getParentGroup()?.removeChild(item);
            item.beforeDestroy?.();
        } else if (id === MENU_EXPAND_ALL && instanceofItemGroup(item)) {
            setExpandedRecursively(item, true);
        } else if (id === MENU_COLLAPSE_ALL && instanceofItemGroup(item)) {
            setExpandedRecursively(item, false);
        } else if (id === MENU_SELECT_CONTROLLED) {
            onSelectControlled();
        }
    }

    // The menu returns focus to its trigger when it closes - start renaming only after that, or the input loses focus
    function handleOpenChangeComplete(open: boolean) {
        if (!open && isRenamePendingRef.current) {
            isRenamePendingRef.current = false;
            onRename();
        }
    }

    return (
        <MenuCompositions.Default
            side="bottom"
            align="end"
            itemSize="small"
            items={menuItems}
            onActionClicked={handleActionClicked}
            onOpenChangeComplete={handleOpenChangeComplete}
        >
            <Button variant="ghost" tone="neutral" size="small" iconOnly aria-label="More actions">
                <MoreHoriz fontSize="inherit" />
            </Button>
        </MenuCompositions.Default>
    );
}

export type ItemRowViewProps = {
    row: ItemRow;
    isSelected: boolean;
    isHot: boolean;
    isDragged: boolean;
    isDropInto: boolean;
    isDropIntoValid: boolean;
    sourceColor: string | null;
    hasControlledItems: boolean;
    /** Its settings are pinned in the settings panel */
    isPinned: boolean;
    onPointerDown: (event: React.PointerEvent, row: ItemRow) => void;
    onClick: (event: React.MouseEvent, row: ItemRow) => void;
    onHoverChange: (itemId: string | null) => void;
    onSelectControlled: (item: Item) => void;
};

export function ItemRowView(props: ItemRowViewProps): React.ReactNode {
    const { row, onHoverChange, onSelectControlled } = props;
    const { item } = row;
    const isSelectableRow = isDataProvider(item) || isSource(item);
    const [isEditingName, setIsEditingName] = React.useState(false);

    function handleToggleExpanded(event: React.MouseEvent) {
        event.stopPropagation();
        item.getItemDelegate().setExpanded(!row.isExpanded);
    }

    return (
        <div
            data-row-key={row.key}
            className={resolveClassNames("group/row gap-x-xs px-xs relative flex items-center select-none", {
                "cursor-pointer": isSelectableRow,
                "hover:bg-neutral-hover": !props.isSelected,
                "bg-accent-canvas": props.isHot && !props.isSelected,
                "bg-accent": props.isSelected,
                "opacity-40": props.isDragged,
                "outline-accent-strong z-10 outline-2 -outline-offset-2": props.isDropInto && props.isDropIntoValid,
                "outline-danger z-10 outline-2 -outline-offset-2": props.isDropInto && !props.isDropIntoValid,
            })}
            style={{ height: ROW_HEIGHT_PX }}
            onPointerDown={(event) => props.onPointerDown(event, row)}
            onClick={(event) => props.onClick(event, row)}
            onMouseEnter={() => onHoverChange(row.key)}
            onMouseLeave={() => onHoverChange(null)}
        >
            {props.isSelected && <div className="bg-accent-strong absolute top-0 bottom-0 left-0 w-[3px]" />}
            {/* Starts after the caret column, as the branch line down to a container's children runs through it */}
            <div
                className="border-neutral-subtle pointer-events-none absolute right-0 bottom-0 border-b"
                style={{
                    left: `calc(var(--eds-spacing-horizontal-xs) + ${(row.guides.length + 1) * GUIDE_WIDTH_PX}px)`,
                }}
            />
            <span className="flex h-full shrink-0 items-center">
                <BranchGuides guides={row.guides} />
                <span className="flex w-4 shrink-0 justify-center">
                    {row.isContainer && (
                        <button
                            type="button"
                            className="text-neutral-subtle flex cursor-pointer items-center"
                            aria-label={row.isExpanded ? "Collapse" : "Expand"}
                            onClick={handleToggleExpanded}
                            onPointerDown={(event) => event.stopPropagation()}
                        >
                            {row.isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                        </button>
                    )}
                </span>
            </span>
            <span className="flex shrink-0 items-center">
                <ItemIcon item={item} color={props.sourceColor ?? undefined} />
            </span>
            {isEditingName ? (
                <InlineNameEditor item={item} onDone={() => setIsEditingName(false)} />
            ) : (
                <>
                    <ItemName
                        item={item}
                        color={props.sourceColor ?? undefined}
                        onDoubleClick={() => setIsEditingName(true)}
                    />
                    {props.isPinned && (
                        <PushPin
                            className="text-info-strong shrink-0"
                            style={{ fontSize: 12 }}
                            titleAccess="Settings pinned"
                        />
                    )}
                    <span className="min-w-0 grow" />
                </>
            )}
            {isSharedSetting(item) && <SharedSettingValue sharedSetting={item} />}
            <span
                className="gap-x-2xs flex shrink-0 items-center"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
            >
                {isDataProvider(item) && <ProviderStatus dataProvider={item} />}
                {!isSharedSetting(item) && <VisibilityToggle item={item} />}
                <span className="opacity-0 group-hover/row:opacity-100 focus-within:opacity-100">
                    <RowMenu
                        item={item}
                        hasControlledItems={props.hasControlledItems}
                        onSelectControlled={() => onSelectControlled(item)}
                        onRename={() => setIsEditingName(true)}
                    />
                </span>
            </span>
        </div>
    );
}

export type SectionRowViewProps = {
    row: SectionRow;
};

export function SectionRowView(props: SectionRowViewProps): React.ReactNode {
    return (
        <div
            data-row-key={props.row.key}
            className="border-neutral-subtle text-neutral-subtle px-xs pb-4xs flex items-end border-b text-[11px] tracking-wide uppercase select-none"
            style={{ height: ROW_HEIGHT_PX }}
        >
            {props.row.label}
        </div>
    );
}

export type AddRowViewProps = {
    row: AddRow;
    menuItems: MenuItem[];
    onActionClicked: (identifier: string, row: AddRow) => void;
};

export function AddRowView(props: AddRowViewProps): React.ReactNode {
    const { row, onActionClicked } = props;
    const label = `Add to ${row.containerLabel}…`;

    return (
        <div
            data-row-key={row.key}
            className="gap-x-xs px-xs flex items-center select-none"
            style={{ height: ROW_HEIGHT_PX }}
            // Clicks here (including in the add menu, which is portaled) must not reach the tree background
            onClick={(event) => event.stopPropagation()}
        >
            <span className="flex h-full shrink-0 items-center">
                <BranchGuides guides={row.guides} />
                <span className="w-4 shrink-0" />
            </span>
            {props.menuItems.length === 0 ? (
                <span className="text-neutral-subtle text-body-xs italic">Nothing to add here</span>
            ) : (
                <MenuCompositions.Default
                    side="bottom"
                    align="start"
                    itemSize="small"
                    items={props.menuItems}
                    onActionClicked={(identifier) => onActionClicked(identifier, row)}
                >
                    <button
                        type="button"
                        className="text-neutral-subtle hover:text-neutral-strong text-body-xs gap-x-xs flex cursor-pointer items-center italic"
                    >
                        <Add
                            style={{ fontSize: 14 }}
                            className="border-neutral-subtle rounded-sm border border-dashed"
                        />
                        {label}
                    </button>
                </MenuCompositions.Default>
            )}
        </div>
    );
}

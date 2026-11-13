import React from "react";

import { PushPin, PushPinOutlined, Tune } from "@mui/icons-material";
import { isEqual } from "lodash-es";

import { GuiState } from "@framework/GuiMessageBroker";
import { useGuiMessageBroker } from "@framework/GuiMessageBrokerContext";
import { ComponentSizeContext } from "@lib/components/_shared/contexts/componentSizeContext";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { Item } from "../../interfacesAndTypes/entities";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingTopic } from "../SettingManager/SettingManager";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";
import { isSharedSetting } from "../SharedSetting/SharedSetting";
import { EditName } from "../utilityComponents/EditName";

import { bindProxySetting, makeProxySetting } from "./proxySetting";
import type { Relations } from "./treeModel";
import { getItemId, getItemSettings } from "./treeModel";
import { ItemIcon } from "./TreeRowViews";

/** Re-renders whenever one of the given topics is published by any of the settings. */
function useSettingsTopics(settings: SettingManager<any>[], topics: SettingTopic[]): void {
    const [, forceUpdate] = React.useReducer((value: number) => value + 1, 0);

    React.useEffect(
        function subscribeToSettings() {
            const unsubscribers = settings.flatMap((setting) =>
                topics.map((topic) => setting.getPublishSubscribeDelegate().subscribe(topic, forceUpdate)),
            );
            return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
        },
        [settings, topics],
    );
}

const VALUE_TOPICS = [SettingTopic.INTERNAL_VALUE, SettingTopic.ATTRIBUTES, SettingTopic.IS_EXTERNALLY_CONTROLLED];

/** Called with the id of the shared setting or settings-group whose chip was clicked */
const SourceClickContext = React.createContext<(sourceId: string) => void>(() => {});

type SourceChipProps = {
    source: Item;
    color: string;
    onHoverChange: (itemId: string | null) => void;
};

function SourceChip(props: SourceChipProps): React.ReactNode {
    const onSourceClick = React.useContext(SourceClickContext);
    const sourceId = getItemId(props.source);
    const name = props.source.getItemDelegate().getName();
    return (
        <button
            type="button"
            title={`Go to ${name}`}
            className="text-body-xs shrink-0 cursor-pointer whitespace-nowrap hover:underline"
            style={{ color: props.color }}
            onClick={() => onSourceClick(sourceId)}
            onMouseEnter={() => props.onHoverChange(sourceId)}
            onMouseLeave={() => props.onHoverChange(null)}
        >
            ● from {name}
        </button>
    );
}

function LabelCell(props: { label: string; color?: string }): React.ReactNode {
    return (
        <div className="py-4xs px-2xs flex w-28 items-center" style={{ color: props.color }}>
            {props.label}
        </div>
    );
}

type ControlledSettingRowProps = {
    setting: SettingManager<any>;
    source: Item;
    /** The source's rail colour */
    color: string;
    manager: DataProviderManager;
    isMixed?: boolean;
    onHoverChange: (itemId: string | null) => void;
};

function ControlledSettingRow(props: ControlledSettingRowProps): React.ReactNode {
    const settings = React.useMemo(() => [props.setting], [props.setting]);
    useSettingsTopics(settings, VALUE_TOPICS);

    if (!props.setting.getAttributes().visible) {
        return null;
    }

    const representation = props.isMixed ? (
        <i className="text-neutral-subtle">Mixed</i>
    ) : (
        props.setting.valueToRepresentation(
            props.setting.getInternalValue(),
            props.manager.getWorkbenchSession(),
            props.manager.getWorkbenchSettings(),
        )
    );

    return (
        <>
            <LabelCell label={props.setting.getLabel()} color={props.color} />
            <div className="gap-x-2xs py-4xs px-2xs flex min-w-0 items-center justify-between">
                <span className="min-w-0 truncate">{representation}</span>
                <SourceChip source={props.source} color={props.color} onHoverChange={props.onHoverChange} />
            </div>
        </>
    );
}

const DASHBOARD_TOPICS = [
    SettingTopic.INTERNAL_VALUE,
    SettingTopic.ATTRIBUTES,
    SettingTopic.IS_VALID,
    SettingTopic.IS_DASHBOARD_CONTROLLED,
];

type DashboardControlledSettingRowProps = {
    setting: SettingManager<any>;
    manager: DataProviderManager;
};

/** A setting following a dashboard setting - read-only here, marked like settings controlled by a shared setting. */
function DashboardControlledSettingRow(props: DashboardControlledSettingRowProps): React.ReactNode {
    const settings = React.useMemo(() => [props.setting], [props.setting]);
    useSettingsTopics(settings, DASHBOARD_TOPICS);
    const guiMessageBroker = useGuiMessageBroker();

    if (!props.setting.getAttributes().visible) {
        return null;
    }

    const dashboardSettingLabel = props.setting.getDashboardSettingLabel() ?? "";
    const dashboardSettingKey = props.setting.getDashboardSettingKey();
    const isValueValidHere = props.setting.isValueValid();
    const tooltip = isValueValidHere
        ? `Controlled by the dashboard setting "${dashboardSettingLabel}" - click to show it`
        : `Controlled by the dashboard setting "${dashboardSettingLabel}", whose value is not available here - click to show it`;

    function handleBadgeClick() {
        if (!guiMessageBroker || !dashboardSettingKey) {
            return;
        }
        guiMessageBroker.setState(GuiState.DashboardSettingsPanelVisible, true);
        guiMessageBroker.setState(GuiState.LeftSettingsPanelIsCollapsed, false);
        guiMessageBroker.setState(GuiState.DashboardSettingToFocus, dashboardSettingKey);
    }

    return (
        <>
            <LabelCell label={props.setting.getLabel()} color="var(--eds-color-text-accent-strong)" />
            <div className="gap-x-2xs py-4xs px-2xs flex min-w-0 items-center justify-between">
                <span className="min-w-0 truncate">
                    {isValueValidHere ? (
                        props.setting.valueToRepresentation(
                            props.setting.getInternalValue(),
                            props.manager.getWorkbenchSession(),
                            props.manager.getWorkbenchSettings(),
                        )
                    ) : (
                        <i className="text-warning-subtle">Dashboard value not valid here</i>
                    )}
                </span>
                <Tooltip content={tooltip} side="left">
                    <button
                        type="button"
                        aria-label={tooltip}
                        onClick={handleBadgeClick}
                        className={resolveClassNames(
                            "text-body-xs gap-x-3xs px-2xs py-4xs inline-flex min-w-0 shrink cursor-pointer items-center rounded-full whitespace-nowrap hover:underline",
                            isValueValidHere
                                ? "bg-accent-canvas text-accent-strong"
                                : "bg-warning-canvas text-warning-strong",
                        )}
                    >
                        <Tune fontSize="inherit" className="shrink-0" />
                        <span className="min-w-0 truncate">Dashboard: {dashboardSettingLabel}</span>
                    </button>
                </Tooltip>
            </div>
        </>
    );
}

type SingleSettingRowProps = {
    setting: SettingManager<any>;
    item: Item;
    manager: DataProviderManager;
    relations: Relations;
    onHoverChange: (itemId: string | null) => void;
};

const DASHBOARD_CONTROL_TOPICS = [SettingTopic.IS_DASHBOARD_CONTROLLED];

/** One setting of a single item - controlled by a shared setting, by a dashboard setting, or editable. */
function SingleSettingRow(props: SingleSettingRowProps): React.ReactNode {
    const settings = React.useMemo(() => [props.setting], [props.setting]);
    useSettingsTopics(settings, DASHBOARD_CONTROL_TOPICS);

    const source = props.relations.controllerBySettingId.get(props.setting.getId());
    if (source) {
        return (
            <ControlledSettingRow
                setting={props.setting}
                source={source}
                color={props.relations.colorBySourceId.get(getItemId(source)) ?? ""}
                manager={props.manager}
                onHoverChange={props.onHoverChange}
            />
        );
    }
    if (props.setting.isDashboardControlled()) {
        return <DashboardControlledSettingRow setting={props.setting} manager={props.manager} />;
    }
    return (
        <SettingManagerComponent
            setting={props.setting}
            manager={props.manager}
            sharedSetting={isSharedSetting(props.item)}
        />
    );
}

type ProxySettingProps = {
    targets: SettingManager<any>[];
    manager: DataProviderManager;
};

/** Edits the same setting of all selected items at once - see proxySetting.ts. */
function ProxySetting(props: ProxySettingProps): React.ReactNode {
    const { targets } = props;

    const proxy = React.useMemo(() => makeProxySetting(targets), [targets]);

    React.useEffect(
        function bindProxyToTargets() {
            return bindProxySetting(proxy, targets);
        },
        [proxy, targets],
    );

    return <SettingManagerComponent setting={proxy} manager={props.manager} sharedSetting={false} />;
}

type MultiSettingRowProps = {
    targets: SettingManager<any>[];
    manager: DataProviderManager;
    relations: Relations;
    onHoverChange: (itemId: string | null) => void;
};

function MultiSettingRow(props: MultiSettingRowProps): React.ReactNode {
    const { targets } = props;
    const [isOverridden, setIsOverridden] = React.useState(false);
    useSettingsTopics(targets, VALUE_TOPICS);

    if (targets.every((target) => !target.getAttributes().visible)) {
        return null;
    }

    const firstValue = targets[0].getInternalValue();
    const allEqual = targets.every((target) => isEqual(target.getInternalValue(), firstValue));
    const sources = targets.map((target) => props.relations.controllerBySettingId.get(target.getId()) ?? null);

    if (sources.some((source) => source !== null)) {
        if (sources.every((source) => source === sources[0]) && sources[0]) {
            return (
                <ControlledSettingRow
                    setting={targets[0]}
                    source={sources[0]}
                    color={props.relations.colorBySourceId.get(getItemId(sources[0])) ?? ""}
                    manager={props.manager}
                    isMixed={!allEqual}
                    onHoverChange={props.onHoverChange}
                />
            );
        }
        return (
            <>
                <LabelCell label={targets[0].getLabel()} />
                <div className="py-4xs px-2xs text-neutral-subtle flex items-center italic">Mixed sources</div>
            </>
        );
    }

    if (!allEqual && !isOverridden) {
        return (
            <>
                <LabelCell label={targets[0].getLabel()} />
                <div className="gap-x-2xs py-4xs px-2xs flex items-center justify-between">
                    <i className="text-neutral-subtle">Mixed</i>
                    <Button size="small" variant="ghost" tone="accent" onClick={() => setIsOverridden(true)}>
                        Override for all
                    </Button>
                </div>
            </>
        );
    }

    return <ProxySetting targets={targets} manager={props.manager} />;
}

function getCommonSettings(items: Item[]): SettingManager<any>[][] {
    const settingsPerItem = items.map(getItemSettings);
    const [first, ...rest] = settingsPerItem;
    if (!first) {
        return [];
    }

    const common: SettingManager<any>[][] = [];
    for (const setting of first) {
        const targets = [setting];
        for (const list of rest) {
            const match = list.find((other) => other.getType() === setting.getType());
            if (!match) {
                break;
            }
            targets.push(match);
        }
        if (targets.length === settingsPerItem.length) {
            common.push(targets);
        }
    }
    return common;
}

type SingleItemCardProps = {
    item: Item;
    manager: DataProviderManager;
    relations: Relations;
    onHoverChange: (itemId: string | null) => void;
    isPinned: boolean;
    /** The selected item is pinned - its pinned card stands in for the selection's */
    isHighlighted: boolean;
    onTogglePin: (item: Item) => void;
    /** Where the header sticks - below the panel's toolbar, if there is one */
    stickyTopClassName: string;
};

function SingleItemCard(props: SingleItemCardProps): React.ReactNode {
    const { item, manager, relations, onHoverChange } = props;
    const pinLabel = props.isPinned ? "Unpin settings" : "Pin settings";

    return (
        <div className="flex flex-col">
            <div
                className={resolveClassNames(
                    "gap-x-2xs px-2xs sticky z-10 flex h-8 shrink-0 items-center shadow-sm",
                    props.stickyTopClassName,
                    {
                        "bg-canvas": !props.isPinned,
                        "bg-info": props.isPinned && !props.isHighlighted,
                        // The selected item is pinned - its pinned card stands in for the selection's
                        "bg-info-active": props.isPinned && props.isHighlighted,
                    },
                )}
            >
                <ItemIcon item={item} />
                <div className="min-w-0 grow">
                    <EditName item={item} />
                </div>
                <Tooltip content={pinLabel} side="bottom">
                    <Button
                        variant="ghost"
                        tone={props.isPinned ? "accent" : "neutral"}
                        size="small"
                        iconOnly
                        aria-label={pinLabel}
                        aria-pressed={props.isPinned}
                        onClick={() => props.onTogglePin(item)}
                    >
                        {props.isPinned ? <PushPin fontSize="inherit" /> : <PushPinOutlined fontSize="inherit" />}
                    </Button>
                </Tooltip>
            </div>
            <div className={SETTINGS_GRID_CLASSES}>
                {getItemSettings(item).map((setting) => (
                    <SingleSettingRow
                        key={setting.getId()}
                        setting={setting}
                        item={item}
                        manager={manager}
                        relations={relations}
                        onHoverChange={onHoverChange}
                    />
                ))}
            </div>
        </div>
    );
}

const SETTINGS_GRID_CLASSES =
    "[&>*:nth-child(4n-2)]:bg-surface [&>*:nth-child(4n-3)]:bg-surface [&>*:nth-child(odd)]:w-28! text-body-sm border-neutral-subtle grid auto-rows-[minmax(1.75rem,auto)] grid-cols-[auto_1fr] items-stretch border-t";

export type SettingsPanelProps = {
    manager: DataProviderManager;
    selectedItems: Item[];
    /** Shown above the selection, in the order they were pinned */
    pinnedItems: Item[];
    onTogglePin: (item: Item) => void;
    relations: Relations;
    onHoverChange: (itemId: string | null) => void;
    /** Rendered at the end of the panel header, e.g. a close button */
    headerAdornment?: React.ReactNode;
    /** Rendered at the start of the panel header, also when nothing is selected - the history navigation */
    navigation?: React.ReactNode;
    /** Called when the chip of a controlled setting is clicked, with the id of its source */
    onSourceClick: (sourceId: string) => void;
};

/** Shows the settings of the selected items, with all setting controls in their small size. */
export function SettingsPanel(props: SettingsPanelProps): React.ReactNode {
    return (
        <ComponentSizeContext.Provider value="small">
            <SourceClickContext.Provider value={props.onSourceClick}>
                <SettingsPanelContent {...props} />
            </SourceClickContext.Provider>
        </ComponentSizeContext.Provider>
    );
}

function SettingsPanelContent(props: SettingsPanelProps): React.ReactNode {
    const { selectedItems, pinnedItems, manager, relations, onHoverChange } = props;

    // Stable per selection, so the proxies of a multi selection are only remade when the selection changes
    const selectionKey = selectedItems.map(getItemId).join("|");
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- the selection key identifies the selected items
    const commonSettings = React.useMemo(() => getCommonSettings(selectedItems), [selectionKey]);

    const selectedSingleItem = selectedItems.length === 1 ? selectedItems[0] : null;
    const isSelectionPinned = selectedSingleItem !== null && pinnedItems.includes(selectedSingleItem);
    // The navigation and the close button live in a fixed toolbar, so they never move when the selection changes
    const hasToolbar = Boolean(props.navigation || props.headerAdornment);
    // Card headers stick below the toolbar
    const stickyTopClassName = hasToolbar ? "top-8" : "top-0";

    function makeSelectionCard(): React.ReactNode {
        if (selectedItems.length === 0) {
            if (pinnedItems.length > 0) {
                return null;
            }
            return (
                <div className="text-neutral-subtle text-body-sm p-xs flex grow items-center justify-center text-center">
                    Select a data provider or shared setting to see its settings.
                </div>
            );
        }

        if (selectedSingleItem) {
            if (isSelectionPinned) {
                return null;
            }
            // Keyed by item, so components holding local state (e.g. EditName) never carry it over to another item
            return (
                <SingleItemCard
                    key={getItemId(selectedSingleItem)}
                    item={selectedSingleItem}
                    manager={manager}
                    relations={relations}
                    onHoverChange={onHoverChange}
                    isPinned={false}
                    isHighlighted={false}
                    onTogglePin={props.onTogglePin}
                    stickyTopClassName={stickyTopClassName}
                />
            );
        }

        return (
            <div key={selectionKey} className="flex flex-col">
                <div
                    className={resolveClassNames(
                        "text-body-sm font-bolder gap-x-2xs px-2xs bg-canvas sticky z-10 flex h-8 shrink-0 items-center shadow-sm",
                        stickyTopClassName,
                    )}
                >
                    <span className="min-w-0 grow truncate">{selectedItems.length} items selected</span>
                </div>
                {commonSettings.length === 0 ? (
                    <div className="text-neutral-subtle text-body-sm p-xs">
                        The selected items have no settings in common.
                    </div>
                ) : (
                    <div className={SETTINGS_GRID_CLASSES}>
                        {commonSettings.map((targets) => (
                            <MultiSettingRow
                                key={targets[0].getType()}
                                targets={targets}
                                manager={manager}
                                relations={relations}
                                onHoverChange={onHoverChange}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex min-h-full flex-col">
            {hasToolbar && (
                <div className="px-2xs bg-canvas border-neutral-subtle sticky top-0 z-20 flex h-8 shrink-0 items-center border-b">
                    {props.navigation}
                    <span className="grow" />
                    {props.headerAdornment}
                </div>
            )}
            {/* Separated only from each other - a single card has no border */}
            <div className="[&>*+*]:border-neutral-strong flex grow flex-col [&>*+*]:border-t-2">
                {pinnedItems.map((item) => (
                    <SingleItemCard
                        key={getItemId(item)}
                        item={item}
                        manager={manager}
                        relations={relations}
                        onHoverChange={onHoverChange}
                        isPinned
                        isHighlighted={item === selectedSingleItem}
                        onTogglePin={props.onTogglePin}
                        stickyTopClassName={stickyTopClassName}
                    />
                ))}
                {makeSelectionCard()}
            </div>
        </div>
    );
}

import React from "react";

import { isEqual } from "lodash-es";

import { ComponentSizeContext } from "@lib/components/_shared/contexts/componentSizeContext";
import { Button } from "@lib/components/Button";

import type { Item } from "../../interfacesAndTypes/entities";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingTopic } from "../SettingManager/SettingManager";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";
import { isSharedSetting } from "../SharedSetting/SharedSetting";
import { EditName } from "../utilityComponents/EditName";

import { bindProxySetting, makeProxySetting } from "./proxySetting";
import type { Relations } from "./treeModel";
import { getItemId, getItemSettings, getRailColor } from "./treeModel";
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
            style={{ color: getRailColor(sourceId) }}
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
            <LabelCell label={props.setting.getLabel()} color={getRailColor(getItemId(props.source))} />
            <div className="gap-x-2xs py-4xs px-2xs flex min-w-0 items-center justify-between">
                <span className="min-w-0 truncate">{representation}</span>
                <SourceChip source={props.source} onHoverChange={props.onHoverChange} />
            </div>
        </>
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

const SETTINGS_GRID_CLASSES =
    "[&>*:nth-child(4n-2)]:bg-surface [&>*:nth-child(4n-3)]:bg-surface [&>*:nth-child(odd)]:w-28! text-body-sm border-neutral-subtle grid auto-rows-[minmax(1.75rem,auto)] grid-cols-[auto_1fr] items-stretch border-t";

export type SettingsPanelProps = {
    manager: DataProviderManager;
    selectedItems: Item[];
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
    const { selectedItems, manager, relations, onHoverChange } = props;

    // Stable per selection, so the proxies of a multi selection are only remade when the selection changes
    const selectionKey = selectedItems.map(getItemId).join("|");
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- the selection key identifies the selected items
    const commonSettings = React.useMemo(() => getCommonSettings(selectedItems), [selectionKey]);

    if (selectedItems.length === 0) {
        return (
            <div className="flex h-full flex-col">
                {props.navigation && <div className="px-2xs flex h-8 shrink-0 items-center">{props.navigation}</div>}
                <div className="text-neutral-subtle text-body-sm flex grow items-center justify-center p-2 text-center">
                    Select a data provider or shared setting to see its settings.
                </div>
            </div>
        );
    }

    if (selectedItems.length === 1) {
        const [item] = selectedItems;
        // Keyed by item, so components holding local state (e.g. EditName) never carry it over to another item
        return (
            <div key={getItemId(item)} className="flex flex-col">
                <div className="gap-x-2xs px-2xs bg-canvas sticky top-0 z-10 flex h-8 shrink-0 items-center shadow-sm">
                    {props.navigation}
                    <ItemIcon item={item} />
                    <div className="min-w-0 grow">
                        <EditName item={item} />
                    </div>
                    {props.headerAdornment}
                </div>
                <div className={SETTINGS_GRID_CLASSES}>
                    {getItemSettings(item).map((setting) => {
                        const source = relations.controllerBySettingId.get(setting.getId());
                        if (source) {
                            return (
                                <ControlledSettingRow
                                    key={setting.getId()}
                                    setting={setting}
                                    source={source}
                                    manager={manager}
                                    onHoverChange={onHoverChange}
                                />
                            );
                        }
                        return (
                            <SettingManagerComponent
                                key={setting.getId()}
                                setting={setting}
                                manager={manager}
                                sharedSetting={isSharedSetting(item)}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div key={selectionKey} className="flex flex-col">
            <div className="text-body-sm font-bolder gap-x-2xs px-2xs bg-canvas sticky top-0 z-10 flex h-8 shrink-0 items-center shadow-sm">
                {props.navigation}
                <span className="min-w-0 grow truncate">{selectedItems.length} items selected</span>
                {props.headerAdornment}
            </div>
            {commonSettings.length === 0 ? (
                <div className="text-neutral-subtle text-body-sm p-2">
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

import React from "react";

import { cloneDeep, isEqual } from "lodash-es";

import { Button } from "@lib/components/Button";

import type { Item } from "../../interfacesAndTypes/entities";
import { SettingRegistry } from "../../settings/SettingRegistry";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingTopic } from "../SettingManager/SettingManager";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";
import { isSharedSetting } from "../SharedSetting/SharedSetting";
import { EditName } from "../utilityComponents/EditName";

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

type SourceChipProps = {
    source: Item;
    onHoverChange: (itemId: string | null) => void;
};

function SourceChip(props: SourceChipProps): React.ReactNode {
    const sourceId = getItemId(props.source);
    return (
        <span
            className="text-body-xs cursor-default whitespace-nowrap"
            style={{ color: getRailColor(sourceId) }}
            onMouseEnter={() => props.onHoverChange(sourceId)}
            onMouseLeave={() => props.onHoverChange(null)}
        >
            ● from {props.source.getItemDelegate().getName()}
        </span>
    );
}

function LabelCell(props: { label: string; color?: string }): React.ReactNode {
    return (
        <div className="py-4xs px-2xs flex w-32 items-center" style={{ color: props.color }}>
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

function reduceValueConstraints(proxy: SettingManager<any>, targets: SettingManager<any>[]): any {
    const allConstraints = targets.map((target) => target.getValueConstraints());
    if (allConstraints.some((constraints) => constraints === null)) {
        return null;
    }

    const reducerDefinition = proxy.getValueConstraintsReducerDefinition();
    if (!reducerDefinition) {
        return allConstraints.every((constraints) => isEqual(constraints, allConstraints[0]))
            ? allConstraints[0]
            : null;
    }

    const { reducer, startingValue, isValid } = reducerDefinition;
    let reduced = startingValue;
    allConstraints.forEach((constraints, index) => {
        reduced = reducer(reduced as any, constraints, index);
    });
    return isValid(reduced as any) ? reduced : null;
}

type ProxySettingProps = {
    targets: SettingManager<any>[];
    manager: DataProviderManager;
};

/*
 * A temporary setting standing in for the same setting of all selected items: its options are the intersection of
 * theirs, and a value chosen by the user is written to every one of them. Only user changes are written - selecting
 * never changes any setting.
 */
function ProxySetting(props: ProxySettingProps): React.ReactNode {
    const { targets } = props;

    const proxy = React.useMemo(
        () => SettingRegistry.makeSetting(targets[0].getType(), cloneDeep(targets[0].getInternalValue())),
        [targets],
    );
    const isSyncingFromTargetsRef = React.useRef(false);

    React.useEffect(
        function destroyProxy() {
            return () => proxy.beforeDestroy();
        },
        [proxy],
    );

    React.useEffect(
        function syncConstraintsAndValueFromTargets() {
            function syncConstraints() {
                if (proxy.isStatic()) {
                    return;
                }
                if (targets.some((target) => target.isLoading())) {
                    proxy.setLoading(true);
                    return;
                }
                proxy.setValueConstraints(reduceValueConstraints(proxy, targets));
            }

            function syncValue() {
                const value = targets[0].getInternalValue();
                const allEqual = targets.every((target) => isEqual(target.getInternalValue(), value));
                if (!allEqual || isEqual(proxy.getInternalValue(), value)) {
                    return;
                }
                isSyncingFromTargetsRef.current = true;
                proxy.setValue(cloneDeep(value));
                isSyncingFromTargetsRef.current = false;
            }

            syncConstraints();
            const unsubscribers = targets.flatMap((target) => {
                const delegate = target.getPublishSubscribeDelegate();
                return [
                    delegate.subscribe(SettingTopic.VALUE_CONSTRAINTS, syncConstraints),
                    delegate.subscribe(SettingTopic.IS_LOADING, syncConstraints),
                    delegate.subscribe(SettingTopic.INTERNAL_VALUE, syncValue),
                ];
            });
            return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
        },
        [proxy, targets],
    );

    React.useEffect(
        function writeUserChangesToTargets() {
            return proxy.getPublishSubscribeDelegate().subscribe(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED, () => {
                if (isSyncingFromTargetsRef.current) {
                    return;
                }
                // Published before the new value is set - read it once the change is done
                queueMicrotask(() => {
                    const value = proxy.getInternalValue();
                    for (const target of targets) {
                        target.setValue(cloneDeep(value));
                    }
                });
            });
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
    "[&>*:nth-child(4n-2)]:bg-surface [&>*:nth-child(4n-3)]:bg-surface text-body-sm border-neutral-subtle grid auto-rows-[minmax(2rem,auto)] grid-cols-[auto_1fr] items-stretch border-t";

export type SettingsPanelProps = {
    manager: DataProviderManager;
    selectedItems: Item[];
    relations: Relations;
    onHoverChange: (itemId: string | null) => void;
    /** Rendered at the end of the panel header, e.g. a close button */
    headerAdornment?: React.ReactNode;
};

export function SettingsPanel(props: SettingsPanelProps): React.ReactNode {
    const { selectedItems, manager, relations, onHoverChange } = props;

    // Stable per selection, so the proxies of a multi selection are only remade when the selection changes
    const selectionKey = selectedItems.map(getItemId).join("|");
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- the selection key identifies the selected items
    const commonSettings = React.useMemo(() => getCommonSettings(selectedItems), [selectionKey]);

    if (selectedItems.length === 0) {
        return (
            <div className="text-neutral-subtle text-body-sm flex h-full items-center justify-center p-2 text-center">
                Select a data provider or shared setting to see its settings.
            </div>
        );
    }

    if (selectedItems.length === 1) {
        const [item] = selectedItems;
        // Keyed by item, so components holding local state (e.g. EditName) never carry it over to another item
        return (
            <div key={getItemId(item)} className="flex flex-col">
                <div className="gap-x-2xs px-2xs bg-canvas sticky top-0 z-10 flex h-8 shrink-0 items-center shadow-sm">
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
            <div className="text-body-sm font-bolder px-2xs bg-canvas sticky top-0 z-10 flex h-8 shrink-0 items-center shadow-sm">
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

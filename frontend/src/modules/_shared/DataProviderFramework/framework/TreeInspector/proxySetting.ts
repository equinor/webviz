import { cloneDeep, isEqual } from "lodash-es";

import { SettingRegistry } from "../../settings/SettingRegistry";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingTopic } from "../SettingManager/SettingManager";

/*
 * A proxy is a temporary setting standing in for the same setting of several selected items: its options are the
 * intersection of theirs, and every value the user picks is written to all of them. Selecting alone never writes.
 */

export function makeProxySetting(targets: SettingManager<any>[]): SettingManager<any> {
    return SettingRegistry.makeSetting(targets[0].getType(), cloneDeep(targets[0].getInternalValue()));
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

/**
 * Keeps the proxy's constraints and (shared) value in sync with the targets, and writes the user's changes to all
 * targets. Returns a function undoing all of it.
 */
export function bindProxySetting(proxy: SettingManager<any>, targets: SettingManager<any>[]): () => void {
    let isSyncingFromTargets = false;

    // The settings UI changes values through setValue only (the setting never calls it on itself), so every call from
    // outside is a user change. Written directly - also when the proxy already has the value, e.g. right after
    // "Override for all", where it starts out with the first target's value.
    const originalSetValue = proxy.setValue;
    proxy.setValue = function setValueOnAllTargets(value: any) {
        originalSetValue.call(proxy, value);
        if (isSyncingFromTargets) {
            return;
        }
        for (const target of targets) {
            target.setValue(cloneDeep(value));
        }
    };

    function syncConstraints() {
        if (proxy.isStatic()) {
            return;
        }
        if (targets.some((target) => target.isLoading())) {
            proxy.setLoading(true);
            return;
        }
        proxy.setValueConstraints(reduceValueConstraints(proxy, targets));
        // setValueConstraints only ends loading when the constraints are unchanged
        proxy.setLoading(false);
    }

    function syncValue() {
        const value = targets[0].getInternalValue();
        const allEqual = targets.every((target) => isEqual(target.getInternalValue(), value));
        if (!allEqual || isEqual(proxy.getInternalValue(), value)) {
            return;
        }
        isSyncingFromTargets = true;
        try {
            proxy.setValue(cloneDeep(value));
        } finally {
            isSyncingFromTargets = false;
        }
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

    return function unbindProxySetting() {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        proxy.setValue = originalSetValue;
    };
}

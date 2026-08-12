import { atom, type Atom, type Getter, type WritableAtom } from "jotai";
import { atomEffect } from "jotai-effect";
import { v4 } from "uuid";

import type { ElevatedSettingDefinition } from "./ElevatedSettingDefinition";
import type { ElevatedSettingConsumerHandle, ElevatedSettingInstance } from "./ElevatedSettingInstance";
import { ElevatedSettingInstanceTopic } from "./ElevatedSettingInstance";
import { ElevatedSettingsServiceTopic, type ElevatedSettingsService } from "./ElevatedSettingsService";

export type AtomWithElevatedSettingOverrideOptions<TAtomValue, TElevatedValue, TElevatedConstraints> = {
    definition: ElevatedSettingDefinition<TElevatedValue, TElevatedConstraints>;

    mapElevatedValue: (elevatedValue: TElevatedValue, get: Getter) => TAtomValue;
};

function makeElevatedSettingInstanceAtom<TValue, TConstraints>(
    elevatedSettingsServiceAtom: Atom<ElevatedSettingsService>,
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
): Atom<ElevatedSettingInstance<TValue, TConstraints> | undefined> {
    const revisionAtom = atom(0);

    const subscriptionEffect = atomEffect((get, set) => {
        const service = get(elevatedSettingsServiceAtom);

        return service
            .getPublishSubscribeDelegate()
            .makeSubscriberFunction(ElevatedSettingsServiceTopic.ACTIVE_SETTINGS)(() => {
            set(revisionAtom, (revision) => revision + 1);
        });
    });

    return atom((get) => {
        get(subscriptionEffect);
        get(revisionAtom);

        const service = get(elevatedSettingsServiceAtom);

        if (!service.hasSetting(definition)) {
            return undefined;
        }

        return service.getSetting(definition);
    });
}

export function atomWithElevatedSettingOverride<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TElevatedValue,
    TElevatedConstraints,
>(
    baseAtom: WritableAtom<TAtomValue, TArgs, TResult>,
    elevatedSettingsServiceAtom: Atom<ElevatedSettingsService>,
    options: AtomWithElevatedSettingOverrideOptions<TAtomValue, TElevatedValue, TElevatedConstraints>,
): WritableAtom<TAtomValue, TArgs, TResult>;

export function atomWithElevatedSettingOverride<TAtomValue, TElevatedValue, TElevatedConstraints>(
    baseAtom: Atom<TAtomValue>,
    elevatedSettingsServiceAtom: Atom<ElevatedSettingsService>,
    options: AtomWithElevatedSettingOverrideOptions<TAtomValue, TElevatedValue, TElevatedConstraints>,
): Atom<TAtomValue>;

export function atomWithElevatedSettingOverride<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TElevatedValue,
    TElevatedConstraints,
>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    elevatedSettingsServiceAtom: Atom<ElevatedSettingsService>,
    options: AtomWithElevatedSettingOverrideOptions<TAtomValue, TElevatedValue, TElevatedConstraints>,
) {
    const instanceAtom = makeElevatedSettingInstanceAtom(elevatedSettingsServiceAtom, options.definition);

    const valueRevisionAtom = atom(0);

    const valueSubscriptionEffect = atomEffect((get, set) => {
        const instance = get(instanceAtom);

        if (!instance) {
            return;
        }

        return instance.getPublishSubscribeDelegate().makeSubscriberFunction(ElevatedSettingInstanceTopic.VALUE)(() => {
            set(valueRevisionAtom, (revision) => revision + 1);
        });
    });

    const read = (get: Getter): TAtomValue => {
        get(valueSubscriptionEffect);
        get(valueRevisionAtom);

        const instance = get(instanceAtom);

        if (!instance) {
            return get(baseAtom);
        }

        return options.mapElevatedValue(instance.getValue(), get);
    };

    if ("write" in baseAtom) {
        return atom(read, (get, set, ...args: TArgs): TResult => {
            return set(baseAtom, ...args);
        });
    }

    return atom(read);
}

export type AtomWithElevatedSettingConsumerOptions<TElevatedValue, TElevatedConstraints> = {
    definition: ElevatedSettingDefinition<TElevatedValue, TElevatedConstraints>;

    getConstraints: (get: Getter) => TElevatedConstraints;

    consumerId?: string;
};

export function atomWithElevatedSettingConsumer<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TElevatedValue,
    TElevatedConstraints,
>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    elevatedSettingsServiceAtom: Atom<ElevatedSettingsService>,
    options: AtomWithElevatedSettingConsumerOptions<TElevatedValue, TElevatedConstraints>,
) {
    const instanceAtom = makeElevatedSettingInstanceAtom(elevatedSettingsServiceAtom, options.definition);

    const consumerId = options.consumerId ?? v4();

    let connectedInstance: ElevatedSettingInstance<TElevatedValue, TElevatedConstraints> | undefined;

    let consumerHandle: ElevatedSettingConsumerHandle<TElevatedConstraints> | undefined;

    // Owns registration/unregistration only.
    const connectionEffect = atomEffect((get) => {
        const instance = get(instanceAtom);

        if (!instance) {
            return;
        }

        const handle = instance.registerConsumer(consumerId);

        connectedInstance = instance;
        consumerHandle = handle;

        // Initial contribution, without making this effect depend
        // on the atoms used to calculate the constraints.
        handle.updateConstraints(options.getConstraints(get.peek));

        return () => {
            handle.unregister();

            if (consumerHandle === handle) {
                consumerHandle = undefined;
                connectedInstance = undefined;
            }
        };
    });

    // Reacts only to constraint dependencies and updates the
    // already-existing registration.
    const constraintsEffect = atomEffect((get) => {
        const instance = get(instanceAtom);
        const constraints = options.getConstraints(get);

        if (!instance || instance !== connectedInstance || !consumerHandle) {
            return;
        }

        consumerHandle.updateConstraints(constraints);
    });

    const read = (get: Getter): TAtomValue => {
        get(connectionEffect);
        get(constraintsEffect);

        return get(baseAtom);
    };

    if ("write" in baseAtom) {
        return atom(read, (get, set, ...args: TArgs): TResult => {
            return set(baseAtom, ...args);
        });
    }

    return atom(read);
}

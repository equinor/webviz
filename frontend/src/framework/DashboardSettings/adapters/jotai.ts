import type { Atom, Getter, WritableAtom } from "jotai";
import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { v4 } from "uuid";

import { isPersistableFixableValueValid, Source, type PersistableFixableAtom } from "@framework/utils/atomUtils";

import type { DashboardSettingDefinition } from "../DashboardSettingDefinition";
import {
    DashboardSettingInstanceTopic,
    type DashboardSettingConstraintSourceHandle,
    type DashboardSettingInstance,
} from "../DashboardSettingInstance";
import { DashboardSettingsServiceTopic } from "../DashboardSettingsService";
import { DashboardSettingsServiceAtom } from "../DashboardSettingsServiceAtom";

// Module atoms are shared by every instance of a module, each of them with its own store - so all
// connection state below lives in atoms (one value per store), never in closure variables.

type InstanceAtom<TValue, TConstraints> = Atom<DashboardSettingInstance<TValue, TConstraints> | null>;

function makeDashboardSettingInstanceAtom<TValue, TConstraints>(
    definition: DashboardSettingDefinition<TValue, TConstraints>,
): InstanceAtom<TValue, TConstraints> {
    const revisionAtom = atom(0);

    const subscriptionEffect = atomEffect((get, set) => {
        const service = get(DashboardSettingsServiceAtom);
        if (!service) {
            return;
        }

        return service.getPublishSubscribeDelegate().subscribe(DashboardSettingsServiceTopic.ACTIVE_SETTINGS, () => {
            set(revisionAtom, (revision) => revision + 1);
        });
    });

    return atom((get) => {
        get(subscriptionEffect);
        get(revisionAtom);

        return get(DashboardSettingsServiceAtom)?.getSetting(definition) ?? null;
    });
}

function makeDashboardValueAtom<TValue, TConstraints>(
    instanceAtom: InstanceAtom<TValue, TConstraints>,
): Atom<TValue | undefined> {
    const revisionAtom = atom(0);

    const subscriptionEffect = atomEffect((get, set) => {
        const instance = get(instanceAtom);
        if (!instance) {
            return;
        }

        return instance.getPublishSubscribeDelegate().subscribe(DashboardSettingInstanceTopic.VALUE, () => {
            set(revisionAtom, (revision) => revision + 1);
        });
    });

    return atom((get) => {
        get(subscriptionEffect);
        get(revisionAtom);

        return get(instanceAtom)?.getValue();
    });
}

function wrapAtom<TAtomValue, TArgs extends unknown[], TResult>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    read: (get: Getter) => TAtomValue,
): Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult> {
    if ("write" in baseAtom) {
        // Writes always go to the base atom - i.e. the consumer's own local value, which is kept while
        // the dashboard setting controls it and used again when it stops.
        return atom(read, (_get, set, ...args: TArgs): TResult => set(baseAtom, ...args));
    }

    return atom(read);
}

function makeOverrideAtom<TAtomValue, TArgs extends unknown[], TResult, TDashboardValue, TDashboardConstraints>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    instanceAtom: InstanceAtom<TDashboardValue, TDashboardConstraints>,
    mapDashboardValue: (dashboardValue: TDashboardValue, get: Getter) => TAtomValue,
) {
    const dashboardValueAtom = makeDashboardValueAtom(instanceAtom);

    return wrapAtom(baseAtom, (get) => {
        // Always read, even while dashboard - otherwise the base atom (and any effect it mounts, e.g. a
        // consumer's registration or a persistableFixableAtom's lifecycle) would be unmounted.
        const baseValue = get(baseAtom);

        if (!get(instanceAtom)) {
            return baseValue;
        }

        return mapDashboardValue(get(dashboardValueAtom) as TDashboardValue, get);
    });
}

function makeConsumerAtom<TAtomValue, TArgs extends unknown[], TResult, TDashboardValue, TDashboardConstraints>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    instanceAtom: InstanceAtom<TDashboardValue, TDashboardConstraints>,
    options: AtomWithDashboardSettingConsumerOptions<TDashboardValue, TDashboardConstraints>,
) {
    const handleAtom = atom<DashboardSettingConstraintSourceHandle<TDashboardConstraints> | null>(null);

    // Owns the registration only - re-runs when the dashboard setting becomes active or is removed.
    const connectionEffect = atomEffect((get, set) => {
        const instance = get(instanceAtom);
        if (!instance) {
            return;
        }

        const handle = instance.registerConstraintSource(v4());
        set(handleAtom, handle);

        return () => {
            handle.unregister();
            set(handleAtom, null);
        };
    });

    // Re-runs when the consumer's constraints (or loading state) change.
    const contributionEffect = atomEffect((get) => {
        const handle = get(handleAtom);
        if (!handle) {
            return;
        }

        if (options.isLoading?.(get)) {
            handle.markPending();
            return;
        }

        const constraints = options.getConstraints(get);
        if (constraints === null) {
            handle.clearConstraints();
        } else {
            handle.updateConstraints(constraints);
        }
    });

    return wrapAtom(baseAtom, (get) => {
        get(connectionEffect);
        get(contributionEffect);

        return get(baseAtom);
    });
}

export type AtomWithDashboardSettingOverrideOptions<TAtomValue, TDashboardValue, TDashboardConstraints> = {
    definition: DashboardSettingDefinition<TDashboardValue, TDashboardConstraints>;
    // Maps the dashboard value onto the base atom's value shape (e.g. a `PersistableFixableRead`).
    mapDashboardValue: (dashboardValue: TDashboardValue, get: Getter) => TAtomValue;
};

/**
 * Reads the dashboard value (mapped onto the base atom's shape) while the dashboard setting is active,
 * and the base atom's value otherwise.
 *
 * Keep persisting the base atom rather than the wrapped one - the module's own value is what should be
 * restored, the dashboard value is persisted by the dashboard.
 */
export function atomWithDashboardSettingOverride<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TDashboardValue,
    TDashboardConstraints,
>(
    baseAtom: WritableAtom<TAtomValue, TArgs, TResult>,
    options: AtomWithDashboardSettingOverrideOptions<TAtomValue, TDashboardValue, TDashboardConstraints>,
): WritableAtom<TAtomValue, TArgs, TResult>;
export function atomWithDashboardSettingOverride<TAtomValue, TDashboardValue, TDashboardConstraints>(
    baseAtom: Atom<TAtomValue>,
    options: AtomWithDashboardSettingOverrideOptions<TAtomValue, TDashboardValue, TDashboardConstraints>,
): Atom<TAtomValue>;
export function atomWithDashboardSettingOverride<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TDashboardValue,
    TDashboardConstraints,
>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    options: AtomWithDashboardSettingOverrideOptions<TAtomValue, TDashboardValue, TDashboardConstraints>,
) {
    return makeOverrideAtom(
        baseAtom,
        makeDashboardSettingInstanceAtom(options.definition),
        options.mapDashboardValue,
    );
}

export type AtomWithDashboardSettingConsumerOptions<TDashboardValue, TDashboardConstraints> = {
    definition: DashboardSettingDefinition<TDashboardValue, TDashboardConstraints>;
    // The options this consumer offers - `null` when it has no opinion.
    getConstraints: (get: Getter) => TDashboardConstraints | null;
    // While true, the consumer is marked as pending - its options are being recomputed.
    isLoading?: (get: Getter) => boolean;
};

/**
 * Contributes constraints to a dashboard setting while it is active on the dashboard and the
 * returned atom is mounted. Reads (and writes) are passed through to the base atom unchanged.
 */
export function atomWithDashboardSettingConsumer<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TDashboardValue,
    TDashboardConstraints,
>(
    baseAtom: WritableAtom<TAtomValue, TArgs, TResult>,
    options: AtomWithDashboardSettingConsumerOptions<TDashboardValue, TDashboardConstraints>,
): WritableAtom<TAtomValue, TArgs, TResult>;
export function atomWithDashboardSettingConsumer<TAtomValue, TDashboardValue, TDashboardConstraints>(
    baseAtom: Atom<TAtomValue>,
    options: AtomWithDashboardSettingConsumerOptions<TDashboardValue, TDashboardConstraints>,
): Atom<TAtomValue>;
export function atomWithDashboardSettingConsumer<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TDashboardValue,
    TDashboardConstraints,
>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    options: AtomWithDashboardSettingConsumerOptions<TDashboardValue, TDashboardConstraints>,
) {
    return makeConsumerAtom(baseAtom, makeDashboardSettingInstanceAtom(options.definition), options);
}

export type MakeDashboardSettingAtomsOptions<TAtomValue, TDashboardValue, TDashboardConstraints> =
    AtomWithDashboardSettingOverrideOptions<TAtomValue, TDashboardValue, TDashboardConstraints> &
        AtomWithDashboardSettingConsumerOptions<TDashboardValue, TDashboardConstraints>;

export type DashboardSettingAtoms<TValueAtom> = {
    // Reads like the base atom: the dashboard value (mapped onto the base atom's shape) while the dashboard
    // setting is active, the base atom's value otherwise. Contributes the module's options while mounted.
    valueAtom: TValueAtom;
    // Whether the dashboard setting is active for the dashboard this module belongs to.
    isDashboardControlledAtom: Atom<boolean>;
};

/**
 * Makes a module setting atom follow a dashboard setting: `valueAtom` contributes the module's options
 * to it and reads the dashboard value while it is active. `isDashboardControlledAtom` indicates whether
 * the module setting is controlled. Writes go to the base atom - the module's own value, used again when
 * the dashboard setting is no longer active.
 *
 * Keep persisting the base atom rather than `valueAtom` - the dashboard value is persisted by the
 * dashboard.
 */
export function makeDashboardSettingAtoms<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TDashboardValue,
    TDashboardConstraints,
>(
    baseAtom: WritableAtom<TAtomValue, TArgs, TResult>,
    options: MakeDashboardSettingAtomsOptions<TAtomValue, TDashboardValue, TDashboardConstraints>,
): DashboardSettingAtoms<WritableAtom<TAtomValue, TArgs, TResult>>;
export function makeDashboardSettingAtoms<TAtomValue, TDashboardValue, TDashboardConstraints>(
    baseAtom: Atom<TAtomValue>,
    options: MakeDashboardSettingAtomsOptions<TAtomValue, TDashboardValue, TDashboardConstraints>,
): DashboardSettingAtoms<Atom<TAtomValue>>;
export function makeDashboardSettingAtoms<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TDashboardValue,
    TDashboardConstraints,
>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    options: MakeDashboardSettingAtomsOptions<TAtomValue, TDashboardValue, TDashboardConstraints>,
): DashboardSettingAtoms<Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>> {
    // Shared, so all three only subscribe to the dashboard's active settings once per store.
    const instanceAtom = makeDashboardSettingInstanceAtom(options.definition);

    const consumerAtom = makeConsumerAtom(baseAtom, instanceAtom, options);

    return {
        valueAtom: makeOverrideAtom(consumerAtom, instanceAtom, options.mapDashboardValue),
        isDashboardControlledAtom: atom((get) => get(instanceAtom) !== null),
    };
}

type MapDashboardValueToPersistableFixableValue<TValue, TDashboardValue> = (
    dashboardValue: TDashboardValue,
    get: Getter,
) => TValue;

// Optional when the dashboard value already has the module's value type.
type DashboardPersistableFixableValueMapping<TValue, TDashboardValue> = [TDashboardValue] extends [TValue]
    ? { mapDashboardValue?: MapDashboardValueToPersistableFixableValue<TValue, TDashboardValue> }
    : { mapDashboardValue: MapDashboardValueToPersistableFixableValue<TValue, TDashboardValue> };

export type MakeDashboardPersistableFixableAtomsOptions<TValue, TDashboardValue, TDashboardConstraints> = {
    definition: DashboardSettingDefinition<TDashboardValue, TDashboardConstraints>;
    // The options this module offers - `null` when it has no opinion. Not called while the base atom's
    // dependencies are loading (the module is pending then), blocked or failed (no opinion). Leave out
    // for a setting that only follows the dashboard value without contributing options.
    getConstraints?: (get: Getter) => TDashboardConstraints | null;
} & DashboardPersistableFixableValueMapping<TValue, TDashboardValue>;

/**
 * `makeDashboardSettingAtoms` for a `persistableFixableAtom`. The base atom's own state does the rest:
 * the module is pending while the atom's dependencies are loading, and the dashboard value is validated
 * with the atom's own `isValidFunction`. `mapDashboardValue` only maps the value itself.
 *
 * Keep persisting the base atom rather than `valueAtom` - the dashboard value is persisted by the
 * dashboard.
 */
export function makeDashboardPersistableFixableAtoms<TValue, TDashboardValue, TDashboardConstraints>(
    baseAtom: PersistableFixableAtom<TValue>,
    options: MakeDashboardPersistableFixableAtomsOptions<TValue, TDashboardValue, TDashboardConstraints>,
): DashboardSettingAtoms<PersistableFixableAtom<TValue>> {
    const instanceAtom = makeDashboardSettingInstanceAtom(options.definition);

    const { getConstraints } = options;
    const sourceAtom = getConstraints
        ? makeConsumerAtom(baseAtom, instanceAtom, {
              definition: options.definition,
              isLoading: (get) => get(baseAtom).isLoading,
              getConstraints: (get) => {
                  const { isBlocked, depsHaveError } = get(baseAtom);
                  return isBlocked || depsHaveError ? null : getConstraints(get);
              },
          })
        : baseAtom;

    // The conditional mapping option can't be narrowed for generic value types here.
    const mapDashboardValue =
        (options as { mapDashboardValue?: MapDashboardValueToPersistableFixableValue<TValue, TDashboardValue> })
            .mapDashboardValue ?? ((dashboardValue: TDashboardValue) => dashboardValue as unknown as TValue);

    const valueAtom = makeOverrideAtom(sourceAtom, instanceAtom, (dashboardValue, get) => {
        const { isLoading, isBlocked, depsHaveError } = get(baseAtom);
        const value = mapDashboardValue(dashboardValue, get);

        return {
            value,
            isValidInContext: isPersistableFixableValueValid(baseAtom, get, value),
            isLoading,
            isBlocked,
            depsHaveError,
            _source: Source.USER,
        };
    });

    return {
        valueAtom: valueAtom as PersistableFixableAtom<TValue>,
        isDashboardControlledAtom: atom((get) => get(instanceAtom) !== null),
    };
}

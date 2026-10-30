import { isEqual } from "lodash-es";

import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import type { DashboardSettingDefinition } from "./DashboardSettingDefinition";

export enum DashboardSettingInstanceTopic {
    VALUE = "VALUE",
    VALUE_SOURCE = "VALUE_SOURCE",
    IS_VALUE_VALID = "IS_VALUE_VALID",
    CONSTRAINTS = "CONSTRAINTS",
    IS_SETTLING = "IS_SETTLING",
    SOURCE_COUNT = "SOURCE_COUNT",
}

// Where the current value came from. Follows the same fix-up strategy as `persistableFixableAtom` and
// DPF settings: an invalid value is never replaced automatically once the setting has settled - it is
// kept and reported via `IS_VALUE_VALID` until the user picks a valid one.
export enum DashboardSettingValueSource {
    // Chosen by the user or still the default. The default gets a one-time fixup the first time the
    // setting settles, so a newly registered dashboard setting lands on a sensible value.
    USER = "USER",
    // Restored from a persisted session or applied by a template. Never fixed up, not even on the first
    // settle - it turns into a `USER` value as soon as it is valid in the current context.
    RESTORED = "RESTORED",
}

// How the constraint sources' contributions are combined. Decided by the instance - the sources only
// hand in the options they offer.
export enum DashboardSettingCombineStrategy {
    // Any value at least one source offers - the broadest selection.
    UNION = "union",
    // Only values every source offers.
    INTERSECTION = "intersection",
}

export type DashboardSettingInstanceTopicPayloads<TValue, TConstraints> = {
    [DashboardSettingInstanceTopic.VALUE]: TValue;
    [DashboardSettingInstanceTopic.VALUE_SOURCE]: DashboardSettingValueSource;
    [DashboardSettingInstanceTopic.IS_VALUE_VALID]: boolean;
    [DashboardSettingInstanceTopic.CONSTRAINTS]: TConstraints;
    [DashboardSettingInstanceTopic.IS_SETTLING]: boolean;
    [DashboardSettingInstanceTopic.SOURCE_COUNT]: number;
};

// A constraint source is anything contributing options to a dashboard setting - currently the consumer
// adapters (modules, DPF settings), which also read its value. The instance doesn't care which kind.
export type DashboardSettingConstraintSourceHandle<TConstraints> = {
    // The source has settled, and these are the options it contributes.
    updateConstraints(constraints: TConstraints): void;
    // The source is recomputing its options (e.g. an upstream value changed and data is being fetched).
    // Its last contribution keeps counting, but the setting isn't considered settled until it is done.
    markPending(): void;
    // The source currently has no opinion - its contribution is withdrawn without unregistering.
    clearConstraints(): void;
    unregister(): void;
};

export type DashboardSettingInstanceOptions<TValue, TConstraints> = {
    value?: TValue;
    valueSource?: DashboardSettingValueSource;
    constraintOverride?: TConstraints;
    // Defaults to `UNION` - the only strategy in use for now.
    combineStrategy?: DashboardSettingCombineStrategy;
};

type ConstraintSourceState<TConstraints> = {
    constraints: TConstraints | null;
    isPending: boolean;
};

export class DashboardSettingInstance<TValue, TConstraints> implements PublishSubscribe<
    DashboardSettingInstanceTopicPayloads<TValue, TConstraints>
> {
    private readonly _definition: DashboardSettingDefinition<TValue, TConstraints>;
    private readonly _combineStrategy: DashboardSettingCombineStrategy;

    private _value: TValue;
    private _valueSource: DashboardSettingValueSource;
    private _isValueValid = true;

    private readonly _constraintSources = new Map<string, ConstraintSourceState<TConstraints>>();

    // Forces the aggregated constraints to a fixed set (e.g. from a template), bypassing whatever the
    // sources contribute until cleared again.
    private _constraintOverride: TConstraints | null;

    private _aggregatedConstraints: TConstraints;
    private _isSettling = false;

    // One-way latch: becomes true the first time no source is pending and constraint information is
    // available. Gates the one-time fixup of the default value.
    private _hasSettled = false;

    private _isDestroyed = false;

    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<
        DashboardSettingInstanceTopicPayloads<TValue, TConstraints>
    >();

    constructor(
        definition: DashboardSettingDefinition<TValue, TConstraints>,
        options?: DashboardSettingInstanceOptions<TValue, TConstraints>,
    ) {
        this._definition = definition;
        this._combineStrategy = options?.combineStrategy ?? DashboardSettingCombineStrategy.UNION;
        this._value =options && "value" in options ? (options.value as TValue) : definition.defaultValue;
        this._valueSource = options?.valueSource ?? DashboardSettingValueSource.USER;
        this._constraintOverride = options?.constraintOverride ?? null;
        this._aggregatedConstraints = this._constraintOverride ?? definition.initialConstraints;
        this._isValueValid = this.computeIsValueValid();
    }

    getDefinition(): DashboardSettingDefinition<TValue, TConstraints> {
        return this._definition;
    }

    getValue(): TValue {
        return this._value;
    }

    getValueSource(): DashboardSettingValueSource {
        return this._valueSource;
    }

    // Validity is only known once some source has contributed constraints (or an override is set) -
    // until then the value is considered valid rather than flagged against the empty initial constraints.
    isValueValid(): boolean {
        return this._isValueValid;
    }

    getConstraints(): TConstraints {
        return this._aggregatedConstraints;
    }

    isSettling(): boolean {
        return this._isSettling;
    }

    getSourceCount(): number {
        return this._constraintSources.size;
    }

    getConstraintOverride(): TConstraints | null {
        return this._constraintOverride;
    }

    setValue(value: TValue, valueSource: DashboardSettingValueSource = DashboardSettingValueSource.USER): void {
        this.setValueSource(valueSource);
        this.applyValue(value);

        if (valueSource === DashboardSettingValueSource.RESTORED) {
            // A restored value that already fits the current context is a regular value from here on.
            this.maybePromoteRestoredValue();
        }
    }

    // Manual repair of an invalid value, regardless of its source - the counterpart of
    // `persistableFixableAtom`'s `FIXUP` command. A no-op while sources are pending or the value is valid.
    fixupValue(): void {
        if (!this.isSettled() || this._definition.isValueValid(this._value, this._aggregatedConstraints)) {
            return;
        }

        this.setValueSource(DashboardSettingValueSource.USER);
        this.applyValue(this._definition.fixupValue(this._value, this._aggregatedConstraints));
    }

    // Pass `null` to go back to aggregating the sources' contributions.
    setConstraintOverride(override: TConstraints | null): void {
        if (isEqual(this._constraintOverride, override)) {
            return;
        }

        this._constraintOverride = override;
        this.recompute();
    }

    registerConstraintSource(sourceId: string): DashboardSettingConstraintSourceHandle<TConstraints> {
        if (this._constraintSources.has(sourceId)) {
            throw new Error(
                `Constraint source with ID '${sourceId}' is already registered for dashboard setting '${this._definition.key}'.`,
            );
        }

        const state: ConstraintSourceState<TConstraints> = {
            constraints: null,
            isPending: false,
        };
        this._constraintSources.set(sourceId, state);
        this._publishSubscribeDelegate.notifySubscribers(DashboardSettingInstanceTopic.SOURCE_COUNT);

        let registered = true;

        const assertRegistered = () => {
            if (!registered) {
                throw new Error(
                    `Constraint source with ID '${sourceId}' has already been unregistered from dashboard setting '${this._definition.key}'.`,
                );
            }
        };

        // Calls arriving after the instance has been removed from the dashboard are ignored - adapters
        // learn about the removal asynchronously and may still be wrapping up.
        return {
            updateConstraints: (constraints: TConstraints) => {
                assertRegistered();
                if (this._isDestroyed) {
                    return;
                }
                state.constraints = constraints;
                state.isPending = false;
                this.recompute();
            },
            markPending: () => {
                assertRegistered();
                if (this._isDestroyed || state.isPending) {
                    return;
                }
                state.isPending = true;
                this.recompute();
            },
            clearConstraints: () => {
                assertRegistered();
                if (this._isDestroyed) {
                    return;
                }
                state.constraints = null;
                state.isPending = false;
                this.recompute();
            },
            unregister: () => {
                if (!registered) {
                    return;
                }
                registered = false;

                if (this._isDestroyed) {
                    return;
                }
                this._constraintSources.delete(sourceId);
                this._publishSubscribeDelegate.notifySubscribers(DashboardSettingInstanceTopic.SOURCE_COUNT);
                this.recompute();
            },
        };
    }

    beforeDestroy(): void {
        this._isDestroyed = true;
        this._constraintSources.clear();
    }

    makeSnapshotGetter<TTopic extends DashboardSettingInstanceTopic>(
        topic: TTopic,
    ): () => DashboardSettingInstanceTopicPayloads<TValue, TConstraints>[TTopic] {
        const snapshotGetter = (): any => {
            switch (topic) {
                case DashboardSettingInstanceTopic.VALUE:
                    return this._value;
                case DashboardSettingInstanceTopic.VALUE_SOURCE:
                    return this._valueSource;
                case DashboardSettingInstanceTopic.IS_VALUE_VALID:
                    return this._isValueValid;
                case DashboardSettingInstanceTopic.CONSTRAINTS:
                    return this._aggregatedConstraints;
                case DashboardSettingInstanceTopic.IS_SETTLING:
                    return this._isSettling;
                case DashboardSettingInstanceTopic.SOURCE_COUNT:
                    return this._constraintSources.size;
                default:
                    throw new Error(`Unknown topic: ${topic}`);
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DashboardSettingInstanceTopicPayloads<TValue, TConstraints>> {
        return this._publishSubscribeDelegate;
    }

    private hasConstraintInformation(): boolean {
        if (this._constraintOverride !== null) {
            return true;
        }

        for (const state of this._constraintSources.values()) {
            if (state.constraints !== null) {
                return true;
            }
        }

        return false;
    }

    // All contributions, combined with the instance's strategy. Sources without an opinion are skipped.
    private computeAggregatedConstraints(): TConstraints {
        if (this._constraintOverride !== null) {
            return this._constraintOverride;
        }

        const contributions: TConstraints[] = [];

        for (const state of this._constraintSources.values()) {
            if (state.constraints !== null) {
                contributions.push(state.constraints);
            }
        }

        if (contributions.length === 0) {
            return this._definition.initialConstraints;
        }

        if (this._combineStrategy === DashboardSettingCombineStrategy.INTERSECTION) {
            return contributions.reduce((acc, current) => this._definition.intersectConstraints(acc, current));
        }

        return contributions.reduce((acc, current) => this._definition.unionConstraints(acc, current));
    }

    private computeIsSettling(): boolean {
        if (this._constraintOverride !== null) {
            return false;
        }

        for (const state of this._constraintSources.values()) {
            if (state.isPending) {
                return true;
            }
        }

        return false;
    }

    private computeIsValueValid(): boolean {
        if (!this.hasConstraintInformation()) {
            return true;
        }

        return this._definition.isValueValid(this._value, this._aggregatedConstraints);
    }

    private recompute(): void {
        const newConstraints = this.computeAggregatedConstraints();
        const newIsSettling = this.computeIsSettling();

        const constraintsChanged = !isEqual(newConstraints, this._aggregatedConstraints);
        const isSettlingChanged = newIsSettling !== this._isSettling;

        if (constraintsChanged) {
            this._aggregatedConstraints = newConstraints;
            this._publishSubscribeDelegate.notifySubscribers(DashboardSettingInstanceTopic.CONSTRAINTS);
        }

        if (isSettlingChanged) {
            this._isSettling = newIsSettling;
            this._publishSubscribeDelegate.notifySubscribers(DashboardSettingInstanceTopic.IS_SETTLING);
        }

        this.updateIsValueValid();

        if (constraintsChanged || isSettlingChanged) {
            this.applyValueRule();
        }
    }

    // Settled = no source is pending, and there is something to validate against. A pending source may
    // still change the constraints, so nothing is decided about the value before that.
    private isSettled(): boolean {
        return !this._isSettling && this.hasConstraintInformation();
    }

    private applyValueRule(): void {
        if (!this.isSettled()) {
            return;
        }

        if (!this._hasSettled) {
            this._hasSettled = true;

            // One-time fixup so a newly registered dashboard setting lands on a sensible value. Never applied
            // again afterwards - from here on an invalid value is kept and reported instead.
            if (
                this._valueSource === DashboardSettingValueSource.USER &&
                !this._definition.isValueValid(this._value, this._aggregatedConstraints)
            ) {
                this.applyValue(this._definition.fixupValue(this._value, this._aggregatedConstraints));
            }
        }

        this.maybePromoteRestoredValue();
    }

    private maybePromoteRestoredValue(): void {
        if (this._valueSource !== DashboardSettingValueSource.RESTORED || !this.isSettled()) {
            return;
        }

        if (this._definition.isValueValid(this._value, this._aggregatedConstraints)) {
            this.setValueSource(DashboardSettingValueSource.USER);
        }
    }

    private applyValue(value: TValue): void {
        if (isEqual(this._value, value)) {
            return;
        }

        this._value = value;
        this._publishSubscribeDelegate.notifySubscribers(DashboardSettingInstanceTopic.VALUE);

        this.updateIsValueValid();
    }

    private setValueSource(valueSource: DashboardSettingValueSource): void {
        if (this._valueSource === valueSource) {
            return;
        }

        this._valueSource = valueSource;
        this._publishSubscribeDelegate.notifySubscribers(DashboardSettingInstanceTopic.VALUE_SOURCE);
    }

    private updateIsValueValid(): void {
        const isValueValid = this.computeIsValueValid();
        if (isValueValid === this._isValueValid) {
            return;
        }

        this._isValueValid = isValueValid;
        this._publishSubscribeDelegate.notifySubscribers(DashboardSettingInstanceTopic.IS_VALUE_VALID);
    }
}

import { isEqual } from "lodash-es";

import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

import type { ElevatedSettingDefinition } from "./ElevatedSettingDefinition";

export enum ElevatedSettingInstanceTopic {
    VALUE = "VALUE",
    CONSTRAINTS = "CONSTRAINTS",
}

export type ElevatedSettingInstanceTopicPayloads<TValue, TConstraints> = {
    [ElevatedSettingInstanceTopic.VALUE]: TValue;
    [ElevatedSettingInstanceTopic.CONSTRAINTS]: TConstraints;
};

export type ElevatedSettingConsumerHandle<TConstraints> = {
    updateConstraints(constraints: TConstraints): void;
    unregister(): void;
};

export type ElevatedSettingInstanceOptions<TValue, TConstraints> = {
    // Seeds the value/constraint override atomically at construction. `ElevatedSettingsService.
    // addSetting` synchronously notifies already-connected consumers before returning - seeding
    // afterward via `setValue`/`setConstraintOverride` leaves a window where a consumer can react to
    // the instance's plain defaults (e.g. contribute its own constraints into a union) before the
    // caller's intended override is applied.
    value?: TValue;
    constraintOverride?: TConstraints;
};

export class ElevatedSettingInstance<TValue, TConstraints> {
    private _value: TValue;

    private readonly _definition: ElevatedSettingDefinition<TValue, TConstraints>;

    private readonly _consumerConstraints = new Map<string, TConstraints>();

    // Set via `setConstraintOverride` to force the aggregated constraints to a fixed set (e.g. a
    // dashboard-level filter), bypassing whatever consumers contribute until cleared again.
    private _constraintOverride: TConstraints | null = null;

    private _aggregatedConstraints: TConstraints;

    // Whether `_definition.fixupValue` has already run once. Guards it to the first real constraints
    // change only - see `RegisterElevatedSettingOptions.fixupValue`.
    private _hasAppliedInitialFixup = false;

    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<
        ElevatedSettingInstanceTopicPayloads<TValue, TConstraints>
    >();

    constructor(
        definition: ElevatedSettingDefinition<TValue, TConstraints>,
        options?: ElevatedSettingInstanceOptions<TValue, TConstraints>,
    ) {
        this._definition = definition;
        this._value = options?.value ?? definition.defaultValue;
        this._constraintOverride = options?.constraintOverride ?? null;
        this._aggregatedConstraints = this._constraintOverride ?? definition.initialConstraints;
    }

    getDefinition(): ElevatedSettingDefinition<TValue, TConstraints> {
        return this._definition;
    }

    isValueValid(value: TValue): boolean {
        return this._definition.isValueValid(value, this._aggregatedConstraints);
    }

    getValue(): TValue {
        return this._value;
    }

    setValue(value: TValue): void {
        if (isEqual(this._value, value)) {
            return;
        }

        this._value = value;

        this._publishSubscribeDelegate.notifySubscribers(ElevatedSettingInstanceTopic.VALUE);
    }

    getConstraints(): TConstraints {
        return this._aggregatedConstraints;
    }

    getConstraintOverride(): TConstraints | null {
        return this._constraintOverride;
    }

    // Forces the aggregated constraints to `override` regardless of what consumers contribute, like
    // a fixed filter - pass `null` to go back to combining consumer contributions normally.
    setConstraintOverride(override: TConstraints | null): void {
        if (isEqual(this._constraintOverride, override)) {
            return;
        }

        this._constraintOverride = override;

        this.recomputeConstraints();
    }

    registerConsumer(consumerId: string): ElevatedSettingConsumerHandle<TConstraints> {
        if (this._consumerConstraints.has(consumerId)) {
            throw new Error(
                `Consumer with ID '${consumerId}' is already registered for elevated setting '${this._definition.key}'.`,
            );
        }

        let registered = true;

        return {
            updateConstraints: (constraints: TConstraints) => {
                if (!registered) {
                    throw new Error(
                        `Consumer with ID '${consumerId}' has already been unregistered for elevated setting '${this._definition.key}'.`,
                    );
                }

                this._consumerConstraints.set(consumerId, constraints);

                this.recomputeConstraints();
            },
            unregister: () => {
                if (!registered) {
                    return;
                }

                registered = false;

                this._consumerConstraints.delete(consumerId);
                this.recomputeConstraints();
            },
        };
    }

    makeSnapshotGetter<TTopic extends ElevatedSettingInstanceTopic>(
        topic: TTopic,
    ): () => ElevatedSettingInstanceTopicPayloads<TValue, TConstraints>[TTopic] {
        return () => {
            switch (topic) {
                case ElevatedSettingInstanceTopic.VALUE:
                    return this.getValue() as ElevatedSettingInstanceTopicPayloads<TValue, TConstraints>[TTopic];
                case ElevatedSettingInstanceTopic.CONSTRAINTS:
                    return this.getConstraints() as ElevatedSettingInstanceTopicPayloads<TValue, TConstraints>[TTopic];
                default:
                    throw new Error(`Unknown topic: ${topic}`);
            }
        };
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<
        ElevatedSettingInstanceTopicPayloads<TValue, TConstraints>
    > {
        return this._publishSubscribeDelegate;
    }

    private recomputeConstraints(): void {
        let newConstraints: TConstraints;

        if (this._constraintOverride !== null) {
            newConstraints = this._constraintOverride;
        } else {
            const contributions = [...this._consumerConstraints.values()];

            newConstraints = this._definition.initialConstraints;
            if (contributions.length > 0) {
                newConstraints = contributions
                    .slice(1)
                    .reduce(
                        (accumulator, current) => this._definition.combineConstraints(accumulator, current),
                        contributions[0],
                    );
            }
        }

        if (isEqual(newConstraints, this._aggregatedConstraints)) {
            return;
        }

        this._aggregatedConstraints = newConstraints;

        this._publishSubscribeDelegate.notifySubscribers(ElevatedSettingInstanceTopic.CONSTRAINTS);

        if (!this._hasAppliedInitialFixup) {
            this._hasAppliedInitialFixup = true;
            this.setValue(this._definition.fixupValue(this._value, newConstraints));
        }
    }
}

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

export class ElevatedSettingInstance<TValue, TConstraints> {
    private _value: TValue;

    private readonly _definition: ElevatedSettingDefinition<TValue, TConstraints>;

    private readonly _consumerConstraints = new Map<string, TConstraints>();

    private _aggregatedConstraints: TConstraints;

    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<
        ElevatedSettingInstanceTopicPayloads<TValue, TConstraints>
    >();

    constructor(definition: ElevatedSettingDefinition<TValue, TConstraints>) {
        this._definition = definition;
        this._value = definition.defaultValue;
        this._aggregatedConstraints = definition.initialConstraints;
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
        const contributions = [...this._consumerConstraints.values()];

        let newConstraints = this._definition.initialConstraints;
        if (contributions.length > 0) {
            newConstraints = contributions
                .slice(1)
                .reduce(
                    (accumulator, current) => this._definition.combineConstraints(accumulator, current),
                    contributions[0],
                );
        }

        if (isEqual(newConstraints, this._aggregatedConstraints)) {
            return;
        }

        this._aggregatedConstraints = newConstraints;

        this._publishSubscribeDelegate.notifySubscribers(ElevatedSettingInstanceTopic.CONSTRAINTS);
    }
}

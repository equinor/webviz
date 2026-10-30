import type React from "react";

export type CombineConstraintsFunction<TConstraints> = (a: TConstraints, b: TConstraints) => TConstraints;

// Any value/constraint shape is supported. Array-shaped constraints get set-like union/intersection
// (compared with `===`) for free, and settings without constraints (`null`/`undefined`, e.g. a boolean
// toggle or a color scale) need no combiners either. Other shapes, e.g. a `{ min, max }` range, must
// provide both combiners.
type DashboardSettingCombineOptions<TConstraints> = [TConstraints] extends [readonly unknown[] | null | undefined]
    ? {
          unionConstraints?: CombineConstraintsFunction<TConstraints>;
          intersectConstraints?: CombineConstraintsFunction<TConstraints>;
      }
    : {
          unionConstraints: CombineConstraintsFunction<TConstraints>;
          intersectConstraints: CombineConstraintsFunction<TConstraints>;
      };

export type DashboardSettingComponentProps<TValue, TConstraints> = {
    value: TValue;
    constraints: TConstraints;
    isValueValid: boolean;
    // True while at least one constraint source is recomputing its contribution.
    isSettling: boolean;
    onValueChange: (value: TValue) => void;
};

export type DashboardSettingOptions<TValue, TConstraints> = {
    key: string;

    label: string;

    defaultValue: TValue;

    initialConstraints: TConstraints;

    isValueValid?: (value: TValue, constraints: TConstraints) => boolean;

    // Provides a valid replacement for an invalid value. Only used for the one-time fixup of the default
    // value when the setting first settles, and for an explicit `DashboardSettingInstance.fixupValue()`
    // - an invalid value is otherwise kept and reported, like in `persistableFixableAtom`.
    fixupValue?: (value: TValue, constraints: TConstraints) => TValue;

    // Only needed when `TValue` doesn't round-trip through JSON as-is.
    serializeValue?: (value: TValue) => unknown;
    deserializeValue?: (serializedValue: unknown) => TValue;

    // The control rendered for the setting in the dashboard settings panel.
    Component: React.ComponentType<DashboardSettingComponentProps<TValue, TConstraints>>;
} & DashboardSettingCombineOptions<TConstraints>;

function unionDefaultConstraints<TConstraints>(a: TConstraints, b: TConstraints): TConstraints {
    if (a === null || a === undefined) {
        return b;
    }
    if (b === null || b === undefined) {
        return a;
    }
    return Array.from(new Set([...(a as readonly unknown[]), ...(b as readonly unknown[])])) as TConstraints;
}

function intersectDefaultConstraints<TConstraints>(a: TConstraints, b: TConstraints): TConstraints {
    if (a === null || a === undefined) {
        return b;
    }
    if (b === null || b === undefined) {
        return a;
    }
    const bArr = b as readonly unknown[];
    return (a as readonly unknown[]).filter((value) => bArr.includes(value)) as TConstraints;
}

function hasDefaultCombiners(constraints: unknown): boolean {
    return constraints === null || constraints === undefined || Array.isArray(constraints);
}

export class DashboardSettingDefinition<TValue, TConstraints> {
    readonly key: string;
    readonly label: string;
    readonly defaultValue: TValue;
    readonly initialConstraints: TConstraints;
    readonly Component: React.ComponentType<DashboardSettingComponentProps<TValue, TConstraints>>;

    private readonly _unionConstraints: CombineConstraintsFunction<TConstraints>;
    private readonly _intersectConstraints: CombineConstraintsFunction<TConstraints>;
    private readonly _isValueValid?: (value: TValue, constraints: TConstraints) => boolean;
    private readonly _fixupValue?: (value: TValue, constraints: TConstraints) => TValue;
    private readonly _serializeValue?: (value: TValue) => unknown;
    private readonly _deserializeValue?: (serializedValue: unknown) => TValue;

    constructor(options: DashboardSettingOptions<TValue, TConstraints>) {
        this.key = options.key;
        this.label = options.label;
        this.defaultValue = options.defaultValue;
        this.initialConstraints = options.initialConstraints;
        this.Component = options.Component;
        this._isValueValid = options.isValueValid;
        this._fixupValue = options.fixupValue;
        this._serializeValue = options.serializeValue;
        this._deserializeValue = options.deserializeValue;

        // The conditional combine options can't be narrowed for a generic `TConstraints` here.
        const combineOptions = options as Partial<{
            unionConstraints: CombineConstraintsFunction<TConstraints>;
            intersectConstraints: CombineConstraintsFunction<TConstraints>;
        }>;

        if (
            !hasDefaultCombiners(options.initialConstraints) &&
            (!combineOptions.unionConstraints || !combineOptions.intersectConstraints)
        ) {
            throw new Error(
                `Dashboard setting '${options.key}' has non-array constraints and must provide both 'unionConstraints' and 'intersectConstraints'.`,
            );
        }

        this._unionConstraints = combineOptions.unionConstraints ?? unionDefaultConstraints;
        this._intersectConstraints = combineOptions.intersectConstraints ?? intersectDefaultConstraints;
    }

    unionConstraints(a: TConstraints, b: TConstraints): TConstraints {
        return this._unionConstraints(a, b);
    }

    intersectConstraints(a: TConstraints, b: TConstraints): TConstraints {
        return this._intersectConstraints(a, b);
    }

    isValueValid(value: TValue, constraints: TConstraints): boolean {
        if (this._isValueValid) {
            return this._isValueValid(value, constraints);
        }
        return true;
    }

    fixupValue(value: TValue, constraints: TConstraints): TValue {
        if (this._fixupValue) {
            return this._fixupValue(value, constraints);
        }
        return value;
    }

    serializeValue(value: TValue): unknown {
        if (this._serializeValue) {
            return this._serializeValue(value);
        }
        return value;
    }

    deserializeValue(serializedValue: unknown): TValue {
        if (this._deserializeValue) {
            return this._deserializeValue(serializedValue);
        }
        return serializedValue as TValue;
    }
}

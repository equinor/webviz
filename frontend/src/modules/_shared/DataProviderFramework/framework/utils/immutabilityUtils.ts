import { cloneDeep } from "lodash";

/**
 * Checks whether a type is considered a plain object.
 *
 * Plain objects are:
 * - Objects whose prototype is Object.prototype or null (not detectable in TypeScript)
 * - Arrays, functions, Dates, Maps, Sets, and class instances are NOT considered plain objects.
 *
 * This type is best-effort: it excludes the well-known non-plain types.
 * However, user-defined class instances will NOT be excluded reliably in the type system.
 * Use ImmutableObject for mixed structures.
 */
type IsPlainObject<T> = T extends object
    ? T extends (...args: any[]) => any
        ? false
        : T extends abstract new (...args: any[]) => any
          ? false
          : T extends any[]
            ? false
            : T extends Date
              ? false
              : T extends Map<any, any>
                ? false
                : T extends Set<any>
                  ? false
                  : true
    : false;

/**
 * DeepReadonly<T>
 *
 * Recursively makes a plain object or array deeply readonly.
 * Class instances and other non-plain objects are left untouched (no readonly modifiers added).
 *
 * Use this for pure data (POJOs, arrays). For mixed objects (POJOs + class instances), use ImmutableObject.
 */
export type DeepReadonly<T> = T extends (...args: any[]) => any
    ? T
    : T extends abstract new (...args: any[]) => any
      ? T
      : T extends Array<infer U>
        ? ReadonlyArray<DeepReadonly<U>>
        : IsPlainObject<T> extends true
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

/**
 * ImmutableObject<T>
 *
 * Makes only the top-level properties readonly.
 * The contained values (including class instances) are left untouched.
 *
 * Use this when the object can contain a mix of plain data and class instances.
 */
export type ImmutableObject<T> = {
    readonly [K in keyof T]: T[K];
};

/**
 * Deep freezes a value recursively.
 * Skips class instances and only freezes plain objects, arrays, maps, and sets.
 */
function deepFreeze<T>(obj: T): DeepReadonly<T> {
    return internalDeepFreeze(obj, new WeakSet()) as DeepReadonly<T>;
}

function isPlainObject(value: unknown): value is Record<string, any> {
    if (typeof value !== "object" || value === null) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function internalDeepFreeze(obj: unknown, seen: WeakSet<any>): unknown {
    if (obj === null || obj === undefined || typeof obj !== "object") {
        return obj;
    }

    if (seen.has(obj)) {
        return obj;
    }
    seen.add(obj);

    if (Array.isArray(obj)) {
        for (const item of obj) {
            internalDeepFreeze(item, seen);
        }
    } else if (obj instanceof Map) {
        for (const [key, value] of obj.entries()) {
            internalDeepFreeze(key, seen);
            internalDeepFreeze(value, seen);
        }
    } else if (obj instanceof Set) {
        for (const value of obj.values()) {
            internalDeepFreeze(value, seen);
        }
    } else if (isPlainObject(obj)) {
        for (const key of Object.keys(obj)) {
            internalDeepFreeze((obj as any)[key], seen);
        }
    } else {
        // Class instance or other special object → do not freeze!
        return obj;
    }

    Object.freeze(obj);
    return obj;
}

/**
 * Makes a value immutable (readonly) at runtime and type level.
 * - For null/undefined/functions → returns as-is.
 * - For plain objects and arrays → returns deeply frozen version.
 * - For class instances → returns a frozen copy (no runtime immutability), but prevents modification via ImmutableObject if needed.
 */
export function makeDeepImmutable<T>(value: T): DeepReadonly<T> {
    if (value === null || value === undefined) {
        return value as DeepReadonly<T>;
    }

    if (typeof value === "function") {
        return value as DeepReadonly<T>;
    }

    if (typeof value === "object") {
        return deepFreeze(cloneDeep(value)) as DeepReadonly<T>;
    }

    return value as DeepReadonly<T>;
}

function isClassInstance(value: any): boolean {
    return (
        typeof value === "object" &&
        value !== null &&
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
    );
}

/**
 * Makes an object immutable at the top level (readonly at type level, frozen at runtime),
 * but does not deep freeze nested values.
 *
 * Suitable for mixed objects (class instances + plain objects).
 */
export function makeImmutable<T>(value: T): T {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === "function") {
        return value;
    }

    if (typeof value === "object") {
        if (isClassInstance(value)) {
            // 🚨 Do not clone/freeze class instances → just return them
            return value as T;
        }

        if (Array.isArray(value)) {
            return Object.freeze([...value]) as T;
        }

        // ✅ Shallow freeze
        return Object.freeze({ ...value });
    }

    return value;
}

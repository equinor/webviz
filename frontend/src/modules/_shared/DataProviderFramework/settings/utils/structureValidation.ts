import { Ajv, type JTDSchemaType } from "ajv/dist/jtd";

const ajv = new Ajv();

/**
 * Creates a structure validator function from a JTD schema.
 * The validator checks if a value matches the expected structure/type.
 *
 * @param schema - JTD schema defining the expected structure
 * @returns A type guard function that validates the structure
 *
 * @example
 * const schema: JTDSchemaType<MyType> = {
 *   properties: {
 *     name: { type: "string" },
 *     age: { type: "uint32" }
 *   }
 * };
 * const validator = createStructureValidator(schema);
 * if (validator(value)) {
 *   // value is now typed as MyType
 * }
 */
export function createStructureValidator<T>(schema: JTDSchemaType<T>): (value: unknown) => value is T {
    const validate = ajv.compile(schema);

    return (value: unknown): value is T => {
        // null is always valid for nullable types
        if (value === null) {
            return true;
        }

        return validate(value);
    };
}

/**
 * Validates that a value is a string or null
 */
export function isStringOrNull(value: unknown): value is string | null {
    return value === null || typeof value === "string";
}

/**
 * Validates that a value is a number or null
 */
export function isNumberOrNull(value: unknown): value is number | null {
    return value === null || typeof value === "number";
}

/**
 * Validates that a value is a boolean or null
 */
export function isBooleanOrNull(value: unknown): value is boolean | null {
    return value === null || typeof value === "boolean";
}

/**
 * Validates that a value is an array of strings or null
 */
export function isStringArrayOrNull(value: unknown): value is string[] | null {
    return value === null || (Array.isArray(value) && value.every((v) => typeof v === "string"));
}

/**
 * Validates that a value is an array of numbers or null
 */
export function isNumberArrayOrNull(value: unknown): value is number[] | null {
    return value === null || (Array.isArray(value) && value.every((v) => typeof v === "number"));
}

/**
 * Asserts that a value is a string or null, throws if not
 */
export function assertStringOrNull(value: unknown): asserts value is string | null {
    if (!isStringOrNull(value)) {
        throw new Error(`Expected string or null, got ${typeof value}`);
    }
}

/**
 * Asserts that a value is a number or null, throws if not
 */
export function assertNumberOrNull(value: unknown): asserts value is number | null {
    if (!isNumberOrNull(value)) {
        throw new Error(`Expected number or null, got ${typeof value}`);
    }
}

/**
 * Asserts that a value is a boolean or null, throws if not
 */
export function assertBooleanOrNull(value: unknown): asserts value is boolean | null {
    if (!isBooleanOrNull(value)) {
        throw new Error(`Expected boolean or null, got ${typeof value}`);
    }
}

/**
 * Asserts that a value is an array of strings or null, throws if not
 */
export function assertStringArrayOrNull(value: unknown): asserts value is string[] | null {
    if (!isStringArrayOrNull(value)) {
        throw new Error(`Expected string array or null, got ${typeof value}`);
    }
}

/**
 * Asserts that a value is an array of numbers or null, throws if not
 */
export function assertNumberArrayOrNull(value: unknown): asserts value is number[] | null {
    if (!isNumberArrayOrNull(value)) {
        throw new Error(`Expected number array or null, got ${typeof value}`);
    }
}

/**
 * Validates that a value is a tuple of [number | "min" | "max", number | "min" | "max"] or null
 */
export function isNumberOrStringTuple(
    value: unknown,
): value is [number | "min" | "max", number | "min" | "max"] | null {
    if (value === null) {
        return true;
    }
    if (!Array.isArray(value) || value.length !== 2) {
        return false;
    }
    return value.every((v) => typeof v === "number" || v === "min" || v === "max");
}

/**
 * Asserts that a value is a tuple of [number | "min" | "max", number | "min" | "max"] or null, throws if not
 */
export function assertNumberOrStringTuple(
    value: unknown,
): asserts value is [number | "min" | "max", number | "min" | "max"] | null {
    if (!isNumberOrStringTuple(value)) {
        throw new Error(`Expected [number | "min" | "max", number | "min" | "max"] tuple or null`);
    }
}

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

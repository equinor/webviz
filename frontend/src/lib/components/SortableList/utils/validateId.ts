export const SAFE_ID_REGEX = /^[ :.~@A-Za-z0-9_-]+$/;

export function assertSafeId(id: string): asserts id is string {
    if (!SAFE_ID_REGEX.test(id)) {
        throw new Error(`Invalid id "${id}". Allowed characters: [ A-Za-z0-9_-].`);
    }
}

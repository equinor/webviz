export type StoredData = Record<string, any>;

export type NullableStoredData<TStoredData extends StoredData> = {
    [key in keyof TStoredData]: TStoredData[key] | null;
};

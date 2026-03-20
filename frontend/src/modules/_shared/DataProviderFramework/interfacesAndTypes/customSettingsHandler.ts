import type { QueryClient } from "@tanstack/query-core";

import type { StatusWriter } from "@framework/types/statusWriter";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";

import type { Accessors, Dependency, NonPending, NoUpdate, Read, UnwrapRead } from "../delegates/_utils/Dependency";
import type { Settings, SettingTypeDefinitions } from "../settings/settingsDefinitions";

import type { NullableStoredData, StoredData } from "./sharedTypes";
import type { MakeSettingTypesMap, SettingsKeysFromTuple } from "./utils";

export type SettingAttributes = {
    visible: boolean;
    enabled: boolean | { enabled: false; reason: string };
};

export function isEnabledObject(
    enabled: boolean | { enabled: false; reason: string },
): enabled is { enabled: false; reason: string } {
    return typeof enabled === "object" && "enabled" in enabled && "reason" in enabled;
}

export function isSettingEnabled(enabled: boolean | { enabled: false; reason: string }): enabled is true {
    return enabled === true;
}

export interface UpdateFunc<
type MaybePromise<T> = T | Promise<T>;

/**
 * A Resolver produces a (possibly async) value based on reads.
 * The binding site decides what to do with the resolved value.
 */
export type ResolverSpec<
    TReturnValue,
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
    TReads extends Record<string, Read<any>> = Record<string, never>,
> = {
    read?: (readArgs: { read: Accessors<TSettings, TSettingTypes, TKey> }) => TReads;
    resolve: (
        values: { [K in keyof TReads]: UnwrapRead<TReads[K]> },
        utils: {
            abortSignal: AbortSignal;
            statusWriter: StatusWriter;
        },
    ) => MaybePromise<NonPending<TReturnValue> | NoUpdate>;
};

/**
 * Domain-scoped API for a single setting.
 * Method names include "resolve" so call sites clearly read as dynamic wiring.
 */
export interface SettingBindings<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
    TSettingKey extends TKey,
> {
    bindAttributes<TReads extends Record<string, Read<any>> = Record<string, never>>(
        args: ResolverSpec<Partial<SettingAttributes>, TSettings, TSettingTypes, TKey, TReads>,
    ): Dependency<Partial<SettingAttributes>, TSettings, TSettingTypes, TKey, TReads>;

    bindValueConstraints<TReads extends Record<string, Read<any>> = Record<string, never>>(
        args: ResolverSpec<
            SettingTypeDefinitions[TSettingKey]["valueConstraints"],
            TSettings,
            TSettingTypes,
            TKey,
            TReads
        >,
    ): Dependency<SettingTypeDefinitions[TSettingKey]["valueConstraints"], TSettings, TSettingTypes, TKey, TReads>;
}

/**
 * Domain-scoped API for a stored-data key.
 */
export interface StoredDataBindings<
    TSettings extends Settings,
    TStoredData extends StoredData,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
    K extends keyof TStoredData,
> {
    bindValue<TReads extends Record<string, Read<any>> = Record<string, never>>(
        args: ResolverSpec<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TKey, TReads>,
    ): Dependency<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TKey, TReads>;
}

declare const sharedResultBrand: unique symbol;

export type SharedResult<
    T,
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
    TReads extends Record<string, Read<any>> = Record<string, never>,
> = {
    readonly [sharedResultBrand]: true;
    readonly debugName: string;
} & Dependency<T, TSettings, TSettingTypes, TKey, TReads>;
/**
 * Settings-only context.
 */
export interface SetupBasicBindingsContext<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    setting: <TSettingKey extends TKey>(
        settingKey: TSettingKey,
    ) => SettingBindings<TSettings, TSettingTypes, TKey, TSettingKey>;

    /**
     * Creates a reusable intermediate result to be consumed via read.dependency(dep).
     */
    makeSharedResult: <T, TReads extends Record<string, Read<any>> = Record<string, never>>(
        args: ResolverSpec<T, TSettings, TSettingTypes, TKey, TReads> & { debugName: string },
    ) => SharedResult<T, TSettings, TSettingTypes, TKey, TReads>;

    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    queryClient: QueryClient;
}

/**
 * Settings + stored-data context.
 */
export interface SetupBindingsContext<
    TSettings extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData,
> extends SetupBasicBindingsContext<TSettings, TSettingTypes, TKey> {
    storedData: <K extends TStoredDataKey>(
        key: K,
    ) => StoredDataBindings<TSettings, TStoredData, TSettingTypes, TKey, K>;
}

/**
 * Custom settings handler contract.
 */
export interface CustomSettingsHandler<
    TSettings extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData,
> {
    settings: TSettings;

    getDefaultSettingsValues?(): Partial<TSettingTypes>;

    /**
     * Called once during initialization to wire up dynamic bindings and shared resolvers.
     */
    setupBindings(ctx: SetupBindingsContext<TSettings, TStoredData, TSettingTypes, TSettingKey, TStoredDataKey>): void;
}

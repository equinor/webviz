import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { MockInstance } from "vitest";

import { CustomDataProviderType as TwoDViewerCustomDataProviderType } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { ContextBoundary } from "@modules/_shared/DataProviderFramework/framework/ContextBoundary/ContextBoundary";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type {
    ErrorPlaceholder} from "@modules/_shared/DataProviderFramework/framework/ErrorPlaceholder/ErrorPlaceholder";
import {
    isErrorPlaceholder,
} from "@modules/_shared/DataProviderFramework/framework/ErrorPlaceholder/ErrorPlaceholder";
import { DeserializationAssistant } from "@modules/_shared/DataProviderFramework/framework/utils/DeserializationAssistant";
import type {
    SerializedContextBoundary,
    SerializedDataProvider,
    SerializedSharedSetting,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";
import { SerializedType } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { CustomDataProviderType as IntersectionCustomDataProviderType } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";

const { mockSharedSettingInstances } = vi.hoisted(() => ({
    mockSharedSettingInstances: [] as Array<{
        deserializeState: ReturnType<typeof vi.fn>;
        wrappedSettingType: unknown;
        value: unknown;
    }>,
}));

// Constructing a real SharedSetting requires a fully-wired DataProviderManager/SettingManager graph
// unrelated to what this suite tests (that the assistant leaves SHARED_SETTING items untouched).
vi.mock("@modules/_shared/DataProviderFramework/framework/SharedSetting/SharedSetting", () => {
    class FakeSharedSetting {
        deserializeState = vi.fn();
        wrappedSettingType: unknown;
        value: unknown;
        constructor(wrappedSettingType: unknown, value: unknown) {
            this.wrappedSettingType = wrappedSettingType;
            this.value = value;
            mockSharedSettingInstances.push(this);
        }
    }
    return { SharedSetting: FakeSharedSetting, isSharedSetting: () => false };
});

const FAKE_MANAGER = {
    getGroupDelegate: () => ({ getDescendantItems: () => [] }),
    publishTopic: () => {},
} as unknown as DataProviderManager;

type FakeItemDelegate = {
    setId: ReturnType<typeof vi.fn>;
    setName: ReturnType<typeof vi.fn>;
    setParentGroup: ReturnType<typeof vi.fn>;
    getOrder: () => number;
    getId: () => string;
};

type FakeProvider = {
    deserializeState: ReturnType<typeof vi.fn>;
    getItemDelegate: () => FakeItemDelegate;
};

// A single shared ItemDelegate stub per provider instance, so assertions on setId/setName see the
// same mock regardless of how many times getItemDelegate() is called (mirrors the real delegate).
function makeFakeProvider(id = "fake-provider-id"): FakeProvider {
    const itemDelegate: FakeItemDelegate = {
        setId: vi.fn(),
        setName: vi.fn(),
        setParentGroup: vi.fn(),
        getOrder: () => 0,
        getId: () => id,
    };
    return {
        deserializeState: vi.fn(),
        getItemDelegate: () => itemDelegate,
    };
}

function makeSerializedDataProvider(
    dataProviderType: string,
    settings: Record<string, string>,
    overrides: Partial<SerializedDataProvider<any>> = {},
): SerializedDataProvider<any> {
    return {
        id: "provider-id",
        type: SerializedType.DATA_PROVIDER,
        name: "My Provider",
        expanded: true,
        visible: true,
        dataProviderType,
        settings,
        ...overrides,
    };
}

function deepFreeze<T>(value: T): T {
    Object.values(value as object).forEach((v) => {
        if (v && typeof v === "object" && !Object.isFrozen(v)) {
            deepFreeze(v);
        }
    });
    return Object.freeze(value);
}

const REGISTERED_LEGACY_SURFACE_PROVIDER_TYPES: Array<{ type: string; currentKey: Setting }> = [
    { type: DataProviderType.ATTRIBUTE_STATIC_SURFACE, currentKey: Setting.SURFACE_ATTRIBUTE },
    { type: DataProviderType.ATTRIBUTE_TIME_STEP_SURFACE, currentKey: Setting.SURFACE_ATTRIBUTE },
    { type: DataProviderType.ATTRIBUTE_INTERVAL_SURFACE, currentKey: Setting.SURFACE_ATTRIBUTE },
    { type: IntersectionCustomDataProviderType.REALIZATION_SURFACES, currentKey: Setting.DEPTH_ATTRIBUTE },
    {
        type: IntersectionCustomDataProviderType.SURFACES_REALIZATIONS_UNCERTAINTY,
        currentKey: Setting.DEPTH_ATTRIBUTE,
    },
];

describe("DeserializationAssistant - legacy surface-attribute setting-key migration", () => {
    let makeDataProviderSpy: MockInstance<typeof DataProviderRegistry.makeDataProvider>;

    beforeEach(() => {
        makeDataProviderSpy = vi.spyOn(DataProviderRegistry, "makeDataProvider");
    });

    afterEach(() => {
        makeDataProviderSpy.mockRestore();
    });

    test.each(REGISTERED_LEGACY_SURFACE_PROVIDER_TYPES)(
        "migrates legacy 'attribute' to '$currentKey' for registered type $type",
        ({ type, currentKey }) => {
            const fakeProvider = makeFakeProvider();
            makeDataProviderSpy.mockReturnValue(fakeProvider as any);
            const legacyValue = JSON.stringify({ kind: "TAGNAME", tag_name: "ds_extract_geogrid" });

            const serialized = makeSerializedDataProvider(type, { attribute: legacyValue });

            new DeserializationAssistant(FAKE_MANAGER).makeItem(serialized);

            expect(makeDataProviderSpy).toHaveBeenCalledWith(type, FAKE_MANAGER, "My Provider");
            expect(fakeProvider.deserializeState).toHaveBeenCalledTimes(1);
            const passedSettings = fakeProvider.deserializeState.mock.calls[0][0].settings;
            expect(passedSettings).toEqual({ [currentKey]: legacyValue });
        },
    );

    test("dispatches on the persisted dataProviderType, not the display name or setting value", () => {
        const fakeProvider = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider as any);

        // Unregistered type, but named and shaped just like a real attribute-surface provider.
        const serialized = makeSerializedDataProvider(
            "SOME_UNRELATED_TYPE",
            { attribute: JSON.stringify({ kind: "TAGNAME", tag_name: "ds_extract_geogrid" }) },
            { name: "Static Surface" },
        );

        new DeserializationAssistant(FAKE_MANAGER).makeItem(serialized);

        expect(fakeProvider.deserializeState.mock.calls[0][0].settings).toEqual(serialized.settings);
    });

    test("an existing destination key wins, including serialized null, and the legacy key is removed", () => {
        const fakeProvider = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider as any);

        const serialized = makeSerializedDataProvider(DataProviderType.ATTRIBUTE_STATIC_SURFACE, {
            attribute: JSON.stringify("legacy_tagname"),
            surfaceAttribute: JSON.stringify(null),
        });

        new DeserializationAssistant(FAKE_MANAGER).makeItem(serialized);

        const passedSettings = fakeProvider.deserializeState.mock.calls[0][0].settings;
        expect(passedSettings).toEqual({ surfaceAttribute: JSON.stringify(null) });
        expect(passedSettings.attribute).toBeUndefined();
    });

    test("a missing legacy key is a no-op", () => {
        const fakeProvider = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider as any);

        const settings = { surfaceAttribute: JSON.stringify({ kind: "TAGNAME", tag_name: "x" }) };
        const serialized = makeSerializedDataProvider(DataProviderType.ATTRIBUTE_STATIC_SURFACE, settings);

        new DeserializationAssistant(FAKE_MANAGER).makeItem(serialized);

        expect(fakeProvider.deserializeState.mock.calls[0][0].settings).toEqual(settings);
    });

    test("a grid provider type sharing the ATTRIBUTE setting key is not rewritten", () => {
        const fakeProvider = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider as any);

        const settings = { attribute: JSON.stringify("PORO") };
        const serialized = makeSerializedDataProvider(TwoDViewerCustomDataProviderType.REALIZATION_GRID_2D, settings);

        new DeserializationAssistant(FAKE_MANAGER).makeItem(serialized);

        expect(fakeProvider.deserializeState.mock.calls[0][0].settings).toEqual(settings);
    });

    test("legacy tagname and standard-result string payloads are forwarded verbatim", () => {
        const fakeProvider = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider as any);

        const tagNameValue = JSON.stringify("ds_extract_geogrid");
        const standardResultValue = JSON.stringify("structure_depth_surface (standard result)");

        new DeserializationAssistant(FAKE_MANAGER).makeItem(
            makeSerializedDataProvider(DataProviderType.ATTRIBUTE_STATIC_SURFACE, { attribute: tagNameValue }),
        );
        expect(fakeProvider.deserializeState.mock.calls[0][0].settings.surfaceAttribute).toBe(tagNameValue);

        const fakeProvider2 = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider2 as any);
        new DeserializationAssistant(FAKE_MANAGER).makeItem(
            makeSerializedDataProvider(DataProviderType.ATTRIBUTE_STATIC_SURFACE, { attribute: standardResultValue }),
        );
        expect(fakeProvider2.deserializeState.mock.calls[0][0].settings.surfaceAttribute).toBe(standardResultValue);
    });

    test("does not mutate the input fixture and normalizing twice is idempotent", () => {
        const fakeProvider = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider as any);

        const serialized = deepFreeze(
            makeSerializedDataProvider(DataProviderType.ATTRIBUTE_STATIC_SURFACE, {
                attribute: JSON.stringify("ds_extract_geogrid"),
                formationName: JSON.stringify("Therys Fm."),
            }),
        );

        expect(() => new DeserializationAssistant(FAKE_MANAGER).makeItem(serialized)).not.toThrow();

        const firstPassSettings = fakeProvider.deserializeState.mock.calls[0][0].settings;
        expect(firstPassSettings).toEqual({
            surfaceAttribute: JSON.stringify("ds_extract_geogrid"),
            formationName: JSON.stringify("Therys Fm."),
        });

        // Feed the already-normalized settings back through the assistant; nothing should change.
        const fakeProvider2 = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider2 as any);
        const reserialized = makeSerializedDataProvider(DataProviderType.ATTRIBUTE_STATIC_SURFACE, firstPassSettings);

        new DeserializationAssistant(FAKE_MANAGER).makeItem(reserialized);

        expect(fakeProvider2.deserializeState.mock.calls[0][0].settings).toEqual(firstPassSettings);
    });

    test("preserves ids, names and unrelated settings/item metadata", () => {
        const fakeProvider = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider as any);

        const serialized = makeSerializedDataProvider(
            DataProviderType.ATTRIBUTE_STATIC_SURFACE,
            {
                attribute: JSON.stringify("ds_extract_geogrid"),
                formationName: JSON.stringify("Therys Fm."),
            },
            { id: "abc-123", name: "My Custom Name", expanded: false, visible: false },
        );

        new DeserializationAssistant(FAKE_MANAGER).makeItem(serialized);

        const passedProvider = fakeProvider.deserializeState.mock.calls[0][0];
        expect(passedProvider.id).toBe("abc-123");
        expect(passedProvider.name).toBe("My Custom Name");
        expect(passedProvider.expanded).toBe(false);
        expect(passedProvider.visible).toBe(false);
        expect(passedProvider.settings.formationName).toBe(JSON.stringify("Therys Fm."));
        expect(fakeProvider.getItemDelegate().setId).toHaveBeenCalledWith("abc-123");
        expect(fakeProvider.getItemDelegate().setName).toHaveBeenCalledWith("My Custom Name");
    });

    test("a provider-deserialization failure yields an ErrorPlaceholder retaining the original payload", () => {
        makeDataProviderSpy.mockImplementation(() => {
            throw new Error("Data provider 'UNKNOWN_TYPE' not found");
        });

        const serialized = makeSerializedDataProvider("UNKNOWN_TYPE", {
            attribute: JSON.stringify("ds_extract_geogrid"),
        });

        const item = new DeserializationAssistant(FAKE_MANAGER).makeItem(serialized);

        expect(isErrorPlaceholder(item)).toBe(true);
        expect((item as ErrorPlaceholder).serializeState()).toBe(serialized);
        expect((item as ErrorPlaceholder).serializeState()).toEqual(
            expect.objectContaining({ settings: { attribute: JSON.stringify("ds_extract_geogrid") } }),
        );
    });

    test("SHARED_SETTING items are left unchanged", () => {
        mockSharedSettingInstances.length = 0;

        const serializedSharedSetting: SerializedSharedSetting = {
            id: "shared-1",
            type: SerializedType.SHARED_SETTING,
            name: "Attribute",
            expanded: true,
            visible: true,
            wrappedSettingType: Setting.ATTRIBUTE,
            value: JSON.stringify("PORO"),
        };

        new DeserializationAssistant(FAKE_MANAGER).makeItem(serializedSharedSetting);

        expect(mockSharedSettingInstances).toHaveLength(1);
        expect(mockSharedSettingInstances[0].wrappedSettingType).toBe(Setting.ATTRIBUTE);
        expect(mockSharedSettingInstances[0].value).toBe(JSON.stringify("PORO"));
        expect(mockSharedSettingInstances[0].deserializeState).toHaveBeenCalledWith(serializedSharedSetting);
    });

    test("nested restoration through a ContextBoundary reaches the migration", () => {
        const fakeProvider = makeFakeProvider();
        makeDataProviderSpy.mockReturnValue(fakeProvider as any);

        const contextBoundary = new ContextBoundary("Context boundary", FAKE_MANAGER);
        const serializedContextBoundary: SerializedContextBoundary = {
            id: "ctx-1",
            type: SerializedType.CONTEXT_BOUNDARY,
            name: "Context boundary",
            expanded: true,
            visible: true,
            children: [
                makeSerializedDataProvider(DataProviderType.ATTRIBUTE_STATIC_SURFACE, {
                    attribute: JSON.stringify("ds_extract_geogrid"),
                }),
            ],
        };

        contextBoundary.deserializeState(serializedContextBoundary);

        expect(fakeProvider.deserializeState).toHaveBeenCalledTimes(1);
        expect(fakeProvider.deserializeState.mock.calls[0][0].settings).toEqual({
            surfaceAttribute: JSON.stringify("ds_extract_geogrid"),
        });
    });
});

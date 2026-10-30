import { describe, expect, it, vi } from "vitest";

import { DashboardSettingDefinition, type DashboardSettingOptions } from "@framework/DashboardSettings/DashboardSettingDefinition";
import {
    DashboardSettingCombineStrategy,
    DashboardSettingInstance,
    DashboardSettingInstanceTopic,
    DashboardSettingValueSource,
} from "@framework/DashboardSettings/DashboardSettingInstance";
import { DashboardSettingRegistry } from "@framework/DashboardSettings/DashboardSettingRegistry";
import {
    DashboardSettingsService,
    DashboardSettingsServiceTopic,
} from "@framework/DashboardSettings/DashboardSettingsService";
import { makeOptionListDashboardSettingOptions } from "@framework/DashboardSettings/utils/optionListDashboardSetting";

function makeListOptions(
    overrides?: Partial<DashboardSettingOptions<string | null, readonly string[]>>,
): DashboardSettingOptions<string | null, readonly string[]> {
    return {
        key: "test",
        label: "Test",
        defaultValue: null,
        initialConstraints: [],
        isValueValid: (value, constraints) =>
            value === null ? constraints.length === 0 : constraints.includes(value),
        fixupValue: (_value, constraints) => constraints[0] ?? null,
        Component: () => null,
        ...overrides,
    };
}

function makeListDefinition(
    overrides?: Partial<DashboardSettingOptions<string | null, readonly string[]>>,
): DashboardSettingDefinition<string | null, readonly string[]> {
    return new DashboardSettingDefinition(makeListOptions(overrides));
}

function makeInstance(
    overrides?: Partial<DashboardSettingOptions<string | null, readonly string[]>>,
): DashboardSettingInstance<string | null, readonly string[]> {
    return new DashboardSettingInstance(makeListDefinition(overrides));
}

describe("DashboardSettingDefinition", () => {
    it("requires union/intersect combiners for non-array constraints", () => {
        expect(
            () =>
                new DashboardSettingDefinition<number, { min: number; max: number }>({
                    key: "range",
                    label: "Range",
                    defaultValue: 0,
                    initialConstraints: { min: 0, max: 0 },
                    Component: () => null,
                } as any),
        ).toThrow(/must provide both/);
    });

    it("uses custom combiners for non-array constraints", () => {
        const definition = new DashboardSettingDefinition<number, { min: number; max: number }>({
            key: "range",
            label: "Range",
            defaultValue: 0,
            initialConstraints: { min: 0, max: 0 },
            unionConstraints: (a, b) => ({ min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) }),
            intersectConstraints: (a, b) => ({ min: Math.max(a.min, b.min), max: Math.min(a.max, b.max) }),
            Component: () => null,
        });
        const unionInstance = new DashboardSettingInstance(definition);
        const intersectionInstance = new DashboardSettingInstance(definition, {
            combineStrategy: DashboardSettingCombineStrategy.INTERSECTION,
        });

        for (const instance of [unionInstance, intersectionInstance]) {
            instance.registerConstraintSource("a").updateConstraints({ min: 0, max: 10 });
            instance.registerConstraintSource("b").updateConstraints({ min: 5, max: 20 });
        }

        expect(unionInstance.getConstraints()).toEqual({ min: 0, max: 20 });
        expect(intersectionInstance.getConstraints()).toEqual({ min: 5, max: 10 });
    });
});

describe("makeOptionListDashboardSettingOptions", () => {
    type Wellbore = { uuid: string; name: string };

    const definition = new DashboardSettingDefinition(
        makeOptionListDashboardSettingOptions<string, Wellbore>({
            key: "wellbore",
            label: "Wellbore",
            getOptionValue: (wellbore) => wellbore.uuid,
            getOptionLabel: (wellbore) => wellbore.name,
            compareOptions: (a, b) => a.name.localeCompare(b.name),
        }),
    );

    it("dedupes options by value and sorts the union", () => {
        const instance = new DashboardSettingInstance(definition);
        instance.registerConstraintSource("a").updateConstraints([
            { uuid: "2", name: "B" },
            { uuid: "1", name: "A" },
        ]);
        instance.registerConstraintSource("b").updateConstraints([
            { uuid: "3", name: "C" },
            { uuid: "1", name: "A" },
        ]);

        expect(instance.getConstraints().map((wellbore) => wellbore.uuid)).toEqual(["1", "2", "3"]);
    });

    it("intersects options by value", () => {
        const instance = new DashboardSettingInstance(definition, {
            combineStrategy: DashboardSettingCombineStrategy.INTERSECTION,
        });
        instance.registerConstraintSource("a").updateConstraints([
            { uuid: "1", name: "A" },
            { uuid: "2", name: "B" },
        ]);
        instance.registerConstraintSource("b").updateConstraints([{ uuid: "2", name: "B" }]);

        expect(instance.getConstraints()).toEqual([{ uuid: "2", name: "B" }]);
    });

    it("starts at null and settles on the first option", () => {
        const instance = new DashboardSettingInstance(definition);
        expect(instance.getValue()).toBeNull();

        instance.registerConstraintSource("a").updateConstraints([
            { uuid: "2", name: "B" },
            { uuid: "1", name: "A" },
        ]);

        expect(instance.getValue()).toBe("2");
    });

    it("only considers null valid when there are no options", () => {
        expect(definition.isValueValid(null, [])).toBe(true);
        expect(definition.isValueValid(null, [{ uuid: "1", name: "A" }])).toBe(false);
        expect(definition.isValueValid("1", [{ uuid: "1", name: "A" }])).toBe(true);
    });
});

describe("DashboardSettingDefinition - settings without constraints", () => {
    it("needs no combiners, and never fixes up the value", () => {
        const definition = new DashboardSettingDefinition<boolean, null>({
            key: "toggle",
            label: "Toggle",
            defaultValue: false,
            initialConstraints: null,
            fixupValue: () => true,
            Component: () => null,
        });
        const instance = new DashboardSettingInstance(definition);
        const source = instance.registerConstraintSource("a");

        source.markPending();
        source.clearConstraints();
        instance.setValue(true);

        expect(instance.getConstraints()).toBeNull();
        expect(instance.isValueValid()).toBe(true);
        expect(instance.getValue()).toBe(true);
    });
});

describe("DashboardSettingInstance - aggregation", () => {
    it("unions all contributions by default", () => {
        const instance = makeInstance();
        instance.registerConstraintSource("a").updateConstraints(["x", "y"]);
        instance.registerConstraintSource("b").updateConstraints(["y", "z"]);

        expect(instance.getConstraints()).toEqual(["x", "y", "z"]);
    });

    it("intersects all contributions with the INTERSECTION strategy", () => {
        const instance = new DashboardSettingInstance(makeListDefinition(), {
            combineStrategy: DashboardSettingCombineStrategy.INTERSECTION,
        });
        instance.registerConstraintSource("a").updateConstraints(["x", "y", "z"]);
        instance.registerConstraintSource("b").updateConstraints(["y", "z", "w"]);

        expect(instance.getConstraints()).toEqual(["y", "z"]);
    });

    it("withdraws cleared and unregistered contributions", () => {
        const instance = makeInstance();
        const a = instance.registerConstraintSource("a");
        const b = instance.registerConstraintSource("b");
        a.updateConstraints(["x"]);
        b.updateConstraints(["y"]);

        a.clearConstraints();
        expect(instance.getConstraints()).toEqual(["y"]);
        expect(instance.getSourceCount()).toBe(2);

        b.unregister();
        expect(instance.getConstraints()).toEqual([]);
        expect(instance.getSourceCount()).toBe(1);
    });

    it("lets an override replace the contributions until cleared", () => {
        const instance = makeInstance();
        instance.registerConstraintSource("a").updateConstraints(["x", "y"]);

        instance.setConstraintOverride(["z"]);
        expect(instance.getConstraints()).toEqual(["z"]);

        instance.setConstraintOverride(null);
        expect(instance.getConstraints()).toEqual(["x", "y"]);
    });

    it("keeps a pending source's last contribution while marking the instance as settling", () => {
        const instance = makeInstance();
        const a = instance.registerConstraintSource("a");
        a.updateConstraints(["x"]);

        a.markPending();
        expect(instance.isSettling()).toBe(true);
        expect(instance.getConstraints()).toEqual(["x"]);

        a.updateConstraints(["x", "y"]);
        expect(instance.isSettling()).toBe(false);
        expect(instance.getConstraints()).toEqual(["x", "y"]);
    });

    it("throws when a source is registered twice or used after unregistering", () => {
        const instance = makeInstance();
        const a = instance.registerConstraintSource("a");

        expect(() => instance.registerConstraintSource("a")).toThrow(/already registered/);

        a.unregister();
        expect(() => a.updateConstraints(["x"])).toThrow(/already been unregistered/);
    });

    it("ignores handle calls after the instance has been destroyed", () => {
        const instance = makeInstance();
        const a = instance.registerConstraintSource("a");
        instance.beforeDestroy();

        expect(() => a.updateConstraints(["x"])).not.toThrow();
        expect(instance.getConstraints()).toEqual([]);
    });
});

describe("DashboardSettingInstance - value rule", () => {
    it("does not touch the value before any source has contributed", () => {
        const instance = makeInstance();
        instance.registerConstraintSource("a");

        expect(instance.getValue()).toBeNull();
        expect(instance.isValueValid()).toBe(true);
    });

    it("fixes up the default value once, when it first settles", () => {
        const instance = makeInstance();
        instance.registerConstraintSource("a").updateConstraints(["x", "y"]);

        expect(instance.getValue()).toBe("x");
        expect(instance.isValueValid()).toBe(true);
    });

    it("defers the first-settle fixup while any source is pending", () => {
        const instance = makeInstance();
        const a = instance.registerConstraintSource("a");
        const b = instance.registerConstraintSource("b");

        a.markPending();
        b.updateConstraints(["y"]);
        expect(instance.getValue()).toBeNull();

        // Fixed up against the complete union (["x", "y"]) - not prematurely against b's ["y"] alone.
        a.updateConstraints(["x"]);
        expect(instance.getValue()).toBe("x");
    });

    it("keeps an invalid value after having settled, and reports it as invalid", () => {
        const instance = makeInstance();
        const a = instance.registerConstraintSource("a");
        a.updateConstraints(["x", "y"]);
        instance.setValue("y");

        const onValidityChange = vi.fn();
        instance.getPublishSubscribeDelegate().subscribe(DashboardSettingInstanceTopic.IS_VALUE_VALID, onValidityChange);

        a.updateConstraints(["x"]);

        expect(instance.getValue()).toBe("y");
        expect(instance.isValueValid()).toBe(false);
        expect(onValidityChange).toHaveBeenCalledTimes(1);
    });

    it("repairs an invalid value on an explicit fixup", () => {
        const instance = makeInstance();
        const a = instance.registerConstraintSource("a");
        a.updateConstraints(["x", "y"]);
        instance.setValue("y");
        a.updateConstraints(["x"]);

        instance.fixupValue();

        expect(instance.getValue()).toBe("x");
        expect(instance.isValueValid()).toBe(true);
    });

    it("ignores an explicit fixup while a source is pending", () => {
        const instance = makeInstance();
        const a = instance.registerConstraintSource("a");
        a.updateConstraints(["x", "y"]);
        instance.setValue("y");
        a.updateConstraints(["x"]);
        a.markPending();

        instance.fixupValue();

        expect(instance.getValue()).toBe("y");
    });

    it("never fixes up a restored value, and promotes it once it becomes valid", () => {
        const instance = new DashboardSettingInstance(makeListDefinition(), {
            value: "z",
            valueSource: DashboardSettingValueSource.RESTORED,
        });
        const a = instance.registerConstraintSource("a");

        a.updateConstraints(["x", "y"]);
        expect(instance.getValue()).toBe("z");
        expect(instance.getValueSource()).toBe(DashboardSettingValueSource.RESTORED);
        expect(instance.isValueValid()).toBe(false);

        a.updateConstraints(["x", "y", "z"]);
        expect(instance.getValue()).toBe("z");
        expect(instance.getValueSource()).toBe(DashboardSettingValueSource.USER);
        expect(instance.isValueValid()).toBe(true);
    });

    it("promotes a restored value right away when it is already valid", () => {
        const instance = makeInstance();
        instance.registerConstraintSource("a").updateConstraints(["x", "y"]);

        instance.setValue("y", DashboardSettingValueSource.RESTORED);

        expect(instance.getValueSource()).toBe(DashboardSettingValueSource.USER);
    });

    it("turns a restored value into a user value when the user picks one", () => {
        const instance = new DashboardSettingInstance(makeListDefinition(), {
            value: "z",
            valueSource: DashboardSettingValueSource.RESTORED,
        });
        instance.registerConstraintSource("a").updateConstraints(["x"]);

        instance.setValue("x");

        expect(instance.getValueSource()).toBe(DashboardSettingValueSource.USER);
    });
});

describe("Dashboard settings - implicit dependencies through consumers", () => {
    // A downstream consumer (think: a DPF layer) whose grid property options depend on the grid model
    // it gets from the dashboard grid model setting. It recomputes asynchronously, like a fetch.
    const PROPERTIES_PER_GRID: Record<string, string[]> = {
        gridA: ["PORO", "PERMX"],
        gridB: ["PORO", "NTG"],
        gridC: ["SWAT"],
    };

    function connectConsumer(
        gridModel: DashboardSettingInstance<string | null, readonly string[]>,
        gridProperty: DashboardSettingInstance<string | null, readonly string[]>,
    ) {
        const gridModelSource = gridModel.registerConstraintSource("layer");
        const gridPropertySource = gridProperty.registerConstraintSource("layer");
        const pendingFetches: (() => void)[] = [];

        function refreshProperties() {
            gridPropertySource.markPending();
            const model = gridModel.getValue();
            pendingFetches.push(() => gridPropertySource.updateConstraints(PROPERTIES_PER_GRID[model ?? ""] ?? []));
        }

        gridModel.getPublishSubscribeDelegate().subscribe(DashboardSettingInstanceTopic.VALUE, refreshProperties);
        gridModelSource.updateConstraints(Object.keys(PROPERTIES_PER_GRID));
        refreshProperties();

        return {
            resolveFetches: () => pendingFetches.splice(0).forEach((resolve) => resolve()),
        };
    }

    it("keeps the dependent value while it stays valid, and flags it once it isn't", () => {
        const gridModel = makeInstance({ key: "gridModel" });
        const gridProperty = makeInstance({ key: "gridProperty" });
        const consumer = connectConsumer(gridModel, gridProperty);

        expect(gridModel.getValue()).toBe("gridA");
        consumer.resolveFetches();
        expect(gridProperty.getValue()).toBe("PORO");

        gridModel.setValue("gridB");
        expect(gridProperty.isSettling()).toBe(true);
        consumer.resolveFetches();
        expect(gridProperty.getValue()).toBe("PORO");
        expect(gridProperty.isValueValid()).toBe(true);

        gridModel.setValue("gridC");
        consumer.resolveFetches();
        expect(gridProperty.getValue()).toBe("PORO");
        expect(gridProperty.isValueValid()).toBe(false);
        expect(gridProperty.getConstraints()).toEqual(["SWAT"]);
    });
});

describe("DashboardSettingsService", () => {
    const FIRST = DashboardSettingRegistry.registerDashboardSetting(makeListOptions({ key: "service-test-first" }));
    const SECOND = DashboardSettingRegistry.registerDashboardSetting(makeListOptions({ key: "service-test-second" }));

    it("lists active settings in registration order", () => {
        const service = new DashboardSettingsService();
        service.addSetting(SECOND);
        service.addSetting(FIRST);

        expect(service.getActiveSettings().map((instance) => instance.getDefinition().key)).toEqual([
            FIRST.key,
            SECOND.key,
        ]);
    });

    it("refuses to add the same setting twice", () => {
        const service = new DashboardSettingsService();
        service.addSetting(FIRST);

        expect(() => service.addSetting(FIRST)).toThrow(/already active/);
    });

    it("treats an explicitly given initial value as restored", () => {
        const service = new DashboardSettingsService();
        const instance = service.addSetting(FIRST, { value: "z" });

        expect(instance.getValue()).toBe("z");
        expect(instance.getValueSource()).toBe(DashboardSettingValueSource.RESTORED);
    });

    it("destroys removed instances", () => {
        const service = new DashboardSettingsService();
        const instance = service.addSetting(FIRST);
        const source = instance.registerConstraintSource("a");

        service.removeSetting(FIRST);

        expect(service.hasSetting(FIRST)).toBe(false);
        expect(() => source.updateConstraints(["x"])).not.toThrow();
        expect(instance.getConstraints()).toEqual([]);
    });

    it("bumps the state revision on add, remove and value changes", () => {
        const service = new DashboardSettingsService();
        const getRevision = service.makeSnapshotGetter(DashboardSettingsServiceTopic.STATE_REVISION);

        const start = getRevision();
        const instance = service.addSetting(FIRST);
        expect(getRevision()).toBe(start + 1);

        instance.setValue("x");
        expect(getRevision()).toBe(start + 2);

        service.removeSetting(FIRST);
        expect(getRevision()).toBe(start + 3);

        instance.setValue("y");
        expect(getRevision()).toBe(start + 3);
    });

    it("round-trips its state, restoring values as restored and replacing the active settings", () => {
        const service = new DashboardSettingsService();
        service.addSetting(FIRST).setValue("x");
        const serialized = service.serializeState();
        expect(serialized).toEqual({ [FIRST.key]: "x" });

        const otherService = new DashboardSettingsService();
        otherService.addSetting(SECOND);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        otherService.deserializeState({ ...serialized, "unknown-key": 42 });

        expect(warn).toHaveBeenCalledOnce();
        warn.mockRestore();
        expect(otherService.hasSetting(SECOND)).toBe(false);
        const restored = otherService.getSetting(FIRST);
        expect(restored?.getValue()).toBe("x");
        expect(restored?.getValueSource()).toBe(DashboardSettingValueSource.RESTORED);
    });
});

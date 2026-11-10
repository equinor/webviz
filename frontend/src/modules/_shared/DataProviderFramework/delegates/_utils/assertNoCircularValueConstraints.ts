import type { Dependency } from "./Dependency";

type AnyDependency = Dependency<any, any, any, any, any>;

/*
 * Value constraints that are resolved from a setting are blocked while that setting is invalid (see Dependency). If the
 * value constraints of settings are resolved from each other - directly, through other settings, or through shared
 * results - an invalid value would block them all for good. Such bindings are rejected as soon as they are set up.
 *
 * Only the reads made when the bindings are set up are known - a read that only happens under some condition is missed.
 */
export function assertNoCircularValueConstraints(
    valueConstraintsDependencies: ReadonlyMap<string, readonly AnyDependency[]>,
    getSettingLabel: (settingKey: string) => string,
): void {
    // For each setting, the settings its value constraints are resolved from
    const readSettingsBySetting = new Map<string, Set<string>>();
    for (const [settingKey, dependencies] of valueConstraintsDependencies) {
        const readSettings = new Set<string>();
        for (const dependency of dependencies) {
            collectReadSettings(dependency, readSettings, new Set());
        }
        readSettingsBySetting.set(settingKey, readSettings);
    }

    const finished = new Set<string>();
    const path: string[] = [];

    function visit(settingKey: string): void {
        const cycleStart = path.indexOf(settingKey);
        if (cycleStart !== -1) {
            const cycle = [...path.slice(cycleStart), settingKey].map(getSettingLabel);
            throw new Error(
                `Circular value constraints - those of each setting are resolved from the next one: ${cycle.join(" -> ")}`,
            );
        }
        if (finished.has(settingKey)) {
            return;
        }

        path.push(settingKey);
        for (const readSetting of readSettingsBySetting.get(settingKey) ?? []) {
            visit(readSetting);
        }
        path.pop();
        finished.add(settingKey);
    }

    for (const settingKey of readSettingsBySetting.keys()) {
        visit(settingKey);
    }
}

function collectReadSettings(dependency: AnyDependency, readSettings: Set<string>, visited: Set<AnyDependency>): void {
    if (visited.has(dependency)) {
        return;
    }
    visited.add(dependency);

    for (const settingKey of dependency.getReadLocalSettingKeys()) {
        readSettings.add(settingKey);
    }
    for (const sharedResult of dependency.getReadSharedResults()) {
        collectReadSettings(sharedResult, readSettings, visited);
    }
}

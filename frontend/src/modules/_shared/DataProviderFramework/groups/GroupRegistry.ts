import type { GroupType } from "./groupTypes";

import type { DataProviderManager } from "../framework/DataProviderManager/DataProviderManager";
import { Group } from "../framework/Group/Group";
import type { CustomGroupImplementation } from "../interfacesAndTypes/customGroupImplementation";

export class GroupRegistry {
    private static _registeredGroups: Map<
        GroupType,
        {
            group: { new (customParams?: any): CustomGroupImplementation };
            customParams?: any;
        }
    > = new Map();

    static registerGroup<TGroup extends { new (params?: any): CustomGroupImplementation }>(
        name: GroupType,
        group: TGroup,
        customParams?: ConstructorParameters<TGroup>,
    ): void {
        if (this._registeredGroups.has(name)) {
            throw new Error(`Group ${name} already registered`);
        }
        this._registeredGroups.set(name, {
            group,
            customParams,
        });
    }

    static makeGroup(type: GroupType, dataProviderManager: DataProviderManager, color?: string): Group<any, any> {
        const stored = this._registeredGroups.get(type);
        if (!stored) {
            throw new Error(`Group ${type} not found`);
        }
        const customGroupImplementation = new stored.group(...(stored.customParams ?? []));
        return new Group({
            type,
            dataProviderManager: dataProviderManager,
            customGroupImplementation,
            color,
        });
    }
}

import { DataLayerManager } from "../framework/DataLayerManager/DataLayerManager";
import { Group } from "../framework/Group/Group";
import { CustomGroupImplementation } from "../interfaces";

export class GroupRegistry {
    private static _registeredGroups: Map<
        string,
        {
            group: { new (customParams?: any): CustomGroupImplementation<any, any, any> };
            customParams?: any;
        }
    > = new Map();

    static registerSetting<TGroup extends { new (params?: any): CustomGroupImplementation<any, any, any> }>(
        name: string,
        group: TGroup,
        customParams?: ConstructorParameters<TGroup>
    ): void {
        if (this._registeredGroups.has(name)) {
            throw new Error(`Group ${name} already registered`);
        }
        this._registeredGroups.set(name, {
            group,
            customParams,
        });
    }

    static makeGroup(type: string, layerManager: DataLayerManager, color?: string): Group<any, any, any> {
        const stored = this._registeredGroups.get(type);
        if (!stored) {
            throw new Error(`Group ${type} not found`);
        }
        const customGroupImplementation = new stored.group(...(stored.customParams ?? []));
        return new Group({
            type,
            layerManager,
            customGroupImplementation,
            color,
        });
    }
}

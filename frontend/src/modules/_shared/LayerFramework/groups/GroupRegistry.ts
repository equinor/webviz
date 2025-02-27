import { Group } from "../framework/Group/Group";

export class GroupRegistry {
    private static _registeredGroups: Map<
        string,
        {
            group: { new (customParams?: any): Group<any> };
            customParams?: any;
        }
    > = new Map();

    static registerSetting<TGroup extends { new (params?: any): Group<any, any, any> }>(
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

    static makeGroup(type: string): Group<any> {
        const stored = this._registeredGroups.get(type);
        if (!stored) {
            throw new Error(`Group ${type} not found`);
        }
        const setting = new stored.group(...(stored.customParams ?? []));
        return setting;
    }
}

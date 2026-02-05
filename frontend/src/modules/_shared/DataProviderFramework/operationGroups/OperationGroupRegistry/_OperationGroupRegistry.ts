import type { DataProviderManager } from "../../framework/DataProviderManager/DataProviderManager";
import { OperationGroup } from "../../framework/OperationGroup/OperationGroup";
import type {
    CustomOperationGroupImplementation,
    Operation,
} from "../../interfacesAndTypes/customOperationGroupImplementation";

import type { OperationGroupType } from "./../operationGroupTypes";

export class OperationGroupRegistry {
    private static _registeredGroups: Map<
        OperationGroupType,
        {
            group: { new (customParams?: any): CustomOperationGroupImplementation<any, any, any> };
            customParams?: any;
        }
    > = new Map();

    static registerGroup<TGroup extends { new (params?: any): CustomOperationGroupImplementation<any, any, any> }>(
        name: OperationGroupType,
        group: TGroup,
        customParams?: ConstructorParameters<TGroup>,
    ): void {
        if (this._registeredGroups.has(name)) {
            throw new Error(`Operation group ${name} already registered`);
        }
        this._registeredGroups.set(name, {
            group,
            customParams,
        });
    }

    static makeGroup(
        type: OperationGroupType,
        operation: Operation,
        dataProviderManager: DataProviderManager,
    ): OperationGroup<any, any> {
        const stored = this._registeredGroups.get(type);
        if (!stored) {
            throw new Error(`Operation group ${type} not found`);
        }
        const customOperationGroupImplementation = new stored.group(...(stored.customParams ?? []));
        return new OperationGroup({
            operationGroupType: type,
            operation: operation,
            dataProviderManager: dataProviderManager,
            customOperationGroupImplementation: customOperationGroupImplementation,
        });
    }
}

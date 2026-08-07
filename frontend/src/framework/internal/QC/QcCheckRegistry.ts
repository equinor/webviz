import type { QcCheckDefinition } from "./QcCheck";

export class QcCheckRegistry {
    // Checks are registered with their own concrete `TMetrics`/`TParams`; the registry itself
    // aggregates heterogeneous checks and so cannot know those types, hence `any` here (consumers
    // - `EnsembleQc`/`QcCheckRuntime` - are generic over `unknown` and receive these structurally).
    private static _registeredChecks: Map<string, QcCheckDefinition<any, any>> = new Map();

    static getRegisteredCheck(id: string): QcCheckDefinition<any, any> | undefined {
        return this._registeredChecks.get(id);
    }

    static getRegisteredChecks(): Map<string, QcCheckDefinition<any, any>> {
        return this._registeredChecks;
    }

    static registerCheck(id: string, check: QcCheckDefinition<any, any>): void {
        if (this._registeredChecks.has(id)) {
            throw new Error(`Check with id ${id} is already registered.`);
        }
        this._registeredChecks.set(id, check);
    }
}

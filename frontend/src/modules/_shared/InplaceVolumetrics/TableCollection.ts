import { Table } from "./Table";

export class TableCollection {
    private _collectedBy: string;
    private _collection: Map<string | number, Table>;

    constructor(collectedBy: string, values: (string | number)[], tables: Table[]) {
        this._collectedBy = collectedBy;
        this._collection = new Map();

        if (values.length !== tables.length) {
            throw new Error("Values and tables length do not match");
        }

        for (let i = 0; i < values.length; i++) {
            this._collection.set(values[i], tables[i]);
        }
    }

    getCollectedBy(): string {
        return this._collectedBy;
    }

    getCollectionMap(): Map<string | number, Table> {
        return this._collection;
    }

    getNumTables(): number {
        return this._collection.size;
    }

    getKeys(): (string | number)[] {
        return Array.from(this._collection.keys());
    }

    getTables(): Table[] {
        return Array.from(this._collection.values());
    }

    getTable(key: string | number): Table {
        const item = this._collection.get(key);

        if (!item) {
            throw new Error(`Item not found for key: ${key}`);
        }

        return item;
    }
}

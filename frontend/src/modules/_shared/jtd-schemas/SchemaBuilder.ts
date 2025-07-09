import type { JTDSchemaType } from "ajv/dist/jtd";

import { schemaRegistry } from "./schemaRegistry";

export type RefResolver = <K extends keyof typeof schemaRegistry>(id: K) => (typeof schemaRegistry)[K];

export class SchemaBuilder<T> {
    private used = new Map<string, JTDSchemaType<any>>();

    constructor(private rootFactory: (ctx: { inject: RefResolver }) => JTDSchemaType<T>) {}

    private inject: RefResolver = (id) => {
        const schema = schemaRegistry[id];
        if (!schema) throw new Error(`Unknown schema ID: ${id}`);
        this.used.set(id, schema);
        return schema;
    };

    build(): JTDSchemaType<T> {
        const root = this.rootFactory({ inject: this.inject });
        return root;
    }
}

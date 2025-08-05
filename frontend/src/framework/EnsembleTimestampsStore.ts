import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";

export type EnsembleTimestamps = {
    caseUpdatedAtUtcMs: number;
    dataUpdatedAtUtcMs: number;
};

class EnsembleTimestampsStoreImpl {
    private _timestamps: Map<string, EnsembleTimestamps> = new Map();

    setAll(timestamps: Map<string, EnsembleTimestamps>) {
        this._timestamps = timestamps;
    }

    getLatestTimestamps(...idents: RegularEnsembleIdent[]): EnsembleTimestamps {
        let dataUpdatedAt = 0;
        let caseUpdatedAt = 0;

        for (const ident of idents) {
            const ts = this._timestamps.get(ident.toString());
            if (!ts) continue;

            if (ts.dataUpdatedAtUtcMs && ts.dataUpdatedAtUtcMs > dataUpdatedAt) {
                dataUpdatedAt = ts.dataUpdatedAtUtcMs;
            }
            if (ts.caseUpdatedAtUtcMs && ts.caseUpdatedAtUtcMs > caseUpdatedAt) {
                caseUpdatedAt = ts.caseUpdatedAtUtcMs;
            }
        }

        return { dataUpdatedAtUtcMs: dataUpdatedAt, caseUpdatedAtUtcMs: caseUpdatedAt };
    }

    clear() {
        this._timestamps.clear();
    }
}

export const EnsembleTimestampsStore = new EnsembleTimestampsStoreImpl();

// Attribute -> surface name -> realizations
export type FieldCatalogue = Record<string, Record<string, number[]>>;

export type SurfaceTestData = {
    attribute: string;
    surfaceName: string;
    realization: number;
    values: number[];
};

export type GridTestData = {
    gridName: string;
    numCells: number;
};

export type LabelTestData = {
    showLabels: boolean;
};

export type BackendCall = {
    method: string;
    args: unknown[];
};

/*
 * In-memory stand-in for the backend the test providers fetch from.
 * Every request takes `delayMs` of (fake) time, is recorded in `calls`, and can be made to fail.
 */
export class TestBackend {
    catalogues: Record<string, FieldCatalogue> = {};
    grids: Record<string, Record<string, number>> = {};
    delayMs = 10;
    calls: BackendCall[] = [];

    private _failures = new Map<string, Error>();

    failRequests(method: string, error: Error = new Error(`${method} failed`)): void {
        this._failures.set(method, error);
    }

    stopFailingRequests(method: string): void {
        this._failures.delete(method);
    }

    callsTo(method: string): unknown[][] {
        return this.calls.filter((call) => call.method === method).map((call) => call.args);
    }

    getFieldCatalogue(fieldId: string | null): Promise<FieldCatalogue | null> {
        return this.request("getFieldCatalogue", [fieldId], () =>
            fieldId ? (this.catalogues[fieldId] ?? null) : null,
        );
    }

    getRealizations(fieldId: string | null, attribute: string | null, surfaceName: string | null): Promise<number[]> {
        return this.request("getRealizations", [fieldId, attribute, surfaceName], () => {
            if (!fieldId || !attribute || !surfaceName) {
                return [];
            }
            return this.catalogues[fieldId]?.[attribute]?.[surfaceName] ?? [];
        });
    }

    getSurfaceData(
        fieldId: string,
        attribute: string,
        surfaceName: string,
        realization: number,
    ): Promise<SurfaceTestData> {
        return this.request("getSurfaceData", [fieldId, attribute, surfaceName, realization], () => ({
            attribute,
            surfaceName,
            realization,
            values: [realization, realization * 10],
        }));
    }

    getGridNames(fieldId: string | null): Promise<string[]> {
        return this.request("getGridNames", [fieldId], () => Object.keys((fieldId && this.grids[fieldId]) || {}));
    }

    getGridData(fieldId: string, gridName: string): Promise<GridTestData> {
        return this.request("getGridData", [fieldId, gridName], () => ({
            gridName,
            numCells: this.grids[fieldId]?.[gridName] ?? 0,
        }));
    }

    getLabelData(showLabels: boolean): Promise<LabelTestData> {
        return this.request("getLabelData", [showLabels], () => ({ showLabels }));
    }

    private async request<T>(method: string, args: unknown[], respond: () => T): Promise<T> {
        this.calls.push({ method, args });
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));

        const failure = this._failures.get(method);
        if (failure) {
            throw failure;
        }
        return respond();
    }
}

let currentBackend = new TestBackend();

// Call in beforeEach - the test providers are registered once per file, so they reach the backend through this
export function resetTestBackend(): TestBackend {
    currentBackend = new TestBackend();
    return currentBackend;
}

export function getTestBackend(): TestBackend {
    return currentBackend;
}

class EnsembleFingerprintStoreImpl {
    private _fingerprints: Map<string, string> = new Map();

    setAll(fingerprints: Map<string, string>) {
        this._fingerprints = fingerprints;
    }

    update(fingerprints: Map<string, string>) {
        for (const [key, value] of fingerprints) {
            this._fingerprints.set(key, value);
        }
    }

    getFingerprintFromEnsembleIdentString(ensembleIdentString: string): string | null {
        return this._fingerprints.get(ensembleIdentString) ?? null;
    }

    clear() {
        this._fingerprints.clear();
    }
}

export const EnsembleFingerprintStore = new EnsembleFingerprintStoreImpl();

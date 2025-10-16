import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";

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

    getFingerprints(...idents: RegularEnsembleIdent[]): string[] {
        const fingerprints: string[] = [];

        for (const ident of idents) {
            const key = ident.toString();
            const fingerprint = this._fingerprints.get(key);
            if (fingerprint) {
                fingerprints.push(fingerprint);
            }
        }

        return fingerprints;
    }

    clear() {
        this._fingerprints.clear();
    }
}

export const EnsembleFingerprintStore = new EnsembleFingerprintStoreImpl();

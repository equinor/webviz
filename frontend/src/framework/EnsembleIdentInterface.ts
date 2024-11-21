export interface EnsembleIdentInterface<TImplementation> {
    getEnsembleName(): string;
    toString(): string;
    equals(otherIdent: EnsembleIdentInterface<TImplementation> | null): boolean;
}

export interface EnsembleIdentInterface<TImplementation> {
    getEnsembleName(): string;
    toString(): string;
    equals(otherIdent: TImplementation | null): boolean;
}

import { describe, expect, test } from "vitest";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ChannelReceiverChannelContent, KeyKind } from "@framework/types/dataChannnel";
import { channelContentsToResponses } from "@modules/SensitivityPlot/view/utils/channelContentsToResponses";

const CASE_UUID = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
const ensembleA = new RegularEnsemble("DROGON", ["DROGON"], CASE_UUID, "case1", "iter-0", "sc1", [], [], [], null, "");
const ensembleB = new RegularEnsemble("DROGON", ["DROGON"], CASE_UUID, "case1", "iter-1", "sc2", [], [], [], null, "");
const deltaEnsemble = new DeltaEnsemble(ensembleA, ensembleB, "", null);
const ensembleSet = new EnsembleSet([ensembleA, ensembleB], [deltaEnsemble]);

function makeContent(
    idString: string,
    ensembleIdentString: string,
    data: [number, number][],
): ChannelReceiverChannelContent<KeyKind.REALIZATION[]> {
    return {
        idString,
        displayName: `STOIIP (${idString})`,
        dataArray: data.map(([key, value]) => ({ key, value })),
        metaData: { ensembleIdentString },
    };
}

describe("channelContentsToResponses", () => {
    test("converts every content and preserves the channel order", () => {
        const contents = [
            makeContent("NorthHorst", ensembleA.getIdent().toString(), [
                [1, 10],
                [2, 20],
            ]),
            makeContent("CentralSouth", ensembleA.getIdent().toString(), [[1, 30]]),
            makeContent("WestLowland", ensembleB.getIdent().toString(), [
                [3, 40],
                [4, 50],
            ]),
        ];

        const result = channelContentsToResponses(contents, ensembleSet);

        expect(result.invalidEnsembleType).toBeNull();
        expect(result.responses.map((r) => r.title)).toEqual([
            "STOIIP (NorthHorst)",
            "STOIIP (CentralSouth)",
            "STOIIP (WestLowland)",
        ]);
        expect(result.responses.map((r) => r.idString)).toEqual(["NorthHorst", "CentralSouth", "WestLowland"]);
        expect(result.responses[0].ensemblePerRealResponse).toEqual({
            realizations: [1, 2],
            values: [10, 20],
            name: "STOIIP (NorthHorst)",
            unit: "",
        });
        expect(result.responses[2].ensemblePerRealResponse.realizations).toEqual([3, 4]);
        expect(result.responses[0].channelEnsemble).toBe(ensembleA);
        expect(result.responses[2].channelEnsemble).toBe(ensembleB);
    });

    test("passes the content's unit through", () => {
        const content = makeContent("FOPT", ensembleA.getIdent().toString(), [[1, 10]]);
        const contentWithUnit = { ...content, metaData: { ...content.metaData, unit: "Sm3" } };

        const result = channelContentsToResponses([contentWithUnit], ensembleSet);

        expect(result.responses[0].ensemblePerRealResponse.unit).toBe("Sm3");
    });

    test("reports a delta ensemble in any content", () => {
        const contents = [
            makeContent("NorthHorst", ensembleA.getIdent().toString(), [[1, 10]]),
            makeContent("CentralSouth", deltaEnsemble.getIdent().toString(), [[1, 30]]),
        ];

        const result = channelContentsToResponses(contents, ensembleSet);

        expect(result.invalidEnsembleType).toBe("Delta");
        expect(result.responses).toEqual([]);
    });

    test("reports an ensemble missing from the ensemble set", () => {
        const missingIdent = new RegularEnsembleIdent("22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "iter-0");
        const contents = [makeContent("NorthHorst", missingIdent.toString(), [[1, 10]])];

        const result = channelContentsToResponses(contents, ensembleSet);

        expect(result.invalidEnsembleType).toBe("Invalid");
        expect(result.responses).toEqual([]);
    });
});

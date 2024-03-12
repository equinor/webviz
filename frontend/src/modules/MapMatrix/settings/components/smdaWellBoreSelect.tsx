import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { useWellHeadersQuery } from "@modules/_shared/WellBore";
import { SmdaWellBoreAddress, WellBoreAddressFactory } from "@modules/_shared/WellBore/wellBoreAddress";

export type SmdaWellBoreSelectProps = {
    ensembleIdent?: EnsembleIdent | null;
    selectedWellAddresses: SmdaWellBoreAddress[];
    onWellBoreChange: (selectedWellUuids: SmdaWellBoreAddress[]) => void;
};
export function SmdaWellBoreSelect(props: SmdaWellBoreSelectProps): JSX.Element {
    const wellHeadersQuery = useWellHeadersQuery(props.ensembleIdent?.getCaseUuid());
    let wellHeaderOptions: SelectOption[] = [];

    if (wellHeadersQuery.data) {
        wellHeaderOptions = wellHeadersQuery.data.map((header) => ({
            label: header.unique_wellbore_identifier,
            value: header.wellbore_uuid,
        }));
    }
    const wellBoreAddressFactory = new WellBoreAddressFactory();

    function handleWellsChange(selectedWellUuids: string[]) {
        const newSelectedWellBoreAddresses = selectedWellUuids.map((wellUuid) => {
            return wellBoreAddressFactory.createSmdaAddress(wellUuid);
        });
        props.onWellBoreChange(newSelectedWellBoreAddresses);
    }

    return (
        <QueryStateWrapper
            queryResult={wellHeadersQuery}
            errorComponent={"Error loading wells"}
            loadingComponent={<CircularProgress />}
        >
            <Label text="Official Wells">
                <>
                    <div>
                        <Button
                            className="float-left m-2 text-xs py-0"
                            variant="outlined"
                            onClick={() => handleWellsChange(wellHeaderOptions.map((well) => well.value))}
                        >
                            Select all
                        </Button>
                        <Button className="m-2 text-xs py-0" variant="outlined" onClick={() => handleWellsChange([])}>
                            Select none
                        </Button>
                    </div>
                    <Select
                        options={wellHeaderOptions}
                        value={props.selectedWellAddresses.map((addr) => addr.uuid)}
                        onChange={handleWellsChange}
                        size={10}
                        multiple={true}
                    />
                </>
            </Label>
        </QueryStateWrapper>
    );
}

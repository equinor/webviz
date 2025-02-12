import asyncio
import pyarrow as pa
from fmu.sumo.explorer.objects import Case


from primary.services.service_exceptions import InvalidDataError, MultipleDataMatchesError, Service, NoDataError


from ._helpers import create_sumo_client, create_sumo_case_async


class WellCompletionsAccess:
    """
    Class for accessing and retrieving well completions data
    """

    TAGNAME = "wellcompletiondata"

    def __init__(self, case: Case, iteration_name: str):
        self._case: Case = case
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(
        cls, access_token: str, case_uuid: str, iteration_name: str
    ) -> "WellCompletionsAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return WellCompletionsAccess(case=case, iteration_name=iteration_name)

    async def get_well_completions_single_realization_table_async(self, realization: int) -> pa.Table | None:
        """Get well completions table for single realization"""
        well_completions_table_collection = self._case.tables.filter(
            tagname=WellCompletionsAccess.TAGNAME, realization=realization, iteration=self._iteration_name
        )

        if len(well_completions_table_collection) == 0:
            raise NoDataError(
                f"No well completions data found for realization {realization} for Case {self._case}, iteration {self._iteration_name}",
                service=Service.SUMO,
            )

        if len(well_completions_table_collection) > 1:
            raise MultipleDataMatchesError(
                f"Multiple tables found for realization {realization} for Case {self._case}, iteration {self._iteration_name}",
                service=Service.SUMO,
            )

        well_completions_table = await well_completions_table_collection[0].to_arrow_async()
        return well_completions_table

    async def get_well_completions_table_async(self) -> pa.Table:
        """Get assembled well completions table for multiple realizations, i.e. assemble from collection into single table

        Expected table columns: ["WELL", "DATE", "ZONE", "REAL", "OP/SH", "KH"]
        """

        # With multiple realizations, expect one table with aggregated OP/SH and one with aggregate KH data
        well_completions_table_collection = self._case.tables.filter(
            tagname=WellCompletionsAccess.TAGNAME, aggregation="collection", iteration=self._iteration_name
        )

        num_tables = await well_completions_table_collection.length_async()
        if num_tables == 0:
            raise NoDataError(
                f"No well completions collection data found for Case {self._case}, iteration {self._iteration_name}",
                service=Service.SUMO,
            )

        # As of now, two tables are expected - one with OP/SH and one with KH
        if num_tables != 2:
            raise InvalidDataError(
                f"Expected 2 tables (OP/SH and KH) but got {len(well_completions_table_collection)}, for Case {self._case}, iteration {self._iteration_name}",
                service=Service.SUMO,
            )

        # Download in parallel
        tasks = [asyncio.create_task(table.to_arrow_async()) for table in well_completions_table_collection]
        arrow_tables: list[pa.Table] = await asyncio.gather(*tasks)
        first_table = arrow_tables[0]
        second_table = arrow_tables[1]

        # Validate columns and ensure equal column content in both tables
        expected_common_columns = set(["WELL", "DATE", "ZONE", "REAL"])
        self._validate_common_table_columns(expected_common_columns, first_table, second_table)

        # Assemble tables into single table
        # - Expect "OP/SH" to be in first or second table, and "KH" to be in the other table
        if "OP/SH" in first_table.column_names and "KH" in second_table.column_names:
            well_completions_table = first_table
            well_completions_table = well_completions_table.append_column("KH", second_table["KH"])
            return well_completions_table
        if "OP/SH" in second_table.column_names and "KH" in first_table.column_names:
            well_completions_table = second_table
            well_completions_table = well_completions_table.append_column("KH", first_table["KH"])
            return well_completions_table

        raise NoDataError('Expected columns "OP/SH" and "KH" not found in tables', service=Service.SUMO)

    @staticmethod
    def _validate_common_table_columns(
        common_column_names: set[str], first_table: pa.Table, second_table: pa.Table
    ) -> None:
        """
        Validates that the two pa.Table contains same common columns and that the columns have the same content,
        raises value error if not matching.
        """
        # Ensure expected common columns are present
        if not common_column_names.issubset(first_table.column_names):
            raise InvalidDataError(
                f"Expected columns of first table: {common_column_names} - got: {first_table.column_names}",
                Service.SUMO,
            )
        if not common_column_names.issubset(second_table.column_names):
            raise InvalidDataError(
                f"Expected columns of second table: {common_column_names} - got: {second_table.column_names}",
                Service.SUMO,
            )

        # Verify equal values for common columns in both tables
        for column_name in common_column_names:
            if not first_table[column_name].equals(second_table[column_name]):
                raise InvalidDataError(
                    f'Expected equal column content for column "{column_name}" in first and second table', Service.SUMO
                )

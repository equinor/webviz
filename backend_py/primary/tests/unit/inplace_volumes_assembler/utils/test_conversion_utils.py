import pytest

import re
import polars as pl

from primary.services.sumo_access.inplace_volumes_table_types import CalculatedVolume, InplaceVolumes, Property

from primary.services.inplace_volumes_table_assembler._utils.conversion_utils import (
    create_inplace_volumes_table_data_from_fluid_results_df,
    create_repeated_table_column_data_from_polars_column,
    get_available_calculated_volumes_from_volume_names,
    get_available_properties_from_volume_names,    
    get_calculated_volumes_among_result_names,
    get_fluid_from_string,
    get_index_column_from_string,
    get_properties_among_result_names,
    get_required_volume_names_and_categorized_result_names,
    get_required_volume_names_from_calculated_volumes,
    get_required_volume_names_from_properties,
    get_required_volume_names_from_property,
    get_valid_result_names_from_list,
)


def test_get_valid_result_names_from_list() -> None:
    """
    Valid result names are found in InplaceVolumetricResultName enum.
    """

    requested_result_names = [
        "STOIIP",
        "GIIP",
        "FIRST_INVALID_RESULT_NAME",
        "NTG",
        "BG",
        "SW",
        "SECOND_INVALID_RESULT_NAME",
    ]

    # Valid result names from InplaceVolumetricResultName enum
    exepected_valid_result_names = ["STOIIP", "GIIP", "NTG", "BG", "SW"]
    valid_result_names = get_valid_result_names_from_list(requested_result_names)

    assert valid_result_names == exepected_valid_result_names


def test_get_fluid_from_string_valid() -> None:
    """
    Test that valid fluid strings are correctly converted to InplaceVolumes.Fluid enum values.
    """
    assert get_fluid_from_string("oil") == InplaceVolumes.Fluid.oil
    assert get_fluid_from_string("gas") == InplaceVolumes.Fluid.gas
    assert get_fluid_from_string("water") == InplaceVolumes.Fluid.water
    assert get_fluid_from_string("INVALID_FLUID") is None
    assert get_fluid_from_string("") is None


def test_get_index_column_from_string_valid() -> None:
    """
    Test that valid index strings are correctly converted to InplaceVolumes.TableIndexColumns enum values.
    """

    assert get_index_column_from_string("FLUID") == InplaceVolumes.TableIndexColumns.FLUID
    assert get_index_column_from_string("REGION") == InplaceVolumes.TableIndexColumns.REGION
    assert get_index_column_from_string("ZONE") == InplaceVolumes.TableIndexColumns.ZONE
    assert get_index_column_from_string("FACIES") == InplaceVolumes.TableIndexColumns.FACIES

    assert get_index_column_from_string("INVALID_INDEX") is None
    assert get_index_column_from_string("") is None
    assert get_index_column_from_string("fluid") is None  # Case sensitive check


def test_get_calculated_volumes_among_result_names() -> None:
    """
    Test that calculated volumes are correctly identified among result names.
    """

    # Test with mixed result names including calculated volumes
    result_names = [
        "STOIIP",
        "GIIP",
        "STOIIP_TOTAL",  # CalculatedVolume
        "NTG",
        "GIIP_TOTAL",  # CalculatedVolume
        "INVALID_NAME",
    ]

    calculated_volumes = get_calculated_volumes_among_result_names(result_names)

    # Sort alphabetically for consistent comparison
    calculated_volumes.sort()

    # Check that the correct calculated volumes are identified
    assert calculated_volumes == ["GIIP_TOTAL", "STOIIP_TOTAL"]


def test_get_calculated_volumes_empty_result() -> None:
    """
    Test the function when there are no calculated volumes in the input.
    """

    # Test with no calculated volumes
    result_names = ["STOIIP", "GIIP", "NTG", "INVALID_NAME"]

    calculated_volumes = get_calculated_volumes_among_result_names(result_names)

    # Check that no calculated volumes are identified
    assert calculated_volumes == []


def test_get_properties_among_result_names() -> None:
    """
    Test that properties are correctly identified among result names.
    """

    # Test with mixed result names including properties
    result_names = [
        "STOIIP",
        "GIIP",
        "NTG",  # Property
        "PORO",  # Property
        "SW",  # Property
        "INVALID_NAME",
    ]

    properties = get_properties_among_result_names(result_names)

    # Sort alphabetically for consistent comparison
    properties.sort()

    # Check that the correct properties are identified
    assert properties == ["NTG", "PORO", "SW"]


def test_get_properties_among_result_names_empty() -> None:
    """
    Test the function when there are no properties in the input.
    """

    # Test with no properties
    result_names = ["STOIIP", "GIIP", "INVALID_NAME"]

    properties = get_properties_among_result_names(result_names)

    # Check that no properties are identified
    assert properties == []


def test_get_required_volume_names_from_property() -> None:
    """
    Test that the correct volume names are returned for each property.
    """

    # Test NTG property
    assert get_required_volume_names_from_property(Property.NTG.value) == [
        InplaceVolumes.VolumetricColumns.BULK.value,
        InplaceVolumes.VolumetricColumns.NET.value,
    ]

    # Test PORO property
    assert get_required_volume_names_from_property(Property.PORO.value) == [
        InplaceVolumes.VolumetricColumns.BULK.value,
        InplaceVolumes.VolumetricColumns.PORV.value,
    ]

    # Test PORO_NET property
    assert get_required_volume_names_from_property(Property.PORO_NET.value) == [
        InplaceVolumes.VolumetricColumns.PORV.value,
        InplaceVolumes.VolumetricColumns.NET.value,
    ]

    # Test SW property
    assert get_required_volume_names_from_property(Property.SW.value) == [
        InplaceVolumes.VolumetricColumns.HCPV.value,
        InplaceVolumes.VolumetricColumns.PORV.value,
    ]

    # Test BO property
    assert get_required_volume_names_from_property(Property.BO.value) == [
        InplaceVolumes.VolumetricColumns.HCPV.value,
        InplaceVolumes.VolumetricColumns.STOIIP.value,
    ]

    # Test BG property
    assert get_required_volume_names_from_property(Property.BG.value) == [
        InplaceVolumes.VolumetricColumns.HCPV.value,
        InplaceVolumes.VolumetricColumns.GIIP.value,
    ]

    # Test invalid property
    with pytest.raises(ValueError, match="Unhandled property: INVALID_PROPERTY"):
        get_required_volume_names_from_property("INVALID_PROPERTY")


def test_get_required_volume_names_from_properties() -> None:
    """
    Test that the correct volume names are returned for requested properties.
    """
    # Test with a single property
    single_property = ["NTG"]
    assert sorted(get_required_volume_names_from_properties(single_property)) == sorted(
        [InplaceVolumes.VolumetricColumns.BULK.value, InplaceVolumes.VolumetricColumns.NET.value]
    )

    # Test with multiple properties
    multiple_properties = ["NTG", "PORO", "SW"]
    assert sorted(get_required_volume_names_from_properties(multiple_properties)) == sorted(
        [
            InplaceVolumes.VolumetricColumns.BULK.value,
            InplaceVolumes.VolumetricColumns.NET.value,
            InplaceVolumes.VolumetricColumns.PORV.value,
            InplaceVolumes.VolumetricColumns.HCPV.value,
        ]
    )

    # Test with empty properties
    empty_properties = []
    assert get_required_volume_names_from_properties(empty_properties) == []


def test_get_available_properties_from_volume_names():
    """
    Test that the correct properties are identified based on available volume names.
    """
    # Test with only NTG-related volumes
    ntg_volumes = [
        InplaceVolumes.VolumetricColumns.BULK.value,
        InplaceVolumes.VolumetricColumns.NET.value,
    ]
    assert get_available_properties_from_volume_names(ntg_volumes) == ["NTG"]

    # Test with volumes for multiple specific properties
    multiple_volumes = [
        InplaceVolumes.VolumetricColumns.BULK.value,
        InplaceVolumes.VolumetricColumns.NET.value,
        InplaceVolumes.VolumetricColumns.PORV.value,
    ]
    properties = get_available_properties_from_volume_names(multiple_volumes)
    properties.sort()
    assert properties == ["NTG", "PORO", "PORO_NET"]

    # Test with insufficient volume names (missing NET for NTG)
    insufficient_volumes = [
        InplaceVolumes.VolumetricColumns.BULK.value,
    ]
    assert get_available_properties_from_volume_names(insufficient_volumes) == []


def test_get_required_volume_names_from_calculated_volumes() -> None:
    """
    Test that the correct volume names are returned for requested calculated volumes.
    """

    first_calculated_volumes = [CalculatedVolume.STOIIP_TOTAL.value]
    second_calculated_volumes = [CalculatedVolume.STOIIP_TOTAL.value, CalculatedVolume.GIIP_TOTAL.value]
    empty_calculated_volumes = []

    assert get_required_volume_names_from_calculated_volumes(first_calculated_volumes) == [
        InplaceVolumes.VolumetricColumns.STOIIP.value,
        InplaceVolumes.VolumetricColumns.ASSOCIATEDOIL.value,
    ]
    assert get_required_volume_names_from_calculated_volumes(second_calculated_volumes) == [
        InplaceVolumes.VolumetricColumns.STOIIP.value,
        InplaceVolumes.VolumetricColumns.ASSOCIATEDOIL.value,
        InplaceVolumes.VolumetricColumns.GIIP.value,
        InplaceVolumes.VolumetricColumns.ASSOCIATEDGAS.value,
    ]
    assert get_required_volume_names_from_calculated_volumes(empty_calculated_volumes) == []

def test_get_available_calculated_volumes_from_volume_names() -> None:
    """
    Test that the correct calculated volumes are identified based on available volume names.
    """

    # Test with STOIIP_TOTAL calculated volume
    first_volumes = [
        InplaceVolumes.VolumetricColumns.STOIIP.value,
        InplaceVolumes.VolumetricColumns.GIIP.value,
        InplaceVolumes.VolumetricColumns.ASSOCIATEDOIL.value,
    ]
    second_volumes = [InplaceVolumes.VolumetricColumns.GIIP.value, InplaceVolumes.VolumetricColumns.ASSOCIATEDGAS.value]
    third_volumes = [
        InplaceVolumes.VolumetricColumns.STOIIP.value,
        InplaceVolumes.VolumetricColumns.GIIP.value,
    ]

    assert get_available_calculated_volumes_from_volume_names(first_volumes) == [CalculatedVolume.STOIIP_TOTAL.value]
    assert get_available_calculated_volumes_from_volume_names(second_volumes) == [CalculatedVolume.GIIP_TOTAL.value]
    assert get_available_calculated_volumes_from_volume_names(third_volumes) == []
    
#####################    
def test_get_required_volume_names_and_categorized_result_names() -> None:
    """
    Test the function that gets required volume names and categorized result names.
    """
    # Test with a mix of volume names, properties, calculated volumes and an invalid name
    result_names = [
        "BULK", "NET", "PORV",  # Volume names
        "NTG", "PORO",  # Properties
        "STOIIP_TOTAL",  # Calculated volume
        "INVALID_RESULT_NAME",  # Invalid name
    ]
    
    required_volume_names, categorized_results = get_required_volume_names_and_categorized_result_names(result_names)
    
    # Check that required volume names includes:
    # - The original volume names (BULK, NET, PORV)
    # - Volumes required for properties: NET, BULK for NTG; BULK, PORV for PORO
    # - Volumes required for calculated volumes: STOIIP, ASSOCIATEDOIL for STOIIP_TOTAL
    expected_volume_names = {
        "BULK", "NET", "PORV", 
        "STOIIP", "ASSOCIATEDOIL"
    }
    assert required_volume_names == expected_volume_names
    
    # Check categorized results
    assert sorted(categorized_results.volume_names) == ["BULK", "NET", "PORV"]
    assert sorted(categorized_results.property_names) == ["NTG", "PORO"]
    assert categorized_results.calculated_volume_names == ["STOIIP_TOTAL"]


def test_create_repeated_table_column_data_from_polars_number_column() -> None:
    # Test case 1: Basic functionality
    column_name = "test_column"
    column_values = [1, 3, 3, 2, 1]
    expected_sorted_unique_values = [1, 2, 3]

    result = create_repeated_table_column_data_from_polars_column(column_name, pl.Series(column_values))

    # Build the result values
    result_values = [result.unique_values[i] for i in result.indices]

    # Note: unique() method might not preserve the order of the unique values, thus we sort the unique values for comparison
    # and build the result_values list to compare with the original values
    assert result.column_name == column_name
    assert sorted(result.unique_values) == expected_sorted_unique_values
    assert result_values == column_values


def test_create_repeated_table_column_data_from_polars_string_column() -> None:
    # Test case 2: String values
    column_name = "string_column"
    column_values = ["a", "b", "a", "c", "b"]
    expected_sorted_unique_values = ["a", "b", "c"]

    result = create_repeated_table_column_data_from_polars_column(column_name, pl.Series(column_values))

    # Build the result values
    result_values = [result.unique_values[i] for i in result.indices]

    # Note: unique() method might not preserve the order of the unique values, thus we sort the unique values for comparison
    # and build the result_values list to compare with the original values
    assert result.column_name == column_name
    assert sorted(result.unique_values) == expected_sorted_unique_values
    assert result_values == column_values


def test_create_repeated_table_column_data_from_polars_empty_column() -> None:
    # Test case 3: Empty column
    column_name = "empty_column"
    column_values = pl.Series([])
    expected_unique_values: list[str | int] = []
    expected_indices: list[int] = []

    result = create_repeated_table_column_data_from_polars_column(column_name, column_values)

    assert result.column_name == column_name
    assert result.unique_values == expected_unique_values
    assert result.indices == expected_indices


def test_create_repeated_table_column_data_from_polars_single_value_column() -> None:
    # Test case 4: Single value column
    column_name = "single_value_column"
    column_values = pl.Series([42, 42, 42])
    expected_unique_values = [42]
    expected_indices = [0, 0, 0]

    result = create_repeated_table_column_data_from_polars_column(column_name, column_values)

    assert result.column_name == column_name
    assert result.unique_values == expected_unique_values
    assert result.indices == expected_indices

def test_create_inplace_volumes_table_data_from_fluid_results_df() -> None:
    # Test case 1: Basic functionality
    result_df = pl.DataFrame(
        {
            "REAL": [1, 2, 3],
            "ZONE": ["A", "B", "C"],
            "REGION": ["X", "Y", "Z"],
            "FACIES": ["F1", "F2", "F3"],
            "STOIIP": [100, 200, 300],
            "GIIP": [400, 500, 600],
        }
    )
    fluid_value = "oil"

    result = create_inplace_volumes_table_data_from_fluid_results_df(result_df, fluid_value)

    assert result.fluid_selection == fluid_value
    assert len(result.selector_columns) == 4
    assert len(result.result_columns) == 2


def test_create_inplace_volumes_table_data_from_fluid_results_df_no_selector_columns() -> None:
    # Test case 2: No selector columns
    result_df = pl.DataFrame({"STOIIP": [100, 200, 300], "GIIP": [400, 500, 600]})
    fluid_value = "oil"

    result = create_inplace_volumes_table_data_from_fluid_results_df(result_df, fluid_value)

    assert result.fluid_selection == fluid_value
    assert len(result.selector_columns) == 0
    assert len(result.result_columns) == 2


def test_create_inplace_volumes_table_data_from_fluid_results_df_no_result_columns() -> None:
    # Test case 3: No result columns
    result_df = pl.DataFrame(
        {"REAL": [1, 2, 3], "ZONE": ["A", "B", "C"], "REGION": ["X", "Y", "Z"], "FACIES": ["F1", "F2", "F3"]}
    )
    fluid_value = "oil"

    result = create_inplace_volumes_table_data_from_fluid_results_df(result_df, fluid_value)

    assert result.fluid_selection == fluid_value
    assert len(result.selector_columns) == 4
    assert len(result.result_columns) == 0


def test_create_inplace_volumes_table_data_from_fluid_results_df_empty_df() -> None:
    # Test case 4: Empty DataFrame
    result_df = pl.DataFrame()
    fluid_value = "oil"

    result = create_inplace_volumes_table_data_from_fluid_results_df(result_df, fluid_value)

    assert result.fluid_selection == fluid_value
    assert len(result.selector_columns) == 0
    assert len(result.result_columns) == 0

def test_create_inplace_volumes_table_data_from_fluid_results_df_assert_fluid_column() -> None:
    result_df = pl.DataFrame(
        {"REAL": [1, 2, 3], "FLUID": ["oil", "oil", "oil"], "REGION": ["X", "Y", "Z"], "FACIES": ["F1", "F2", "F3"]}        
    )

    fluid_value = "oil"
    with pytest.raises(ValueError, match=re.escape(
        "Results DataFrame for specified fluid should not contain 'FLUID' column, but found it in the input DataFrame: ['REAL', 'FLUID', 'REGION', 'FACIES']"
    )):
        create_inplace_volumes_table_data_from_fluid_results_df(result_df, fluid_value)
    
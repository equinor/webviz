import pytest
import numpy as np

from primary.routers.timeseries import router
from primary.routers.timeseries import schemas


@pytest.mark.parametrize(
    ["frequency", "date_count", "expected_mean"],
    [
        (schemas.Frequency.DAILY, 913, 4003818.89),
        (schemas.Frequency.WEEKLY, 132, 4024404.62),
        (schemas.Frequency.MONTHLY, 31, 4000047.83),
        (schemas.Frequency.YEARLY, 4, 4445506.56),
    ],
)
async def test_get_realizations_vector_data_dates(
    test_user, sumo_test_ensemble_ahm, frequency, date_count, expected_mean
) -> None:

    realization_data = await router.get_realizations_vector_data(
        None,
        test_user,
        sumo_test_ensemble_ahm.case_uuid,
        sumo_test_ensemble_ahm.ensemble_name,
        "FOPT",
        frequency,
    )

    # check the first realization
    first_real_results = realization_data[0]
    assert isinstance(first_real_results, schemas.VectorRealizationData)
    assert len(first_real_results.timestamps_utc_ms) == date_count
    assert np.isclose(np.mean(first_real_results.values), expected_mean, atol=1e-5)


@pytest.mark.parametrize(
    ["realizations", "real_count", "expected_mean"],
    [
        (None, 100, 3945757.89),
        ([0, 1, 2, 3, 4, 5], 6, 4074376.18),
        ([0, 10, 99], 3, 4384017.10),
    ],
)
async def test_get_realizations_vector_data_realizations(
    test_user, sumo_test_ensemble_ahm, realizations, real_count, expected_mean
) -> None:

    realization_data = await router.get_realizations_vector_data(
        None,
        test_user,
        sumo_test_ensemble_ahm.case_uuid,
        sumo_test_ensemble_ahm.ensemble_name,
        "FOPT",
        schemas.Frequency.YEARLY,
        realizations,
    )

    assert len(realization_data) == real_count
    values_mean = [np.mean(realization.values) for realization in realization_data]
    assert np.isclose(np.mean(values_mean), expected_mean, atol=1e-5)

from typing import List


from webviz_pkg.core_utils.perf_timer import PerfTimer
from ._get_request import get
from .. import schemas


async def get_casing_for_wellbore(access_token: str, wellbore_uuid: str) -> List[str]:
    endpoint = f"Wellbores/{wellbore_uuid}/casing"
    params = {"source": "dbr"}
    timer = PerfTimer()
    results = await get(access_token=access_token, endpoint=endpoint, params=params)
    print(f"TIME SSDL fetch casing for wellbore {wellbore_uuid} took {timer.lap_s():.2f} seconds")
    # min_md = min([res["md_top"] for res in result])
    # max_md = max([res["md_bottom"] for res in result])
    # modes = [res["completion_mode"] for res in result]
    # print(set(modes))
    # print(min_md, max_md)
    # print(result)
    casing = [schemas.WellBoreCasing(**result) for result in results]
    return casing

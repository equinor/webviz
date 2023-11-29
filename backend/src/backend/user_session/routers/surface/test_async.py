# type: ignore
# for now

from typing import List, Tuple
import logging
from aiocache import cached
import numpy as np
from fastapi.responses import ORJSONResponse

import xtgeo
from vtkmodules.util.numpy_support import vtk_to_numpy
from fastapi import APIRouter, Depends, Request, Body

from src.backend.auth.auth_helper import AuthenticatedUser, AuthHelper

from src.services.sumo_access.surface_access import SurfaceAccess

from src.backend.primary.routers.surface import schemas


async def async_get_cached_surf(authenticated_user: AuthenticatedUser, polyline):
    for name in polyline.names:
        for real in polyline.realization_nums:
            surf = await get_realization_surface_data(
                authenticated_user,
                polyline.case_uuid,
                polyline.ensemble_name,
                name,
                polyline.attribute,
                real,
            )
            surf.name = name

            yield surf


def cache_key_with_user_id(func, *args, **kwargs):
    new_args = []
    for arg in args:
        if isinstance(arg, AuthenticatedUser):
            new_args.append(arg._user_id)
        else:
            new_args.append(arg)

    new_kwargs = {
        k: (v._user_id if isinstance(v, AuthenticatedUser) else v)
        for k, v in kwargs.items()
    }
    print("new_args", new_args, flush=True)
    print("new_kwargs", new_kwargs, flush=True)
    return (func.__qualname__, tuple(new_args), frozenset(new_kwargs.items()))


@cached(ttl=3600, key_builder=cache_key_with_user_id)
async def get_realization_surface_data(
    authenticated_user: AuthenticatedUser,
    case_uuid,
    ensemble_name,
    surface_name,
    attribute_name,
    realization_num,
) -> xtgeo.RegularSurface:
    access = await SurfaceAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(),
        case_uuid,
        ensemble_name,
    )
    xtgeo_surf = await access.get_realization_surface_data_async(
        real_num=realization_num,
        name=surface_name,
        attribute=attribute_name,
    )
    return xtgeo_surf

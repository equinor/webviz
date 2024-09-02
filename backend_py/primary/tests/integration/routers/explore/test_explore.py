from primary.routers.explore import router,  FieldInfo, CaseInfo,EnsembleInfo, EnsembleDetails




async def test_get_fields(test_user) -> None:
    print(dir(router))
    field_list = await router.get_fields(test_user)
    assert isinstance(field_list, list[FieldInfo])

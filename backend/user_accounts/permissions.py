def is_in_group(user, group_name: str) -> bool:
    return (
        user.is_authenticated
        and user.groups.filter(name=group_name).exists()
    )


def is_press_or_webmaster(user) -> bool:
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or is_in_group(user, "Press")
            or is_in_group(user, "Webmaster")
        )
    )


def is_webmaster(user) -> bool:
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or is_in_group(user, "Webmaster")
        )
    )

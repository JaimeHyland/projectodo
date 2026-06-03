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
            or is_in_group(user, "press")
            or is_in_group(user, "webmaster")
        )
    )


def is_webmaster(user) -> bool:
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or is_in_group(user, "webmaster")
        )
    )


def is_teacher(user) -> bool:
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or is_in_group(user, "teacher")
        )
    )


def is_band_leader(user) -> bool:
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or is_in_group(user, "band_leader")
        )
    )


def is_student(user) -> bool:
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or is_in_group(user, "student")
        )
    )

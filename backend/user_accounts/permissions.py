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

def can_manage_band(user, band):
    return (
        user.is_authenticated
        and
            (is_webmaster(user)
              or band.band_leader_id == user.id
              or user.is_superuser
            )
    )

def can_delete_band(user):
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or is_webmaster(user)
        )
    )

def can_create_band(user):
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or is_webmaster(user)
        )
    )

def can_assign_band_leader(user):
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or is_webmaster(user)
        )
    )

def can_manage_band_page(user, band):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    if user.groups.filter(name="webmaster").exists():
        return True

    return band.band_leader_id == user.id

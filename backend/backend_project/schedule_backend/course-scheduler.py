from datetime import date, timedelta
from dateutil.relativedelta import relativedelta


WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


def generate_session_dates(
    first_date: date,
    weekdays: list[str],
    last_date: date | None = None,
    holiday_periods: list[tuple[date, date]] | None = None,
    public_holidays: list[date] | None = None,
    runs_during_school_holidays: bool = False,
) -> list[date]:
    """
    Generate all valid session dates.

    Includes dates that:
    - fall on one of the specified weekdays
    - are not public holidays
    - are not inside school holiday periods
      unless runs_during_school_holidays=True
    """

    if last_date is None:
        last_date = first_date + relativedelta(months=6)

    holiday_periods = holiday_periods or []
    public_holidays = set(public_holidays or [])

    weekday_numbers = {
        WEEKDAYS[day.lower()]
        for day in weekdays
    }

    def is_in_holiday_period(current_date: date) -> bool:
        return any(
            start <= current_date <= end
            for start, end in holiday_periods
        )

    session_dates = []
    current_date = first_date

    while current_date <= last_date:
        valid_weekday = (
            current_date.weekday() in weekday_numbers
        )

        excluded_by_public_holiday = (
            current_date in public_holidays
        )

        excluded_by_school_holiday = (
            not runs_during_school_holidays
            and is_in_holiday_period(current_date)
        )

        if (
            valid_weekday
            and not excluded_by_public_holiday
            and not excluded_by_school_holiday
        ):
            session_dates.append(current_date)

        current_date += timedelta(days=1)

    return session_dates
    
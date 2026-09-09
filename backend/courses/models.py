from django.conf import settings
from django.db import models, transaction
from django.core.exceptions import ValidationError


VALID_DAYS = {"MO", "TU", "WE", "TH", "FR", "SA", "SU"}


def _values_to_save(instance, update_fields):
    """Validate the resulting row, including values omitted by partial saves."""
    if not update_fields or not instance.pk:
        return instance
    stored = type(instance).objects.get(pk=instance.pk)
    for name in update_fields:
        field = instance._meta.get_field(name)
        setattr(stored, field.attname, getattr(instance, field.attname))
    return stored


def _scheduling_changed(candidate, previous, fields):
    return previous is None or any(
        candidate._meta.get_field(name).to_python(getattr(candidate, name))
        != getattr(previous, name)
        for name in fields
    )


class Location(models.Model):
    LOCATION_TYPE_CHOICES = [
        ("physical", "Physical"),
        ("online", "Online"),
    ]

    location_type = models.CharField(
        max_length=20,
        choices=LOCATION_TYPE_CHOICES,
        default="physical",
    )

    name = models.CharField(max_length=255, blank=True)
    street_address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postcode = models.CharField(max_length=7, blank=True)
    country = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.name
    

class Place(models.Model):
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="places",
    )
    name = models.CharField(max_length=255)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.location.name})"
    


class Course(models.Model):
    STATUS_CHOICES = [("draft", "Draft"), ("active", "Active"), ("cancelled", "Cancelled")]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    SUBJECT_CHOICES = [
        ("guitar", "Guitar"),
        ("ukulele", "Ukulele"),
    ]

    COURSE_TYPE_CHOICES = [
        ("one_to_one", "One-to-one"),
        ("group", "Group"),
    ]

    TERM_TYPE_CHOICES = [
        ("school_term", "School term"),
        ("all_year", "All year"),
    ]

    DURATION_TYPE_CHOICES = [
        ("one_off", "One-off"),
        ("date_range", "Date range"),
    ]

    name = models.CharField(max_length=200)
    course_type = models.CharField(max_length=20, choices=COURSE_TYPE_CHOICES)
    subject = models.CharField(max_length=20, choices=SUBJECT_CHOICES)
    term_type = models.CharField(max_length=20, choices=TERM_TYPE_CHOICES)
    duration_type = models.CharField(max_length=20, choices=DURATION_TYPE_CHOICES)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="courses_taught",
        null=True,
        blank=True,
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="courses_attended",
        blank=True,
    )

    max_participants = models.PositiveIntegerField(default=1)

    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
    )

    default_place = models.ForeignKey(
        Place,
        on_delete=models.PROTECT,
        related_name="courses",
        null=True,
        blank=True,
    )

    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)

    start_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(default=60)

    days_of_week = models.CharField(
        max_length=20,
        blank=True,
        help_text="MO,TU,WE,TH,FR,SA,SU"
    )  # e.g. "Mon,Wed,Fri"

    def __str__(self):
        return self.name
    
    def clean(self):
        super().clean()

        if self.default_place_id and self.location_id:
            place_location_id = (
                Place.objects
                .filter(pk=self.default_place_id)
                .values_list("location_id", flat=True)
                .first()
            )
            if (
                place_location_id is not None
                and place_location_id != self.location_id
            ):
                raise ValidationError({
                    "default_place": (
                        "Default place must belong to the course location."
                    )
                })

        if self.duration_type == "date_range" and not self.end_date:
            raise ValidationError({"end_date": "End date is required for date range courses."})

        if self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date cannot be before start date."})

        if self.duration_type != "one_off" and not self.days_of_week:
            raise ValidationError({"days_of_week": "Days of week are required for recurring courses."})

        if self.days_of_week:
            days = {day.strip() for day in self.days_of_week.split(",") if day.strip()}
            invalid_days = days - VALID_DAYS
            if invalid_days:
                raise ValidationError({
                    "days_of_week": f"Invalid day codes: {', '.join(sorted(invalid_days))}"
                })

    @transaction.atomic
    def save(self, *args, **kwargs):
        from courses.services.course_activation import validate_course_activation
        from courses.services.scheduling_locks import lock_meeting_resources
        if kwargs.get("update_fields") is not None and not kwargs["update_fields"]:
            return
        previous = Course.objects.select_for_update().filter(pk=self.pk).first() if self.pk else None
        candidate = _values_to_save(self, kwargs.get("update_fields"))
        candidate._meta.get_field("status").clean(candidate.status, candidate)
        scheduling_fields = (
            "instructor_id", "location_id", "default_place_id", "term_type",
            "duration_type", "start_date", "end_date", "start_time",
            "duration_minutes", "days_of_week",
        )
        requires_validation = (
            previous is None or previous.status != "active"
            or _scheduling_changed(candidate, previous, scheduling_fields)
        )
        if candidate.status == "active" and requires_validation:
            if candidate._state.adding:
                raise ValidationError({"status": "Save the course as draft before activation."})
            lock_meeting_resources(list(candidate.meetings.all()))
            candidate.full_clean()
            validate_course_activation(candidate)
        return super().save(*args, **kwargs)


class CourseMeeting(models.Model):
    # Inheritance copies the course default at generation time, as before.
    # The stored instructor is never dynamically replaced by a parent default.
    INSTRUCTOR_SOURCE_CHOICES = [
        ("inherited", "Inherited snapshot"),
        ("override", "Meeting-specific"),
        ("open", "Explicitly open"),
    ]
    instructor_source = models.CharField(
        max_length=20, choices=INSTRUCTOR_SOURCE_CHOICES, default="override",
    )
    instructor_open_accepted = models.BooleanField(default=False)
    place_is_open = models.BooleanField(default=False)
    place_open_accepted = models.BooleanField(default=False)

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="meetings",
    )

    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="course_meetings_taught",
        null=True,
        blank=True,
    )

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="course_meetings_attended",
        blank=True,
    )

    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
    )


    default_place = models.ForeignKey(
        Place,
        on_delete=models.PROTECT,
        related_name="default_for_course_meetings",
        null=True,
        blank=True,
    )

    place = models.ForeignKey(
        Place,
        on_delete=models.PROTECT,
        related_name="course_meetings",
        null=True,
        blank=True,
    )


    date = models.DateField()
    start_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(default=60)

    cancelled = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.course.subject} on {self.date} at {self.start_time}"

    @property
    def effective_instructor(self):
        return self.instructor if self.instructor_source != "open" else None

    @property
    def effective_instructor_id(self):
        return self.instructor_id if self.instructor_source != "open" else None

    @property
    def effective_place(self):
        if self.place_is_open:
            return None
        return self.place if self.place_id is not None else self.default_place

    def clean(self):
        super().clean()

        errors = {}
        if self.instructor_source == "open" and self.instructor_id is not None:
            errors["instructor"] = "An explicitly open instructor must be NULL."
        if self.place_is_open and self.place_id is not None:
            errors["place"] = "An explicitly open place cannot have an override."

        if self.default_place_id and self.location_id:
            default_place_location_id = (
                Place.objects
                .filter(pk=self.default_place_id)
                .values_list("location_id", flat=True)
                .first()
            )
            if (
                default_place_location_id is not None
                and default_place_location_id != self.location_id
            ):
                errors["default_place"] = (
                    "Default place must belong to the meeting location."
                )

        if self.place_id and self.location_id:
            place_location_id = (
                Place.objects
                .filter(pk=self.place_id)
                .values_list("location_id", flat=True)
                .first()
            )
            if place_location_id is not None and place_location_id != self.location_id:
                errors["place"] = (
                    "Override place must belong to the meeting location."
                )

        if errors:
            raise ValidationError(errors)
    
    @transaction.atomic
    def save(self, *args, **kwargs):
        from courses.services.course_activation import validate_active_meeting
        from courses.services.scheduling_locks import lock_meeting_resources
        if kwargs.get("update_fields") is not None and not kwargs["update_fields"]:
            return
        # Read current status rather than trusting a cached parent object.
        parent_ids = {self.course_id}
        if self.pk:
            parent_ids.update(CourseMeeting.objects.filter(pk=self.pk)
                              .values_list("course_id", flat=True))
        parents = {course.pk: course for course in
                   Course.objects.select_for_update().filter(pk__in=parent_ids).order_by("pk")}
        candidate = _values_to_save(self, kwargs.get("update_fields"))
        course = parents[candidate.course_id]
        resources = [candidate]
        previous = None
        if self.pk:
            previous = CourseMeeting.objects.filter(pk=self.pk).first()
            if previous:
                resources.append(previous)
        lock_meeting_resources(resources)
        scheduling_fields = (
            "course_id", "instructor_id", "instructor_source",
            "instructor_open_accepted", "location_id", "default_place_id",
            "place_id", "place_is_open", "place_open_accepted",
            "date", "start_time", "duration_minutes", "cancelled",
        )
        if course.status == "active" and _scheduling_changed(candidate, previous, scheduling_fields):
            candidate.full_clean()
            validate_active_meeting(candidate)
        return super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course", "date", "start_time"],
                name="unique_course_meeting_per_course_datetime",
            )
        ]

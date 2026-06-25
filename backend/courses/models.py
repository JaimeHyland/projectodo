from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError


VALID_DAYS = {"MO", "TU", "WE", "TH", "FR", "SA", "SU"}


class Location(models.Model):
    name = models.CharField(max_length=255)
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postcode = models.CharField(max_length=7)
    country = models.CharField(max_length=100)

    def __str__(self):
        return self.name
    

class Place(models.Model):
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="places",
    )
    name = models.CharField(max_length=255)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.location.name})"
    


class Course(models.Model):

    SUBJECT_CHOICES = [
        ("guitar", "Guitar"),
        ("ukulele", "Ukulele"),
    ]

    COURSE_TYPE_CHOICES = [
        ("one-to-one", "One-to-one"),
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

    place = models.ForeignKey(
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

        VALID_DAYS = {"MO", "TU", "WE", "TH", "FR", "SA", "SU"}

        if self.duration_type == "date_range" and not self.end_date:
            raise ValidationError({"end_date": "End date is required for date range courses."})

        if self.duration_type != "one_off" and not self.days_of_week:
            raise ValidationError({"days_of_week": "Days of week are required for recurring courses."})

        if self.days_of_week:
            days = {day.strip() for day in self.days_of_week.split(",") if day.strip()}
            invalid_days = days - VALID_DAYS
            if invalid_days:
                raise ValidationError({
                    "days_of_week": f"Invalid day codes: {', '.join(sorted(invalid_days))}"
                })


class CourseMeeting(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="meetings",
    )

    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="course_meetings_taught",
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
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course", "date", "start_time"],
                name="unique_course_meeting_per_course_datetime",
            )
        ]
    
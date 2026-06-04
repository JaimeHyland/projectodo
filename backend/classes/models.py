from django.conf import settings
from django.db import models


class Location(models.Model):
    name = models.CharField(max_length=255)
    StreetAddress = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postcode = models.CharField(max_length=7)
    country = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Course(models.Model):

    SUBJECT_CHOICES = [
        ("guitar", "Guitar"),
        ("ukulele", "Ukulele"),
    ]

    COURSE_TYPE_CHOICES = [
        ("on-to-one", "One-to-one"),
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


class ClassMeeting(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="meetings"
    )
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="class_meetings_taught",
    )

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="class_meetings_attended",
        blank=True,
    )

    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
    )

    start_datetime = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField()

    cancelled = models.BooleanField(
        default=False
    )

    notes = models.TextField(blank=True)

    def __str__(self):
        return (
            f"{self.course.subject} - "
            f"{self.start_datetime.strftime('%Y-%m-%d %H:%M')}"
        )

    date = models.DateField()
    start_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(default=60)

    def __str__(self):
        return f"{self.course.subject} on {self.date} at {self.start_time}"
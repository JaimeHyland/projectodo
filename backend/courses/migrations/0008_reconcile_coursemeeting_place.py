from django.db import migrations


def add_missing_coursemeeting_place(apps, schema_editor):
    """Repair databases that applied the original destructive 0006."""
    CourseMeeting = apps.get_model("courses", "CourseMeeting")
    table_name = CourseMeeting._meta.db_table

    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor,
                table_name,
            )
        }

    field = CourseMeeting._meta.get_field("place")
    if field.column not in columns:
        schema_editor.add_field(CourseMeeting, field)


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0007_rename_place_course_default_place"),
    ]

    operations = [
        migrations.RunPython(
            add_missing_coursemeeting_place,
            migrations.RunPython.noop,
        ),
    ]

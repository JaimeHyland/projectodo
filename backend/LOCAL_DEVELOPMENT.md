# Local PostgreSQL development

The local database is `projectodo_local` at `127.0.0.1:5433`, served by an isolated
PostgreSQL 17 cluster in `backend/.local-postgres/data`. It does not use or change
the existing PostgreSQL Windows service on port 5432. Connection credentials are
in the ignored `backend/.env`; do not publish that file or `.local-postgres`.
The code-review archive script also excludes this private directory.

From the repository root, start the local database after a reboot:

```powershell
powershell -ExecutionPolicy Bypass -File backend/local-postgres.ps1 start
backend/.venv/Scripts/python.exe backend/manage.py runserver 127.0.0.1:8000
```

Start the frontend in another terminal:

```powershell
npm.cmd run dev
```

To inspect or stop the database:

```powershell
powershell -ExecutionPolicy Bypass -File backend/local-postgres.ps1 status
powershell -ExecutionPolicy Bypass -File backend/local-postgres.ps1 stop
```

The helper launches PostgreSQL in the background without a visible console. It
is not an automatically starting Windows service. Use the start command after
rebooting. If a terminal has its own DATABASE_URL environment variable, remove
that override before starting Django so it reads backend/.env.

On 2026-09-09, 22 application tables were exported from deployment using a
consistent read-only snapshot and restored locally. Every restored row count was
verified against that snapshot. The copy contains 8 users, 4 locations, 5 places,
6 courses and 15 meetings. Login sessions and authentication tokens were omitted;
account password hashes and group memberships were retained. Remote data was not
modified. Locally deployed external media files are not copied by a database dump.

Migration 0009_course_workflow was then applied locally. Its safe default makes
all six imported legacy courses draft; review and activate appropriate courses
before expecting them to appear on the public Courses page. No course was
automatically activated or meeting cancelled/deleted by this setup.

The original deployment .env backup is backend/.env.before-sqlite. The previous
SQLite configuration is backend/.env.before-local-postgres, and backend/db.sqlite3
is retained. These backups, the database files and the deployment dump are ignored
by Git. No scheduled synchronization with deployment is configured.

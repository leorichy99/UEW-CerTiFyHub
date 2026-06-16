# Start the Celery worker (Windows-compatible threads pool)
$env:DJANGO_SETTINGS_MODULE = 'certificate_system.settings'
& .\venv\Scripts\celery.exe -A certificate_system worker -l info -P threads -c 4

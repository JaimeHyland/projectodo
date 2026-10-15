param(
    [ValidateSet("start", "stop", "status")]
    [string]$Action = "status",
    [string]$PostgresBin = "C:\Program Files\PostgreSQL\17\bin"
)

$ErrorActionPreference = "Stop"
$LocalRoot = Join-Path $PSScriptRoot ".local-postgres"
$DataDirectory = Join-Path $LocalRoot "data"
$PgCtl = Join-Path $PostgresBin "pg_ctl.exe"
if (-not (Test-Path -LiteralPath (Join-Path $DataDirectory "PG_VERSION"))) {
    throw "Local PostgreSQL cluster has not been initialized."
}

if ($Action -eq "status") {
    & $PgCtl status -D $DataDirectory
    exit $LASTEXITCODE
}
if ($Action -eq "stop") {
    & $PgCtl stop -D $DataDirectory -m fast -w
    exit $LASTEXITCODE
}

& $PgCtl status -D $DataDirectory *> $null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Local PostgreSQL is already running on 127.0.0.1:5433."
    exit 0
}
$ServerLog = Join-Path $LocalRoot "server.log"
$LocalProcess = Start-Process -FilePath $PgCtl -WindowStyle Hidden -PassThru `
    -ArgumentList @("start", "-D", ('"' + $DataDirectory + '"'), "-l", ('"' + $ServerLog + '"'), "-w") `
    -RedirectStandardOutput (Join-Path $LocalRoot "startup.log") `
    -RedirectStandardError (Join-Path $LocalRoot "startup-error.log")
# Wait only for pg_ctl, not its long-running PostgreSQL descendant.
$LocalProcess.WaitForExit()
& $PgCtl status -D $DataDirectory *> $null
if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL did not start; see startup-error.log and server.log in .local-postgres."
}
Write-Host "Local PostgreSQL is running on 127.0.0.1:5433."

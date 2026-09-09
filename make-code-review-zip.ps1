$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$ZipName = "projectodo-code-review.zip"
$ZipPath = Join-Path $ProjectRoot $ZipName
$TempDir = Join-Path $env:TEMP "projectodo-code-review"

# -------------------------------------------------------------------
# Directories that should never be included
# -------------------------------------------------------------------

$ExcludedDirectories = @(
    ".git",
    ".next",
    ".vercel",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "coverage",
    "htmlcov",
    "dist",
    "build",
    "staticfiles",
    "media",
    "playwright-report",
    "test-results"
)

# -------------------------------------------------------------------
# Exact filenames that must never be included
# -------------------------------------------------------------------

$ExcludedFiles = @(
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
    "cookies.txt",
    "db.sqlite3",
    $ZipName
)

# -------------------------------------------------------------------
# Old standalone scripts known to contain or have contained
# credentials. Normal Django test modules such as courses/tests.py
# are deliberately NOT excluded.
# -------------------------------------------------------------------

$ExcludedCredentialTestFiles = @(
    "test_email.py",
    "test_godaddy.py",
    "test_godaddy2.py",
    "test_godaddy_email.py",
    "test_outlook_email.py",
    "test_strato.py"
)

# -------------------------------------------------------------------
# File extensions useful for source-code review
# -------------------------------------------------------------------

$AllowedExtensions = @(
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".css",
    ".scss",
    ".html",
    ".md",
    ".txt",
    ".toml",
    ".yaml",
    ".yml",
    ".ini",
    ".cfg",
    ".sql",
    ".sh",
    ".ps1"
)

# Useful extensionless project/configuration files
$AllowedExtensionlessFiles = @(
    "Dockerfile",
    "Procfile",
    "requirements",
    "LICENSE"
)

Write-Host ""
Write-Host "Creating Projectodo code-review archive..."
Write-Host ""

# -------------------------------------------------------------------
# Clean temporary staging directory
# -------------------------------------------------------------------

if (Test-Path -LiteralPath $TempDir) {
    Remove-Item -LiteralPath $TempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $TempDir | Out-Null

# -------------------------------------------------------------------
# Copy allowed source files
# -------------------------------------------------------------------

$CopiedCount = 0

Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File | ForEach-Object {

    $File = $_
    $RelativePath = $File.FullName.Substring($ProjectRoot.Length + 1)
    $PathParts = $RelativePath -split '[\\/]'

    # Is the file inside an excluded directory?
    $InExcludedDirectory = $false

    foreach ($Part in $PathParts) {
        if ($ExcludedDirectories -contains $Part) {
            $InExcludedDirectory = $true
            break
        }
    }

    if ($InExcludedDirectory) {
        return
    }

    # Exclude environment files, including variants not explicitly listed
    if (
        $ExcludedFiles -contains $File.Name -or
        $File.Name -like ".env.*"
    ) {
        return
    }

    # Exclude known credential-bearing standalone scripts
    if ($ExcludedCredentialTestFiles -contains $File.Name) {
        return
    }

    # Exclude database/user-data backup files
    if (
        $File.Name -like "*_backup*.json" -or
        $File.Name -like "*backup*.sql" -or
        $File.Name -like "*.dump"
    ) {
        return
    }

    # Exclude obvious private-key/certificate material
    if (
        $File.Extension -in @(
            ".pem",
            ".key",
            ".p12",
            ".pfx",
            ".crt",
            ".cer"
        )
    ) {
        return
    }

    # Only include source/configuration formats
    $Extension = $File.Extension.ToLowerInvariant()

    $IsAllowed =
        ($AllowedExtensions -contains $Extension) -or
        ($AllowedExtensionlessFiles -contains $File.Name)

    if (-not $IsAllowed) {
        return
    }

    $Destination = Join-Path $TempDir $RelativePath
    $DestinationDirectory = Split-Path $Destination -Parent

    if (-not (Test-Path -LiteralPath $DestinationDirectory)) {
        New-Item `
            -ItemType Directory `
            -Path $DestinationDirectory `
            -Force | Out-Null
    }

    # LiteralPath is important because Next.js directories such as
    # [locale] otherwise get interpreted as wildcard expressions.
    Copy-Item `
        -LiteralPath $File.FullName `
        -Destination $Destination

    $CopiedCount++
}

Write-Host "Staged $CopiedCount source/configuration files."
Write-Host ""

# -------------------------------------------------------------------
# Basic secret scan
#
# Known dummy values are allowed:
#   webmaster@example.com
#   test-password
#
# If suspicious values are found, print file, line number and line,
# then stop before creating the ZIP.
# -------------------------------------------------------------------

Write-Host "Scanning staged files for possible secrets..."

$SecretPatterns = @(
    '(?i)-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
    '(?i)aws_access_key_id\s*[=:]\s*["'']?[A-Z0-9]{16,}',
    '(?i)aws_secret_access_key\s*[=:]\s*["'']?[A-Za-z0-9/+=]{30,}',
    '(?i)(password|passwd)\s*[=:]\s*["''][^"'']{8,}["'']',
    '(?i)(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[=:]\s*["''][^"'']{8,}["'']',
    'ghp_[A-Za-z0-9]{30,}',
    'github_pat_[A-Za-z0-9_]{30,}',
    'sk-[A-Za-z0-9_-]{20,}'
)

$SuspiciousMatches = @()

Get-ChildItem -LiteralPath $TempDir -Recurse -File | ForEach-Object {

    $File = $_
    $RelativePath = $File.FullName.Substring($TempDir.Length + 1)

    foreach ($Pattern in $SecretPatterns) {

        $Matches = Select-String `
            -LiteralPath $File.FullName `
            -Pattern $Pattern

        foreach ($Match in $Matches) {

            # Explicitly permit known test/dummy values.
            if (
                $Match.Line -match 'webmaster@example\.com' -or
                $Match.Line -match 'test-password' -or
                $Match.Line -match 'NewTestPassword123!' -or
                $Match.Line -match 'TestPassword123!'
            ) {
                continue
            }

            $SuspiciousMatches += [PSCustomObject]@{
                File       = $RelativePath
                LineNumber = $Match.LineNumber
                Line       = $Match.Line.Trim()
            }
        }
    }
}

if ($SuspiciousMatches.Count -gt 0) {

    Write-Host ""
    Write-Host "STOPPED: possible secrets were found."
    Write-Host ""

    foreach ($Match in $SuspiciousMatches) {
        Write-Host "File: $($Match.File)"
        Write-Host "Line: $($Match.LineNumber)"
        Write-Host "Text: $($Match.Line)"
        Write-Host ""
    }

    Write-Host "No ZIP has been created."
    Write-Host "Review the values above, then run the script again."

    Remove-Item -LiteralPath $TempDir -Recurse -Force

    exit 1
}

Write-Host "No obvious hard-coded secrets found."
Write-Host ""

# -------------------------------------------------------------------
# Create archive
# -------------------------------------------------------------------

if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive `
    -Path "$TempDir\*" `
    -DestinationPath $ZipPath `
    -CompressionLevel Optimal

Remove-Item -LiteralPath $TempDir -Recurse -Force

Write-Host "Created:"
Write-Host $ZipPath
Write-Host ""
Write-Host "Files included: $CopiedCount"
Write-Host ""
Write-Host "The archive contains source/configuration files only."
Write-Host "Common secret files and binary/generated assets are excluded,"
Write-Host "and the staged source has passed a basic credential scan."
Write-Host ""

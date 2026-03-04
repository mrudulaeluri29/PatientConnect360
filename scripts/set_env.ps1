# scripts/set_env.ps1
# Securely create Server\.env for PatientConnect360 on Windows (PowerShell)
# Usage: .\scripts\set_env.ps1

[CmdletBinding()]
param()

function Generate-JwtSecret {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ([System.BitConverter]::ToString($bytes) -replace '-','').ToLower()
}

Write-Host "This script will create or overwrite Server\.env with restricted ACLs."

# Ensure Server folder exists
$envDir = Join-Path -Path (Get-Location) -ChildPath 'Server'
if (-not (Test-Path $envDir)) {
    New-Item -ItemType Directory -Path $envDir | Out-Null
}

# Default DB URL (edit if you want a different default)
$defaultDb = 'postgres://c1997f40621e3820bf19c0b4d3d1e92c7341de58282aaa31c63661364a9c9666:sk_ZxYvOPbRSQwOrW6xyjdf6@db.prisma.io:5432/postgres?sslmode=require'

$db = Read-Host "Database URL [$defaultDb] (press Enter to accept default)"
if ([string]::IsNullOrWhiteSpace($db)) { $db = $defaultDb }

$useGen = Read-Host "Generate a strong JWT_SECRET automatically? (Y/n)"
if ([string]::IsNullOrWhiteSpace($useGen) -or $useGen -match '^[Yy]') {
    $jwt = Generate-JwtSecret
    Write-Host "Generated JWT_SECRET (hex, 48 bytes)."
} else {
    $jwt = Read-Host "Enter JWT_SECRET"
}

$sendgrid = Read-Host "SendGrid API Key (leave blank to skip)"
$smtpFromEmail = Read-Host "SMTP_FROM_EMAIL (leave blank to skip)"
$smtpFromName = Read-Host "SMTP_FROM_NAME (default: MediHealth)"
if ([string]::IsNullOrWhiteSpace($smtpFromName)) { $smtpFromName = 'MediHealth' }

$adminEmail = Read-Host "Admin email (default: admin@example.com)"
if ([string]::IsNullOrWhiteSpace($adminEmail)) { $adminEmail = 'admin@example.com' }

$adminUser = Read-Host "Admin username (default: admin)"
if ([string]::IsNullOrWhiteSpace($adminUser)) { $adminUser = 'admin' }

Write-Host "Enter Admin password (input hidden):"
$securePwd = Read-Host -AsSecureString
$adminPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
)
if ([string]::IsNullOrWhiteSpace($adminPassword)) {
    $adminPassword = 'AdminPass!2026'
    Write-Host "No password entered — using default. Change it after initial run."
}

$adminOverwrite = Read-Host "ADMIN_OVERWRITE? (true/false) (default: false)"
if ([string]::IsNullOrWhiteSpace($adminOverwrite)) { $adminOverwrite = 'false' }

$adminDisplay = Read-Host "ADMIN_DISPLAY_NAME (default: Platform Admin)"
if ([string]::IsNullOrWhiteSpace($adminDisplay)) { $adminDisplay = 'Platform Admin' }

$adminPhone = Read-Host "ADMIN_PHONE (optional)"
$adminSuper = Read-Host "ADMIN_SUPER (true/false) (default: true)"
if ([string]::IsNullOrWhiteSpace($adminSuper)) { $adminSuper = 'true' }

$envPath = Join-Path $envDir '.env'

$envContent = @"
# Server environment configuration for PatientConnect360
DATABASE_URL="$db"
PORT=4000
NODE_ENV=development
JWT_SECRET="$jwt"
SENDGRID_API_KEY="$sendgrid"
SMTP_FROM_EMAIL="$smtpFromEmail"
SMTP_FROM_NAME="$smtpFromName"
COOKIE_NAME=auth
ADMIN_EMAIL="$adminEmail"
ADMIN_USERNAME="$adminUser"
ADMIN_PASSWORD="$adminPassword"
ADMIN_OVERWRITE="$adminOverwrite"
ADMIN_DISPLAY_NAME="$adminDisplay"
ADMIN_PHONE="$adminPhone"
ADMIN_SUPER="$adminSuper"
"@

# Write UTF-8 (no weird encoding surprises)
Set-Content -Path $envPath -Value $envContent -Encoding utf8 -Force

# Restrict file permissions to current user
try {
    $username = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name  # DOMAIN\User
    icacls $envPath /inheritance:r | Out-Null
    icacls $envPath /grant:r "$username:(F)" | Out-Null
    icacls $envPath /remove:g "Everyone" | Out-Null
    icacls $envPath /remove:g "Users" | Out-Null
    Write-Host "Created $envPath and applied restrictive ACLs for user $username."
} catch {
    Write-Warning "Failed to fully set ACLs via icacls. Please restrict access to the file manually."
}

Write-Host "Important: Do NOT commit Server/.env to version control. Add to .gitignore if needed."
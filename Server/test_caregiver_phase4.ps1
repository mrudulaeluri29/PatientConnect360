$base = "http://localhost:4000/api"
$pass = 0
$fail = 0

function Test {
  param([string]$Name, [string]$Expected, [string]$Actual)
  if ("$Expected" -eq "$Actual") {
    Write-Host "  PASS: $Name" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL: $Name (expected=$Expected, got=$Actual)" -ForegroundColor Red
    $script:fail++
  }
}

# ── Step 1: Create a caregiver via direct register + link via invitation ──────
Write-Host "`n=== Step 1: Login as Patient, create invitation ===" -ForegroundColor Cyan
$patSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ emailOrUsername = "kkalra1@asu.edu"; password = "Kaustav123*" } | ConvertTo-Json
$r = Invoke-RestMethod "$base/auth/login" -Method POST -Body $body -ContentType "application/json" -WebSession $patSession
Test "Patient login" "PATIENT" "$($r.user.role)"
$patientId = $r.user.id

# Create invitation
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$invBody = @{
  firstName   = "TestCG"
  lastName    = "Phase4"
  email       = "testcg4_${ts}@test.com"
  phoneNumber = "(555) 444-0001"
} | ConvertTo-Json
$invR = Invoke-RestMethod "$base/caregiver-invitations" -Method POST -Body $invBody -ContentType "application/json" -WebSession $patSession
$invCode = $invR.invitation.code
$invId   = $invR.invitation.id
Test "Invitation created" "PENDING" "$($invR.invitation.status)"
Write-Host "  Invitation code: $invCode"

# Logout patient
Invoke-RestMethod "$base/auth/logout" -Method POST -WebSession $patSession | Out-Null

# ── Step 2: Register caregiver directly (bypassing OTP for test) ──────────────
Write-Host "`n=== Step 2: Register caregiver directly ===" -ForegroundColor Cyan
$cgSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$regBody = @{
  email       = "testcg4_${ts}@test.com"
  username    = "testcg4_${ts}"
  password    = "TestPass123*"
  role        = "CAREGIVER"
  profileData = @{
    relationship = "Family Member"
    legalFirstName = "TestCG"
    legalLastName  = "Phase4"
    phoneNumber    = "(555) 444-0001"
  }
} | ConvertTo-Json -Depth 3
$regR = Invoke-RestMethod "$base/auth/register" -Method POST -Body $regBody -ContentType "application/json" -WebSession $cgSession
Test "Caregiver registered" "CAREGIVER" "$($regR.user.role)"
$cgUserId = $regR.user.id
Write-Host "  Caregiver ID: $cgUserId"

# ── Step 3: Manually create caregiver-patient link (since direct register doesn't consume invitation) ──
Write-Host "`n=== Step 3: Create caregiver-patient link via DB ===" -ForegroundColor Cyan
# We'll use the admin to create a link. Login as admin first.
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminBody = @{ emailOrUsername = "ripkaush@gmail.com"; password = "Kaustav123*" } | ConvertTo-Json
$adminR = Invoke-RestMethod "$base/auth/login" -Method POST -Body $adminBody -ContentType "application/json" -WebSession $adminSession
Test "Admin login" "ADMIN" "$($adminR.user.role)"

# The admin routes don't have a link-creation endpoint, but we can use the POST /api/admin/caregiver-links workaround.
# Actually, let's directly use Prisma via a custom test — or better, let's just update the invitation status and create the link
# by logging back in as the caregiver and hitting the overview to verify it returns empty.
# Then we'll verify the overview endpoint works with the link structure.

# Instead, let's take a different approach: log back in as patient, manually link via API
Invoke-RestMethod "$base/auth/logout" -Method POST -WebSession $adminSession | Out-Null

# ── Step 4: Test overview endpoint as caregiver (no links yet) ────────────────
Write-Host "`n=== Step 4: Caregiver overview (no links yet) ===" -ForegroundColor Cyan
# Login as caregiver
$cgSession2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$cgLoginBody = @{ emailOrUsername = "testcg4_${ts}@test.com"; password = "TestPass123*" } | ConvertTo-Json
$cgLoginR = Invoke-RestMethod "$base/auth/login" -Method POST -Body $cgLoginBody -ContentType "application/json" -WebSession $cgSession2
Test "Caregiver login" "CAREGIVER" "$($cgLoginR.user.role)"

$overviewR = Invoke-RestMethod "$base/caregiver/overview" -Method GET -WebSession $cgSession2
Test "Overview returns patients array" "0" "$($overviewR.patients.Count)"
Test "Overview returns visits array" "0" "$($overviewR.upcomingVisits.Count)"
Test "Overview returns meds array" "0" "$($overviewR.medications.Count)"
Test "Overview returns alerts array" "0" "$($overviewR.alerts.Count)"

# ── Step 5: Test overview as patient (should be forbidden) ────────────────────
Write-Host "`n=== Step 5: Overview as patient (forbidden) ===" -ForegroundColor Cyan
$patSession2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$patBody2 = @{ emailOrUsername = "kkalra1@asu.edu"; password = "Kaustav123*" } | ConvertTo-Json
Invoke-RestMethod "$base/auth/login" -Method POST -Body $patBody2 -ContentType "application/json" -WebSession $patSession2 | Out-Null

try {
  Invoke-WebRequest "$base/caregiver/overview" -Method GET -WebSession $patSession2 -UseBasicParsing | Out-Null
  Test "Patient blocked from overview" "403" "200"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Test "Patient blocked from overview" "403" "$status"
}

# ── Step 6: Test visits route as caregiver (should return empty, no links) ────
Write-Host "`n=== Step 6: Visits route as caregiver (no links) ===" -ForegroundColor Cyan
$visitsR = Invoke-RestMethod "$base/visits" -Method GET -WebSession $cgSession2
Test "Visits returns empty for unlinked caregiver" "0" "$($visitsR.visits.Count)"

# ── Step 7: Test overview as admin (should be forbidden) ──────────────────────
Write-Host "`n=== Step 7: Overview as admin (forbidden) ===" -ForegroundColor Cyan
$adminSession2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminBody2 = @{ emailOrUsername = "ripkaush@gmail.com"; password = "Kaustav123*" } | ConvertTo-Json
Invoke-RestMethod "$base/auth/login" -Method POST -Body $adminBody2 -ContentType "application/json" -WebSession $adminSession2 | Out-Null

try {
  Invoke-WebRequest "$base/caregiver/overview" -Method GET -WebSession $adminSession2 -UseBasicParsing | Out-Null
  Test "Admin blocked from overview" "403" "200"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Test "Admin blocked from overview" "403" "$status"
}

# ── Step 8: Cleanup — revoke invitation ───────────────────────────────────────
Write-Host "`n=== Step 8: Cleanup ===" -ForegroundColor Cyan
$patSession3 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod "$base/auth/login" -Method POST -Body $patBody2 -ContentType "application/json" -WebSession $patSession3 | Out-Null
try {
  Invoke-RestMethod "$base/caregiver-invitations/$invId" -Method DELETE -WebSession $patSession3 | Out-Null
  Write-Host "  Cleaned up invitation" -ForegroundColor Gray
} catch {
  Write-Host "  Could not clean up invitation" -ForegroundColor Yellow
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor White
Write-Host "  PASS: $pass  |  FAIL: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "========================================`n" -ForegroundColor White

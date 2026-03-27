$base = "http://localhost:4000/api"

function AssertEq {
  param([string]$Name, [string]$Expected, [string]$Actual)
  if ("$Expected" -ne "$Actual") {
    throw "Assertion failed: $Name (expected=$Expected got=$Actual)"
  }
  Write-Host "PASS: $Name" -ForegroundColor Green
}

$cgEmail = "cg_phase5_1774576944228@test.com"
$cgPass = "Phase5Pass123*"

Write-Host "`n=== Caregiver login ===" -ForegroundColor Cyan
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ emailOrUsername = $cgEmail; password = $cgPass } | ConvertTo-Json
$login = Invoke-RestMethod "$base/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $sess
AssertEq "role is CAREGIVER" "CAREGIVER" "$($login.user.role)"

Write-Host "`n=== GET /visits (caregiver scoped) ===" -ForegroundColor Cyan
$vis = Invoke-RestMethod "$base/visits" -Method GET -WebSession $sess
if ($vis.visits.Count -lt 1) { throw "Expected at least 1 visit for linked patient" }
Write-Host "Visits returned: $($vis.visits.Count)"

$first = $vis.visits | Select-Object -First 1
Write-Host "First visit: id=$($first.id) status=$($first.status)"

Write-Host "`n=== PATCH /visits/:id confirm ===" -ForegroundColor Cyan
$patchBody = @{ status = "CONFIRMED" } | ConvertTo-Json
$updated = Invoke-RestMethod "$base/visits/$($first.id)" -Method PATCH -Body $patchBody -ContentType "application/json" -WebSession $sess
AssertEq "status updated to CONFIRMED" "CONFIRMED" "$($updated.visit.status)"

Write-Host "`n=== POST /visits (reschedule request as caregiver) ===" -ForegroundColor Cyan
$reqBody = @{
  patientId = $first.patient.id
  clinicianId = $first.clinician.id
  scheduledAt = (Get-Date).AddDays(2).ToString("o")
  visitType = $first.visitType
  purpose = "Reschedule request (caregiver)"
  notes = "Requested by caregiver via Phase 5 test"
  durationMinutes = 60
} | ConvertTo-Json
$created = Invoke-RestMethod "$base/visits" -Method POST -Body $reqBody -ContentType "application/json" -WebSession $sess
if (-not $created.visit.id) { throw "Expected new visit id" }
AssertEq "new visit status is SCHEDULED" "SCHEDULED" "$($created.visit.status)"

Write-Host "`nAll Phase 5 quick checks passed." -ForegroundColor White


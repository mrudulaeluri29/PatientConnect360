$base = "http://localhost:4000"
$results = @()

function req {
  param([string]$method, [string]$path, $body, $wSession, [int]$expect = 0)
  $uri = "$base$path"
  try {
    $p = @{ Uri=$uri; Method=$method; UseBasicParsing=$true; ContentType="application/json" }
    if ($wSession) { $p.WebSession = $wSession }
    if ($body)     { $p.Body = ($body | ConvertTo-Json -Depth 5) }
    $resp = Invoke-WebRequest @p -ErrorAction Stop
    $code = $resp.StatusCode
    $json = $resp.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    $ok   = ($expect -eq 0 -or $code -eq $expect)
    $tag  = if ($ok) { "PASS" } else { "FAIL(got $code want $expect)" }
    [PSCustomObject]@{ Tag=$tag; Method=$method; Path=$path; Status=$code; Detail="" }
  } catch {
    $code = [int]$_.Exception.Response.StatusCode
    $msg  = try { ($_.ErrorDetails.Message | ConvertFrom-Json).error } catch { $_.ErrorDetails.Message }
    $ok   = ($expect -ne 0 -and $code -eq $expect)
    $tag  = if ($ok) { "PASS" } else { "FAIL(got $code want $expect)" }
    [PSCustomObject]@{ Tag=$tag; Method=$method; Path=$path; Status=$code; Detail=$msg }
  }
}

# ── 1. Health & DB ───────────────────────────────────────────────────────────
$results += req GET "/health"  -expect 200
$results += req GET "/db/ping" -expect 200

# ── 2. Auth guards — no cookie → 401 ────────────────────────────────────────
$results += req GET  "/api/visits"                -expect 401
$results += req GET  "/api/medications"           -expect 401
$results += req GET  "/api/vitals"                -expect 401
$results += req POST "/api/visits"      @{}       -expect 401
$results += req POST "/api/medications" @{}       -expect 401
$results += req POST "/api/vitals"      @{}       -expect 401

# ── 3. Login ─────────────────────────────────────────────────────────────────
$loginBody = @{ emailOrUsername="ripkaush"; password="Kaustav123*" }
$sess = $null
try {
  $lp = @{
    Uri="$base/api/auth/login"; Method="POST"; ContentType="application/json"
    Body=($loginBody | ConvertTo-Json); SessionVariable="sess"; UseBasicParsing=$true
  }
  $lr = Invoke-WebRequest @lp -ErrorAction Stop
  $ld = $lr.Content | ConvertFrom-Json
  $results += [PSCustomObject]@{ Tag="PASS"; Method="POST"; Path="/api/auth/login"; Status=$lr.StatusCode; Detail="user=$($ld.user.username) role=$($ld.user.role)" }
} catch {
  $results += [PSCustomObject]@{ Tag="FAIL"; Method="POST"; Path="/api/auth/login"; Status=0; Detail=$_.Exception.Message }
  $results | Format-Table -AutoSize
  exit 1
}

# ── 4. Authenticated — empty lists (no data yet) ─────────────────────────────
$results += req GET "/api/visits"      -wSession $sess -expect 200
$results += req GET "/api/medications" -wSession $sess -expect 200
$results += req GET "/api/vitals"      -wSession $sess -expect 200

# ── 5. Medication drug search ────────────────────────────────────────────────
$results += req GET "/api/medications/search?q=me"  -wSession $sess -expect 400  # too short (< 3 chars)
$results += req GET "/api/medications/search?q=met" -wSession $sess -expect 200  # valid 3-char query
$results += req GET "/api/medications/search?q=metformin" -wSession $sess -expect 200

# ── 6. Vitals latest — non-existent patient ──────────────────────────────────
$results += req GET "/api/vitals/latest/nonexistent-id" -wSession $sess -expect 200  # returns empty {}

# ── 7. Validation errors — missing required fields ───────────────────────────
$results += req POST "/api/visits"      @{ patientId="x" }                    -wSession $sess -expect 400
$results += req POST "/api/medications" @{ patientId="x"; name="Drug" }       -wSession $sess -expect 400
$results += req POST "/api/vitals"      @{ patientId="x"; type="HEART_RATE" } -wSession $sess -expect 400

# ── 8. Invalid enum values ───────────────────────────────────────────────────
$results += req GET "/api/visits?status=INVALID"      -wSession $sess -expect 400
$results += req GET "/api/medications?status=INVALID" -wSession $sess -expect 400
$results += req GET "/api/vitals?type=INVALID"        -wSession $sess -expect 400

# ── 9. 404 on non-existent IDs ───────────────────────────────────────────────
$results += req GET    "/api/visits/does-not-exist"      -wSession $sess -expect 404
$results += req GET    "/api/medications/does-not-exist" -wSession $sess -expect 404
$results += req GET    "/api/vitals/does-not-exist"      -wSession $sess -expect 404
$results += req PATCH  "/api/visits/does-not-exist"      @{ status="CONFIRMED" } -wSession $sess -expect 404
$results += req DELETE "/api/visits/does-not-exist"      -wSession $sess -expect 404

# ── 10. Existing routes still work ───────────────────────────────────────────
$results += req GET "/api/admin/users"       -wSession $sess -expect 200
$results += req GET "/api/admin/assignments" -wSession $sess -expect 200
$results += req GET "/api/simple-messages/assigned-patients" -wSession $sess -expect 403  # admin not clinician

# ── 11. Availability — auth guards ───────────────────────────────────────────
$results += req GET "/api/availability" -expect 401

# ── 12. Availability — authenticated as admin ────────────────────────────────
$results += req GET "/api/availability" -wSession $sess -expect 200

# ── 13. Availability — validation errors ─────────────────────────────────────
$results += req POST "/api/availability" @{} -wSession $sess -expect 400  # missing fields
$results += req POST "/api/availability" @{ date="2026-04-01"; startTime="9:00"; endTime="17:00" } -wSession $sess -expect 400  # bad time format
$results += req POST "/api/availability" @{ date="2026-04-01"; startTime="17:00"; endTime="09:00" } -wSession $sess -expect 400  # end before start
$results += req POST "/api/availability" @{ date="not-a-date"; startTime="09:00"; endTime="17:00" } -wSession $sess -expect 400  # bad date

# ── 14. Availability — invalid status filter ─────────────────────────────────
$results += req GET "/api/availability?status=INVALID" -wSession $sess -expect 400

# ── 15. Availability — 404 on non-existent ───────────────────────────────────
$results += req GET    "/api/availability/does-not-exist"        -wSession $sess -expect 404
$results += req PATCH  "/api/availability/does-not-exist/review" -wSession $sess -expect 404
$results += req DELETE "/api/availability/does-not-exist"        -wSession $sess -expect 404

# ── 16. Availability — review: 404 before body validation ────────────────────
$results += req PATCH "/api/availability/fake-id/review" @{} -wSession $sess -expect 404

# ── 17. Availability — batch validation ──────────────────────────────────────
$results += req POST "/api/availability/batch" @{ days=@() } -wSession $sess -expect 400  # empty array
$results += req POST "/api/availability/batch" @{ days=@(@{ date="2026-04-01"; startTime="09:00" }) } -wSession $sess -expect 400  # missing endTime

# ── 11. Logout ───────────────────────────────────────────────────────────────
$results += req POST "/api/auth/logout" -wSession $sess -expect 200
$results += req GET  "/api/visits"      -wSession $sess -expect 401  # cookie cleared

# ── Print results ─────────────────────────────────────────────────────────────
$pass = ($results | Where-Object { $_.Tag -eq "PASS" }).Count
$fail = ($results | Where-Object { $_.Tag -ne "PASS" }).Count

$results | Format-Table Tag, Method, Path, Status, Detail -AutoSize

Write-Host ""
Write-Host "Results: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })

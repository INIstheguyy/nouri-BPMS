# Trusted administration scripts

These scripts run outside the browser and may use the Supabase service-role key. Never place that key in a `VITE_*` variable or commit it to the repository.

## Bootstrap the first Executive Admin

Set secrets in the current shell and run the idempotent bootstrap command:

```powershell
$env:SUPABASE_URL = "http://127.0.0.1:55321"
$env:SUPABASE_SECRET_KEY = "<hosted-sb_secret-key>" # use SUPABASE_SERVICE_ROLE_KEY only locally
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@example.com"
$env:BOOTSTRAP_ADMIN_PASSWORD = "<at-least-12-characters>"
$env:BOOTSTRAP_ADMIN_NAME = "Executive Admin"
npm.cmd run bootstrap:admin
```

For a hosted project, the script additionally requires HTTPS, the exact project ref in
`REMOTE_BOOTSTRAP_PROJECT_REF`, and
`BOOTSTRAP_CONFIRMATION=BOOTSTRAP:<project-ref>:<lowercase-admin-email>`. This makes a copied local
command fail closed against a hosted project. Remove every sensitive environment value from the
shell when finished. Re-running the script repairs the profile/role association without creating
another Auth user.

## Test a local staff invitation before the Step 12 Staff screen

The invitation backend is already available to an Executive Admin, although the visual staff
administration screen is scheduled for Step 12. From a PowerShell session, sign in as the local
admin and invoke the protected function without placing the password in command history:

```powershell
$supabaseUrl = 'http://127.0.0.1:55321'
$anonLine = npx.cmd supabase status -o env |
  Select-String '^ANON_KEY=' |
  ForEach-Object { $_.Line }
$anonKey = ($anonLine -split '=', 2)[1].Trim('"')

$adminEmail = Read-Host 'Executive Admin email'
$secureAdminPassword = Read-Host 'Executive Admin password (input hidden)' -AsSecureString
$adminPassword = [System.Net.NetworkCredential]::new('', $secureAdminPassword).Password

$sessionBody = @{ email = $adminEmail; password = $adminPassword } | ConvertTo-Json
$session = Invoke-RestMethod `
  -Uri "$supabaseUrl/auth/v1/token?grant_type=password" `
  -Method Post `
  -ContentType 'application/json' `
  -Headers @{ apikey = $anonKey } `
  -Body $sessionBody

$inviteBody = @{
  email = 'order-manager@example.test'
  fullName = 'Order Manager'
  roleCode = 'ORDER_MANAGER'
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "$supabaseUrl/functions/v1/invite-staff" `
  -Method Post `
  -ContentType 'application/json' `
  -Headers @{
    apikey = $anonKey
    Authorization = "Bearer $($session.access_token)"
    Origin = 'http://localhost:5173'
  } `
  -Body $inviteBody

Remove-Variable adminPassword, secureAdminPassword, session, sessionBody
```

Open local Mailpit at `http://127.0.0.1:55324`, open the invitation email, and follow its link to
the `/invite` password screen. After setting a password, the invited staff member can sign in at
`http://127.0.0.1:5173`. Use `EXECUTIVE_ADMIN` instead of `ORDER_MANAGER` only when that broader
access is intended.

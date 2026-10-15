[CmdletBinding()]
param([switch]$Trust)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'protect-local-state.ps1')
$platformRoot = Split-Path -Parent $PSScriptRoot
$certificateDirectory = Join-Path $platformRoot 'artifacts/local-platform/https'
New-Item -ItemType Directory -Path $certificateDirectory -Force | Out-Null
Protect-CaeloraLocalState $certificateDirectory
if ($Trust) {
  dotnet dev-certs https --trust
  if ($LASTEXITCODE -ne 0) { throw 'Local certificate trust was not completed. Do not bypass browser warnings.' }
}
$certificatePath = Join-Path $certificateDirectory 'localhost.pem'
dotnet dev-certs https --export-path $certificatePath --format PEM --no-password
if ($LASTEXITCODE -ne 0) { throw 'Local HTTPS certificate export failed.' }
Protect-CaeloraLocalState $certificatePath
Protect-CaeloraLocalState (Join-Path $certificateDirectory 'localhost.key')
Write-Host 'Exported localhost development certificate/key to ignored local state. Windows access is restricted to the current user, SYSTEM and Administrators.'
Write-Host 'If not yet trusted, run this script with -Trust and approve the Windows prompt. Never bypass browser certificate warnings.'

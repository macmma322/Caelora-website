[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$previousConnection = $env:CAELORA_TEST_POSTGRES
try {
  if (-not $previousConnection) {
    $commonGit = (& git -C $platformRoot rev-parse --path-format=absolute --git-common-dir).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Cannot locate website checkout.' }
    $connectionFile = Join-Path (Split-Path -Parent $commonGit) 'artifacts/local-platform/connections.json'
    if (-not (Test-Path -LiteralPath $connectionFile)) { throw 'Start native infrastructure or set CAELORA_TEST_POSTGRES. Identity tests must use real PostgreSQL.' }
    $localConnection = Get-Content -LiteralPath $connectionFile -Raw | ConvertFrom-Json
    $env:CAELORA_TEST_POSTGRES = "Host=127.0.0.1;Port=$($localConnection.Port);Database=postgres;Username=caelora;Password=$($localConnection.Password);Timeout=5"
  }
  dotnet test (Join-Path $platformRoot 'Caelora.Platform.slnx') --configuration Release -p:RestoreLockedMode=true
  $testResult = $LASTEXITCODE
} finally { $env:CAELORA_TEST_POSTGRES = $previousConnection }
exit $testResult

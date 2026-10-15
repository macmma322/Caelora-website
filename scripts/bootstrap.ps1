[CmdletBinding()]
param([switch]$EnableDependencies)
$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
function Write-NewFile([string]$RelativePath, [string]$Content) {
  $targetPath = Join-Path $platformRoot $RelativePath
  if (-not (Test-Path -LiteralPath $targetPath)) {
    [System.IO.File]::WriteAllText($targetPath, $Content + "`n", [System.Text.UTF8Encoding]::new($false))
    Write-Host "Created $RelativePath"
  } else { Write-Host "Preserved $RelativePath" }
}
if (-not (Test-Path -LiteralPath (Join-Path $platformRoot '.env'))) {
  $randomBytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
  $generatedPassword = [Convert]::ToHexString($randomBytes).ToLowerInvariant()
  $exampleText = Get-Content -LiteralPath (Join-Path $platformRoot '.env.example') -Raw
  Write-NewFile '.env' ($exampleText.Replace('local-example-change-before-use', $generatedPassword).TrimEnd())
}
foreach ($portalName in 'account', 'admin') {
  $examplePath = Join-Path $platformRoot "apps/$portalName/public/runtime-config.example.json"
  Write-NewFile "apps/$portalName/public/runtime-config.json" (Get-Content -LiteralPath $examplePath -Raw).TrimEnd()
}
Write-NewFile 'apps/web/.env' (Get-Content -LiteralPath (Join-Path $platformRoot 'apps/web/.env.example') -Raw).TrimEnd()
if ($EnableDependencies) {
  $localValues = @{}
  foreach ($line in Get-Content -LiteralPath (Join-Path $platformRoot '.env')) {
    if ($line -match '^([A-Z_]+)=(.*)$') { $localValues[$Matches[1]] = $Matches[2] }
  }
  if (-not $localValues['POSTGRES_PASSWORD']) { throw 'POSTGRES_PASSWORD is missing from local .env.' }
  $localConfig = @{ Platform = @{
    PostgresEnabled = $true
    RedisEnabled = $true
    PostgresConnection = "Host=localhost;Port=$($localValues['POSTGRES_PORT']);Database=$($localValues['POSTGRES_DB']);Username=$($localValues['POSTGRES_USER']);Password=$($localValues['POSTGRES_PASSWORD']);Timeout=3"
    RedisConnection = "localhost:$($localValues['REDIS_PORT']),abortConnect=false,connectTimeout=2000"
  } } | ConvertTo-Json -Depth 4
  Write-NewFile 'services/platform-api/appsettings.Local.json' $localConfig
}
Write-Host 'Bootstrap complete. Local values are ignored by Git. No existing file was overwritten.'

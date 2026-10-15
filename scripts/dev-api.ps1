[CmdletBinding()]
param([switch]$Migrate)
$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
if (-not $env:ASPNETCORE_ENVIRONMENT) { $env:ASPNETCORE_ENVIRONMENT = 'Development' }
if (-not $env:ASPNETCORE_URLS) { $env:ASPNETCORE_URLS = 'http://127.0.0.1:5080' }
$apiProject = Join-Path $platformRoot 'services/platform-api/Caelora.Platform.Api.csproj'
if ($Migrate) { dotnet run --project $apiProject -- --migrate } else { dotnet run --project $apiProject }
exit $LASTEXITCODE

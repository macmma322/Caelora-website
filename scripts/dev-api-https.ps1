[CmdletBinding()]
param([int]$Port = 7443, [string]$AccountOrigin = 'https://localhost:4443')
$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = "https://127.0.0.1:$Port"
$env:Accounts__AccountOrigin = $AccountOrigin
$env:Transport__RequireHttps = 'true'
dotnet run --project (Join-Path $platformRoot 'services/platform-api') --configuration Release --no-build
exit $LASTEXITCODE

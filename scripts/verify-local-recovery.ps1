[CmdletBinding()]
param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$localConnection = Get-Content (Join-Path $platformRoot 'artifacts/local-platform/connections.json') -Raw | ConvertFrom-Json
$probeId = [Guid]::NewGuid().ToString('N')
$sourceDatabase = "caelora_restore_${probeId}_source"
$targetDatabase = "caelora_restore_${probeId}_target"
$dumpPath = Join-Path $platformRoot "artifacts/m3/restore-$probeId.dump"
$previousPassword = $env:PGPASSWORD
$previousConnection = $env:Platform__PostgresConnection
$previousEnvironment = $env:ASPNETCORE_ENVIRONMENT
$previousAccounts = $env:Accounts__Enabled
function Invoke-Postgres([string]$Binary, [string[]]$Arguments) {
  & (Join-Path $PostgresBin "$Binary.exe") @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Recovery probe $Binary failed." }
}
try {
  $env:PGPASSWORD = $localConnection.Password
  $commonArguments = @('--no-password','-h','127.0.0.1','-p',"$($localConnection.Port)",'-U','caelora')
  Invoke-Postgres 'createdb' ($commonArguments + @($sourceDatabase))
  Invoke-Postgres 'createdb' ($commonArguments + @($targetDatabase))
  $env:ASPNETCORE_ENVIRONMENT = 'Development'; $env:Accounts__Enabled = 'false'
  $env:Platform__PostgresConnection = "Host=127.0.0.1;Port=$($localConnection.Port);Database=$sourceDatabase;Username=caelora;Password=$($localConnection.Password);Timeout=5"
  dotnet run --project (Join-Path $platformRoot 'services/platform-api') -c Release --no-build -- --migrate *> (Join-Path $platformRoot 'artifacts/m3/restore-migration.log')
  if ($LASTEXITCODE -ne 0) { throw 'Recovery probe migration failed.' }
  $eventId = [Guid]::NewGuid().ToString()
  $insertSql = 'INSERT INTO platform."SecurityEvents" ("Id","Kind","OccurredAt") VALUES (''' + $eventId + ''',''BackupRestoreProbe'',CURRENT_TIMESTAMP)'
  Invoke-Postgres 'psql' ($commonArguments + @('-d',$sourceDatabase,'-c',$insertSql))
  Invoke-Postgres 'pg_dump' ($commonArguments + @('-d',$sourceDatabase,'-Fc','-f',$dumpPath))
  Invoke-Postgres 'pg_restore' ($commonArguments + @('-d',$targetDatabase,'--no-owner','--no-privileges',$dumpPath))
  $selectSql = 'SELECT count(*) FROM platform."SecurityEvents" WHERE "Id"=''' + $eventId + ''''
  $count = & (Join-Path $PostgresBin 'psql.exe') @commonArguments -d $targetDatabase -Atc $selectSql
  if ($LASTEXITCODE -ne 0 -or $count -ne '1') { throw 'Restored synthetic record was not found.' }
  Write-Host 'PASS: explicit schema and synthetic security record backed up and restored into a separate database. No developer database was read or reset.'
} finally {
  foreach ($probeDatabase in $sourceDatabase,$targetDatabase) {
    if ($probeDatabase -notmatch '^caelora_restore_[0-9a-f]{32}_(source|target)$') { throw 'Refusing cleanup of an unexpected database name.' }
    & (Join-Path $PostgresBin 'dropdb.exe') --no-password -h 127.0.0.1 -p $localConnection.Port -U caelora --if-exists --force $probeDatabase
  }
  $env:PGPASSWORD=$previousPassword; $env:Platform__PostgresConnection=$previousConnection
  $env:ASPNETCORE_ENVIRONMENT=$previousEnvironment; $env:Accounts__Enabled=$previousAccounts
}

[CmdletBinding()]
param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin', [int]$PostgresPort = 55432, [int]$SmtpPort = 1025, [int]$MailUiPort = 8025)
$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$commonGit = (& git -C $platformRoot rev-parse --path-format=absolute --git-common-dir).Trim()
if($LASTEXITCODE -ne 0) { throw 'Run from a Caelora website checkout.' }
$mainRoot = Split-Path -Parent $commonGit
$stateRoot = Join-Path $mainRoot 'artifacts/local-platform'
$dataDirectory = Join-Path $stateRoot 'postgres'
$toolsDirectory = Join-Path $stateRoot 'tools'
$keyDirectory = Join-Path $stateRoot 'data-protection'
foreach($directoryPath in $stateRoot,$toolsDirectory,$keyDirectory) { New-Item -ItemType Directory -Path $directoryPath -Force | Out-Null }
if(-not (Test-Path -LiteralPath (Join-Path $PostgresBin 'initdb.exe'))) { throw 'PostgreSQL binaries missing. Supply -PostgresBin or use Compose.' }
$connectionFile = Join-Path $stateRoot 'connections.json'
if(Test-Path -LiteralPath $connectionFile) { $localConnection=Get-Content -LiteralPath $connectionFile -Raw | ConvertFrom-Json }
else {
  $localConnection = [pscustomobject]@{ Password=[Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant(); Port=$PostgresPort; SmtpPort=$SmtpPort; MailUiPort=$MailUiPort }
  [System.IO.File]::WriteAllText($connectionFile,($localConnection | ConvertTo-Json),[System.Text.UTF8Encoding]::new($false))
}
if($localConnection.Port -ne $PostgresPort) { throw 'Existing local cluster uses a different port; do not repoint or overwrite it.' }
$passwordFile=Join-Path $stateRoot 'init-password.txt'
if(-not (Test-Path -LiteralPath (Join-Path $dataDirectory 'PG_VERSION'))) {
  [System.IO.File]::WriteAllText($passwordFile,$localConnection.Password,[System.Text.UTF8Encoding]::new($false))
  & (Join-Path $PostgresBin 'initdb.exe') -D $dataDirectory -U caelora --auth=scram-sha-256 --pwfile=$passwordFile --encoding=UTF8 --locale=C | Out-Null
  if($LASTEXITCODE -ne 0){ throw 'Isolated PostgreSQL initdb failed.' }
  Remove-Item -LiteralPath $passwordFile
}
& (Join-Path $PostgresBin 'pg_ctl.exe') status -D $dataDirectory *> $null
if($LASTEXITCODE -ne 0) {
  $controlProcess=Start-Process -FilePath (Join-Path $PostgresBin 'pg_ctl.exe') -ArgumentList @('start','-D',$dataDirectory,'-l',(Join-Path $stateRoot 'postgres.log'),'-o',('"-p '+$PostgresPort+' -h 127.0.0.1"'),'-w') -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $stateRoot 'pg-control.log') -RedirectStandardError (Join-Path $stateRoot 'pg-control-error.log')
  if($controlProcess.ExitCode -ne 0) { throw 'Isolated PostgreSQL did not start. Existing service/data was not modified.' }
}
$previousPassword=$env:PGPASSWORD
try {
  $env:PGPASSWORD=$localConnection.Password
  $databaseExists=& (Join-Path $PostgresBin 'psql.exe') --no-password -h 127.0.0.1 -p $PostgresPort -U caelora -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='caelora'"
  if($databaseExists -ne '1') { & (Join-Path $PostgresBin 'createdb.exe') --no-password -h 127.0.0.1 -p $PostgresPort -U caelora caelora; if($LASTEXITCODE -ne 0){throw 'Local database creation failed.'} }
} finally { $env:PGPASSWORD=$previousPassword }
$mailpitVersion='v1.31.6'
$mailpitExe=Join-Path $toolsDirectory 'mailpit.exe'
if(-not (Test-Path -LiteralPath $mailpitExe)) {
  $zipPath=Join-Path $toolsDirectory 'mailpit-windows-amd64.zip'
  Invoke-WebRequest -Uri "https://github.com/axllent/mailpit/releases/download/$mailpitVersion/mailpit-windows-amd64.zip" -OutFile $zipPath
  Expand-Archive -LiteralPath $zipPath -DestinationPath $toolsDirectory
}
$mailpitRunning=Get-CimInstance Win32_Process -Filter "Name='mailpit.exe'" | Where-Object { $_.ExecutablePath -eq $mailpitExe }
if(-not $mailpitRunning) {
  Start-Process -FilePath $mailpitExe -ArgumentList @('--listen',"127.0.0.1:$MailUiPort",'--smtp',"127.0.0.1:$SmtpPort",'--database',(Join-Path $stateRoot 'mailpit.db')) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $stateRoot 'mailpit.log') -RedirectStandardError (Join-Path $stateRoot 'mailpit-error.log') | Out-Null
}
$localSettings=@{
  Platform=@{ PostgresEnabled=$true; RedisEnabled=$false; PostgresConnection="Host=127.0.0.1;Port=$PostgresPort;Database=caelora;Username=caelora;Password=$($localConnection.Password);Timeout=3" }
  Accounts=@{ Enabled=$true; AccountOrigin='http://localhost:4200'; EmailProvider='Mailpit'; SmtpHost='127.0.0.1'; SmtpPort=$SmtpPort; SenderAddress='accounts@caelora.test'; KeyDirectory=$keyDirectory }
} | ConvertTo-Json -Depth 5
$identityFile=Join-Path $platformRoot 'services/platform-api/appsettings.Identity.Local.json'
if(-not (Test-Path -LiteralPath $identityFile)){ [System.IO.File]::WriteAllText($identityFile,$localSettings,[System.Text.UTF8Encoding]::new($false)) }
else { Write-Host 'Preserved existing appsettings.Identity.Local.json.' }
Write-Host "Native PostgreSQL: 127.0.0.1:$PostgresPort; Mailpit: http://localhost:$MailUiPort. Credentials were not printed. Existing workstation PostgreSQL service untouched."
. (Join-Path $PSScriptRoot 'protect-local-state.ps1')
Protect-CaeloraLocalState (Join-Path $stateRoot 'connections.json')
Protect-CaeloraLocalState $identityFile
Protect-CaeloraLocalState $keyDirectory
Write-Host "Persistent local state: $stateRoot. Do not delete it to reset tests; tests create separate databases."

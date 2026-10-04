[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Bootstrap', 'InstallPrerequisites', 'Start', 'Stop', 'RunBackend', 'RunFrontend', 'RunOllama')]
  [string]$Mode
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptPath = $MyInvocation.MyCommand.Path
$ScriptDir = Split-Path -Parent $ScriptPath
$RepoRoot = Split-Path -Parent $ScriptDir
$ServerEnvPath = Join-Path $RepoRoot 'apps\server\.env'
$LogsDir = Join-Path $RepoRoot 'logs'
$PidsDir = Join-Path $RepoRoot '.pids'
$PnpmVersion = '10.12.1'
$PinnedPnpmPackage = 'pnpm@10.12.1'
$OllamaModel = 'qwen2.5:3b'

function Write-Step {
  param([string]$Message)
  Write-Host "[QoderNovel] $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Refresh-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $paths = @($machinePath, $userPath) | Where-Object { $_ }
  $env:Path = $paths -join ';'
}

function Get-CommandPath {
  param([string[]]$Names)

  foreach ($name in $Names) {
    $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) {
      if ($command.Source) { return $command.Source }
      if ($command.Path) { return $command.Path }
    }
  }
  return $null
}

function Resolve-NodePath {
  $path = Get-CommandPath @('node.exe', 'node')
  if ($path) { return $path }

  $fallback = Join-Path $env:ProgramFiles 'nodejs\node.exe'
  if (Test-Path -LiteralPath $fallback) { return $fallback }
  return $null
}

function Resolve-NpmPath {
  $path = Get-CommandPath @('npm.cmd', 'npm')
  if ($path) { return $path }

  $fallback = Join-Path $env:ProgramFiles 'nodejs\npm.cmd'
  if (Test-Path -LiteralPath $fallback) { return $fallback }
  return $null
}

function Resolve-PnpmPath {
  $path = Get-CommandPath @('pnpm.cmd', 'pnpm')
  if ($path) { return $path }

  $fallback = Join-Path $env:APPDATA 'npm\pnpm.cmd'
  if (Test-Path -LiteralPath $fallback) { return $fallback }
  return $null
}

function Resolve-PsqlPath {
  $path = Get-CommandPath @('psql.exe', 'psql')
  if ($path) { return $path }

  $postgresRoot = Join-Path $env:ProgramFiles 'PostgreSQL'
  if (Test-Path -LiteralPath $postgresRoot) {
    $versions = Get-ChildItem -LiteralPath $postgresRoot -Directory -ErrorAction SilentlyContinue |
      Sort-Object Name -Descending
    foreach ($version in $versions) {
      $candidate = Join-Path $version.FullName 'bin\psql.exe'
      if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
  }
  return $null
}

function Resolve-OllamaPath {
  $path = Get-CommandPath @('ollama.exe', 'ollama')
  if ($path) { return $path }

  $candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'),
    (Join-Path $env:ProgramFiles 'Ollama\ollama.exe')
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  return $null
}

function Get-NodeMajorVersion {
  $node = Resolve-NodePath
  if (-not $node) { return 0 }

  $versionText = (& $node --version 2>$null | Select-Object -First 1)
  if ($versionText -match '^v(\d+)') { return [int]$Matches[1] }
  return 0
}

function New-RandomHex {
  param([int]$ByteCount)

  $bytes = New-Object byte[] $ByteCount
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  } finally {
    $generator.Dispose()
  }
  return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Ensure-ServerEnvironment {
  if (Test-Path $ServerEnvPath) {
    Write-Ok 'Existing apps/server/.env preserved.'
    return
  }

  Write-Step 'Creating apps/server/.env with local-only defaults...'
  $databasePassword = New-RandomHex 16
  $masterKey = New-RandomHex 32
  $lines = @(
    'SERVER_PORT=3000',
    'DB_HOST=localhost',
    'DB_PORT=5432',
    'DB_USERNAME=postgres',
    "DB_PASSWORD=$databasePassword",
    'DB_DATABASE=qoder_novel',
    'OPENAI_API_KEY=ollama-local',
    'OPENAI_BASE_URL=http://localhost:11434/v1',
    "OPENAI_MODEL=$OllamaModel",
    "ENCRYPTION_MASTER_KEY=$masterKey",
    'LOG_LEVEL=debug'
  )
  $content = ($lines -join [Environment]::NewLine) + [Environment]::NewLine
  $utf8WithoutBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
  [IO.File]::WriteAllText($ServerEnvPath, $content, $utf8WithoutBom)
  Write-Ok 'Created apps/server/.env. Keep this file private.'
}

function Read-DotEnv {
  if (-not (Test-Path -LiteralPath $ServerEnvPath)) {
    throw 'apps/server/.env is missing. Run the environment bootstrap first.'
  }

  $values = @{}
  foreach ($line in Get-Content -LiteralPath $ServerEnvPath) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $value = $Matches[2].Trim()
      if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $values[$Matches[1]] = $value
    }
  }
  return $values
}

function Get-EnvSetting {
  param(
    [hashtable]$Values,
    [string]$Name,
    [string]$Default
  )
  if ($Values.ContainsKey($Name) -and $Values[$Name]) { return [string]$Values[$Name] }
  return $Default
}

function Test-TcpPort {
  param(
    [string]$HostName,
    [int]$Port,
    [int]$TimeoutMilliseconds = 700
  )

  $client = New-Object Net.Sockets.TcpClient
  try {
    $result = $client.BeginConnect($HostName, $Port, $null, $null)
    if (-not $result.AsyncWaitHandle.WaitOne($TimeoutMilliseconds, $false)) { return $false }
    $client.EndConnect($result)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Get-PostgresService {
  return (Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    Select-Object -First 1)
}

function Ensure-PostgresService {
  $settings = Read-DotEnv
  $hostName = Get-EnvSetting $settings 'DB_HOST' 'localhost'
  $port = [int](Get-EnvSetting $settings 'DB_PORT' '5432')
  if ($hostName -notin @('localhost', '127.0.0.1', '::1')) { return }
  if (Test-TcpPort $hostName $port) { return }

  $service = Get-PostgresService
  if (-not $service) {
    throw "PostgreSQL is installed but no local service is listening on port $port."
  }
  if ($service.Status -ne 'Running') {
    Write-Step "Starting PostgreSQL service $($service.Name)..."
    Start-Service -Name $service.Name
  }

  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if (Test-TcpPort $hostName $port) { return }
    Start-Sleep -Seconds 1
  }
  throw "PostgreSQL did not start listening on port $port."
}

function Ensure-WinGet {
  $winget = Get-CommandPath @('winget.exe', 'winget')
  if ($winget) { return $winget }

  Write-Step 'Windows Package Manager is missing; installing Microsoft App Installer...'
  $bundlePath = Join-Path $env:TEMP 'QoderNovel-Microsoft.DesktopAppInstaller.msixbundle'
  try {
    Invoke-WebRequest -UseBasicParsing -Uri 'https://aka.ms/getwinget' -OutFile $bundlePath
    Add-AppxPackage -Path $bundlePath
  } catch {
    Write-Warn 'Direct App Installer setup failed; trying the official WinGet repair module.'
  } finally {
    if (Test-Path -LiteralPath $bundlePath) { Remove-Item -LiteralPath $bundlePath -Force }
  }

  Refresh-ProcessPath
  $winget = Get-CommandPath @('winget.exe', 'winget')
  if ($winget) { return $winget }

  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Install-PackageProvider -Name NuGet -Force -Scope AllUsers | Out-Null
  Install-Module -Name Microsoft.WinGet.Client -Repository PSGallery -Force -AllowClobber -Scope AllUsers
  Import-Module Microsoft.WinGet.Client
  Repair-WinGetPackageManager -AllUsers | Out-Null
  Refresh-ProcessPath

  $winget = Get-CommandPath @('winget.exe', 'winget')
  if (-not $winget) { throw 'Microsoft App Installer was installed, but winget.exe is still unavailable.' }
  return $winget
}

function Invoke-WinGetPackage {
  param(
    [string]$Id,
    [switch]$PreferUpgrade,
    [string]$Override = ''
  )

  $winget = Ensure-WinGet
  $common = @('--id', $Id, '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity')
  if ($Override) { $common += @('--override', $Override) }

  if ($PreferUpgrade) {
    Write-Step "Upgrading $Id with winget..."
    & $winget upgrade @common
    if ($LASTEXITCODE -eq 0) { return }
  }

  Write-Step "Installing $Id with winget..."
  & $winget install @common
  if ($LASTEXITCODE -ne 0) { throw "winget could not install $Id (exit code $LASTEXITCODE)." }
}

function Test-NeedsElevatedPrerequisites {
  if ((Get-NodeMajorVersion) -lt 22) { return $true }
  if (-not (Resolve-PsqlPath)) { return $true }
  if (-not (Resolve-OllamaPath)) { return $true }

  $settings = Read-DotEnv
  $hostName = Get-EnvSetting $settings 'DB_HOST' 'localhost'
  $port = [int](Get-EnvSetting $settings 'DB_PORT' '5432')
  if ($hostName -in @('localhost', '127.0.0.1', '::1') -and -not (Test-TcpPort $hostName $port)) {
    $service = Get-PostgresService
    if ($service -and $service.Status -ne 'Running') { return $true }
  }
  return $false
}

function Invoke-ElevatedPrerequisiteInstall {
  $powerShell = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
  $argumentList = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', ('"{0}"' -f $ScriptPath),
    '-Mode', 'InstallPrerequisites'
  )
  Write-Step 'Administrator permission is required to install or start system components.'
  $process = Start-Process -FilePath $powerShell -ArgumentList $argumentList -Verb RunAs -WorkingDirectory $RepoRoot -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "Prerequisite installation failed (exit code $($process.ExitCode))." }
}

function Install-Prerequisites {
  if (-not (Test-Administrator)) { throw 'InstallPrerequisites must run as administrator.' }

  Refresh-ProcessPath
  if ((Get-NodeMajorVersion) -lt 22) {
    Invoke-WinGetPackage -Id 'OpenJS.NodeJS.LTS' -PreferUpgrade
  }

  if (-not (Resolve-PsqlPath)) {
    $settings = Read-DotEnv
    $password = Get-EnvSetting $settings 'DB_PASSWORD' ''
    if (-not $password) { throw 'DB_PASSWORD is missing from apps/server/.env.' }
    if ($password -match '["\r\n]') { throw 'DB_PASSWORD cannot contain a quote or newline during automatic PostgreSQL installation.' }
    $override = '--mode unattended --unattendedmodeui none --superpassword "{0}" --serverport 5432 --servicename postgresql-x64-17' -f $password
    Invoke-WinGetPackage -Id 'PostgreSQL.PostgreSQL.17' -Override $override
  }

  if (-not (Resolve-OllamaPath)) {
    Invoke-WinGetPackage -Id 'Ollama.Ollama'
  }

  Refresh-ProcessPath
  Ensure-PostgresService
  Write-Ok 'System prerequisites are installed.'
}

function Ensure-Pnpm {
  $pnpm = Resolve-PnpmPath
  if ($pnpm) {
    $version = (& $pnpm --version 2>$null | Select-Object -First 1)
    if ($version -eq $PnpmVersion) {
      Write-Ok "pnpm $PnpmVersion is available."
      return $pnpm
    }
  }

  $npm = Resolve-NpmPath
  if (-not $npm) { throw 'npm is unavailable after Node.js installation.' }
  Write-Step "Installing $PinnedPnpmPackage..."
  & $npm install --global $PinnedPnpmPackage | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "npm could not install $PinnedPnpmPackage." }
  Refresh-ProcessPath

  $pnpm = Resolve-PnpmPath
  if (-not $pnpm) { throw 'pnpm installation completed, but pnpm.cmd is unavailable.' }
  return $pnpm
}

function Invoke-PnpmCommand {
  param(
    [string[]]$Arguments,
    [string]$Description
  )
  $pnpm = Resolve-PnpmPath
  if (-not $pnpm) { throw 'pnpm is unavailable. Run the environment bootstrap first.' }
  & $pnpm @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Description failed (exit code $LASTEXITCODE)." }
}

function Initialize-Database {
  Ensure-PostgresService
  $settings = Read-DotEnv
  $hostName = Get-EnvSetting $settings 'DB_HOST' 'localhost'
  $port = Get-EnvSetting $settings 'DB_PORT' '5432'
  $username = Get-EnvSetting $settings 'DB_USERNAME' 'postgres'
  $password = Get-EnvSetting $settings 'DB_PASSWORD' ''
  $database = Get-EnvSetting $settings 'DB_DATABASE' 'qoder_novel'
  if ($database -notmatch '^[A-Za-z0-9_]+$') { throw 'DB_DATABASE may contain only letters, numbers, and underscores.' }

  $psql = Resolve-PsqlPath
  if (-not $psql) { throw 'psql.exe is unavailable after PostgreSQL installation.' }
  $createdb = Join-Path (Split-Path -Parent $psql) 'createdb.exe'
  if (-not (Test-Path -LiteralPath $createdb)) { throw 'createdb.exe was not found beside psql.exe.' }

  $oldPassword = [Environment]::GetEnvironmentVariable('PGPASSWORD', 'Process')
  $env:PGPASSWORD = $password
  try {
    $query = "SELECT 1 FROM pg_database WHERE datname = '$database'"
    $result = & $psql --host $hostName --port $port --username $username --dbname postgres --tuples-only --no-align --command $query 2>$null
    if ($LASTEXITCODE -ne 0) {
      throw 'PostgreSQL authentication failed. Check DB_HOST, DB_PORT, DB_USERNAME, and DB_PASSWORD in apps/server/.env.'
    }
    if (($result | Out-String).Trim() -ne '1') {
      Write-Step "Creating PostgreSQL database $database..."
      & $createdb --host $hostName --port $port --username $username $database
      if ($LASTEXITCODE -ne 0) { throw "Could not create PostgreSQL database $database." }
    } else {
      Write-Ok "PostgreSQL database $database already exists."
    }
  } finally {
    if ($null -eq $oldPassword) {
      Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
      $env:PGPASSWORD = $oldPassword
    }
  }

  Push-Location $RepoRoot
  try {
    Write-Step 'Running database migrations...'
    Invoke-PnpmCommand -Arguments @('--filter', '@qoder-novel/server', 'migration:run') -Description 'Database migration'
    Write-Step 'Loading idempotent seed data...'
    Invoke-PnpmCommand -Arguments @('--filter', '@qoder-novel/server', 'seed') -Description 'Database seed'
  } finally {
    Pop-Location
  }
}

function Test-OllamaHealth {
  try {
    $response = Invoke-RestMethod -Method Get -Uri 'http://localhost:11434/api/version' -TimeoutSec 3
    return $null -ne $response.PSObject.Properties['version']
  } catch {
    return $false
  }
}

function Test-BackendHealth {
  try {
    $response = Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/health' -TimeoutSec 3
    return ($response.data.status -eq 'ok')
  } catch {
    return $false
  }
}

function Test-FrontendHealth {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Method Get -Uri 'http://localhost:5173' -TimeoutSec 3
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400 -and $response.Content -match '<title>QoderNovel')
  } catch {
    return $false
  }
}

function Wait-ForService {
  param(
    [scriptblock]$HealthCheck,
    [string]$Name,
    [int]$TimeoutSeconds
  )
  for ($elapsed = 0; $elapsed -lt $TimeoutSeconds; $elapsed++) {
    if (& $HealthCheck) {
      Write-Ok "$Name is ready."
      return
    }
    Start-Sleep -Seconds 1
  }
  throw "$Name did not become ready within $TimeoutSeconds seconds. Check the files in logs/."
}

function Ensure-RuntimeDirectories {
  New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
  New-Item -ItemType Directory -Path $PidsDir -Force | Out-Null
}

function Get-TrackedProcess {
  param([int]$ProcessId)
  return (Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue)
}

function Test-ExpectedProcessCommand {
  param(
    [object]$Process,
    [string]$ExpectedMode
  )
  if (-not $Process -or -not $Process.CommandLine) { return $false }
  $hasScript = $Process.CommandLine.IndexOf($ScriptPath, [StringComparison]::OrdinalIgnoreCase) -ge 0
  $hasMode = [regex]::IsMatch($Process.CommandLine, "(?i)-Mode\s+$([regex]::Escape($ExpectedMode))(?:\s|$)")
  return ($hasScript -and $hasMode)
}

function Start-TrackedService {
  param(
    [string]$Name,
    [string]$RunMode
  )
  Ensure-RuntimeDirectories
  $recordPath = Join-Path $PidsDir "$($Name.ToLowerInvariant()).json"
  if (Test-Path -LiteralPath $recordPath) {
    try {
      $record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
      $existingProcess = Get-TrackedProcess -ProcessId ([int]$record.pid)
      if (Test-ExpectedProcessCommand $existingProcess $RunMode) {
        Write-Ok "$Name is already tracked (PID $($record.pid))."
        return [int]$record.pid
      }
    } catch {
      Write-Warn "Ignoring stale $Name PID record."
    }
    Remove-Item -LiteralPath $recordPath -Force -ErrorAction SilentlyContinue
  }

  $powerShell = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
  $argumentList = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', ('"{0}"' -f $ScriptPath),
    '-Mode', $RunMode
  )
  $stdoutPath = Join-Path $LogsDir "$($Name.ToLowerInvariant()).out.log"
  $stderrPath = Join-Path $LogsDir "$($Name.ToLowerInvariant()).err.log"
  $process = Start-Process -FilePath $powerShell -ArgumentList $argumentList -WorkingDirectory $RepoRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
  $record = [ordered]@{
    pid = $process.Id
    mode = $RunMode
    scriptPath = $ScriptPath
    startedAt = [DateTime]::UtcNow.ToString('o')
  } | ConvertTo-Json
  $utf8WithoutBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
  [IO.File]::WriteAllText($recordPath, $record, $utf8WithoutBom)
  Write-Step "Started $Name (PID $($process.Id))."
  return $process.Id
}

function Ensure-OllamaReady {
  if (Test-OllamaHealth) {
    Write-Ok 'Reusing the healthy Ollama service on port 11434.'
    return
  }
  if (Test-TcpPort 'localhost' 11434) {
    throw 'Port 11434 is occupied, but it is not a healthy Ollama service.'
  }
  Start-TrackedService 'Ollama' 'RunOllama' | Out-Null
  Wait-ForService ${function:Test-OllamaHealth} 'Ollama' 120
}

function Ensure-BackendReady {
  if (Test-BackendHealth) {
    Write-Ok 'Reusing the healthy QoderNovel backend on port 3000.'
    return
  }
  if (Test-TcpPort 'localhost' 3000) {
    throw 'Port 3000 is occupied, but GET /health is not a healthy QoderNovel backend.'
  }
  Start-TrackedService 'Backend' 'RunBackend' | Out-Null
  Wait-ForService ${function:Test-BackendHealth} 'Backend' 180
}

function Ensure-FrontendReady {
  if (Test-FrontendHealth) {
    Write-Ok 'Reusing the healthy frontend on port 5173.'
    return
  }
  if (Test-TcpPort 'localhost' 5173) {
    throw 'Port 5173 is occupied, but it is not serving the QoderNovel frontend.'
  }
  Start-TrackedService 'Frontend' 'RunFrontend' | Out-Null
  Wait-ForService ${function:Test-FrontendHealth} 'Frontend' 120
}

function Ensure-OllamaProvider {
  $endpoint = 'http://localhost:3000/api/ai/providers'
  $response = Invoke-RestMethod -Method Get -Uri $endpoint -TimeoutSec 10
  $providers = @()
  if ($response.PSObject.Properties['data'] -and $response.data.PSObject.Properties['providers']) {
    $providers = @($response.data.providers)
  } elseif ($response.PSObject.Properties['providers']) {
    $providers = @($response.providers)
  }
  if ($providers | Where-Object { $_.name -eq 'ollama' } | Select-Object -First 1) {
    Write-Ok 'Ollama provider already exists; no duplicate was created.'
    return
  }

  $localText = [string]::Concat([char]0x672C, [char]0x5730)
  $body = @{
    name = 'ollama'
    label = "Ollama ($localText)"
    baseUrl = 'http://localhost:11434/v1'
    apiKey = 'ollama-local'
    model = $OllamaModel
    enabled = $true
    priority = 0
  } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri $endpoint -ContentType 'application/json' -Body $body -TimeoutSec 15 | Out-Null
  Write-Ok 'Created the local Ollama provider.'
}

function Assert-StartEnvironment {
  if (-not (Test-Path -LiteralPath $ServerEnvPath)) {
    throw 'apps/server/.env is missing. Run the environment bootstrap first.'
  }
  if ((Get-NodeMajorVersion) -lt 22) { throw 'Node.js 22 or newer is required. Run the environment bootstrap first.' }
  if (-not (Resolve-PnpmPath)) { throw 'pnpm is missing. Run the environment bootstrap first.' }
  if (-not (Resolve-PsqlPath)) { throw 'PostgreSQL is missing. Run the environment bootstrap first.' }
  if (-not (Resolve-OllamaPath)) { throw 'Ollama is missing. Run the environment bootstrap first.' }
}

function Start-QoderNovel {
  Refresh-ProcessPath
  Assert-StartEnvironment
  Ensure-RuntimeDirectories
  Ensure-PostgresService
  Ensure-OllamaReady
  Ensure-BackendReady
  Ensure-OllamaProvider
  Ensure-FrontendReady

  Write-Host ''
  Write-Ok 'QoderNovel is ready at http://localhost:5173'
  Write-Host "Logs: $LogsDir"
  Start-Process 'http://localhost:5173' | Out-Null
}

function Stop-TrackedService {
  param(
    [string]$Name,
    [string]$ExpectedMode
  )
  $recordPath = Join-Path $PidsDir "$($Name.ToLowerInvariant()).json"
  if (-not (Test-Path -LiteralPath $recordPath)) {
    Write-Host "$Name was not started by this project."
    return
  }

  try {
    $record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
    $processId = [int]$record.pid
    $process = Get-TrackedProcess -ProcessId $processId
    if (-not $process) {
      Write-Warn "$Name PID $processId is no longer running."
      return
    }
    if (-not (Test-ExpectedProcessCommand $process $ExpectedMode)) {
      Write-Warn "$Name PID $processId no longer matches this project; it was not terminated."
      return
    }

    Write-Step "Stopping $Name process tree (PID $processId)..."
    & taskkill.exe /PID $processId /T /F | Out-Null
    if ($LASTEXITCODE -notin @(0, 128)) { throw "taskkill failed for $Name (exit code $LASTEXITCODE)." }
    Write-Ok "$Name stopped."
  } finally {
    Remove-Item -LiteralPath $recordPath -Force -ErrorAction SilentlyContinue
  }
}

function Stop-QoderNovel {
  Ensure-RuntimeDirectories
  Stop-TrackedService 'Frontend' 'RunFrontend'
  Stop-TrackedService 'Backend' 'RunBackend'
  Stop-TrackedService 'Ollama' 'RunOllama'
  Write-Ok 'Tracked QoderNovel services stopped. PostgreSQL was left running.'
}

function Bootstrap-QoderNovel {
  Ensure-ServerEnvironment
  Refresh-ProcessPath
  if (Test-NeedsElevatedPrerequisites) {
    Invoke-ElevatedPrerequisiteInstall
    Refresh-ProcessPath
  }

  if ((Get-NodeMajorVersion) -lt 22) { throw 'Node.js 22 or newer is still unavailable after installation.' }
  if (-not (Resolve-PsqlPath)) { throw 'PostgreSQL 17 is still unavailable after installation.' }
  if (-not (Resolve-OllamaPath)) { throw 'Ollama is still unavailable after installation.' }

  $pnpm = Ensure-Pnpm
  Push-Location $RepoRoot
  try {
    Write-Step 'Running pnpm install --frozen-lockfile...'
    & $pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
  } finally {
    Pop-Location
  }

  Initialize-Database
  Ensure-OllamaReady
  $ollama = Resolve-OllamaPath
  Write-Step "Downloading or verifying Ollama model $OllamaModel..."
  & $ollama pull $OllamaModel
  if ($LASTEXITCODE -ne 0) { throw "Ollama could not download $OllamaModel." }

  $autostart = Join-Path $RepoRoot 'autostart.bat'
  Write-Step 'Environment is ready; launching autostart.bat...'
  & $autostart
  if ($LASTEXITCODE -ne 0) { throw "autostart.bat failed (exit code $LASTEXITCODE)." }
}

function Run-Backend {
  Refresh-ProcessPath
  Set-Location $RepoRoot
  Invoke-PnpmCommand -Arguments @('--filter', '@qoder-novel/server', 'dev') -Description 'Backend service'
}

function Run-Frontend {
  Refresh-ProcessPath
  Set-Location $RepoRoot
  Invoke-PnpmCommand -Arguments @('--filter', '@qoder-novel/web', 'dev', '--host', '127.0.0.1', '--port', '5173') -Description 'Frontend service'
}

function Run-Ollama {
  Refresh-ProcessPath
  $ollama = Resolve-OllamaPath
  if (-not $ollama) { throw 'ollama.exe is unavailable.' }
  & $ollama serve
  if ($LASTEXITCODE -ne 0) { throw "Ollama service exited with code $LASTEXITCODE." }
}

try {
  switch ($Mode) {
    'Bootstrap' { Bootstrap-QoderNovel }
    'InstallPrerequisites' { Install-Prerequisites }
    'Start' { Start-QoderNovel }
    'Stop' { Stop-QoderNovel }
    'RunBackend' { Run-Backend }
    'RunFrontend' { Run-Frontend }
    'RunOllama' { Run-Ollama }
  }
  exit 0
} catch {
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

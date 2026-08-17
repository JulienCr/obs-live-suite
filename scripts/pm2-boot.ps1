#Requires -Version 5.1
<#
.SYNOPSIS
  Start the OBS Live Suite PM2 stack. Entry point for the logon scheduled task
  registered by scripts/pm2-autostart.ps1.

.DESCRIPTION
  Runs `pm2 start ecosystem.config.cjs` with absolute paths, so it works in a
  bare Task Scheduler environment where the interactive shell's PATH is absent.
  That matters here because Node comes from fnm, which injects its PATH entry
  per-shell: a scheduled task would not find `node` or `pm2` on its own.

  Node is resolved through the fnm `default` alias junction rather than a pinned
  version directory, so `fnm default <version>` keeps working without editing
  this script.

  The run is idempotent: PM2 leaves already-online apps untouched, so a manual
  run after the task has fired is harmless.

  Everything is appended to .pm2/logs/autostart.log. A scheduled task fails
  silently by nature, so that file is the only way to find out why the stack did
  not come up after a reboot.

.PARAMETER DelaySeconds
  Wait before starting. The scheduled task carries its own trigger delay; this is
  for reproducing that wait by hand.

.EXAMPLE
  pnpm pm2:boot

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pm2-boot.ps1 -DelaySeconds 30
#>
[CmdletBinding()]
param(
  [int] $DelaySeconds = 0
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path $PSScriptRoot -Parent
$logDir = Join-Path $projectRoot '.pm2\logs'
$logFile = Join-Path $logDir 'autostart.log'

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

function Write-Log {
  param([string] $Message)
  $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
  Write-Host $line
}

function Resolve-NodeExe {
  # fnm's `default` alias is a junction to the active installation directory.
  $fromAlias = Join-Path $env:APPDATA 'fnm\aliases\default\node.exe'
  if (Test-Path $fromAlias) { return $fromAlias }

  $fromPath = (Get-Command node -ErrorAction SilentlyContinue).Source
  if ($fromPath) { return $fromPath }

  # Last resort: newest fnm-managed version on disk.
  $versions = Join-Path $env:APPDATA 'fnm\node-versions'
  if (Test-Path $versions) {
    $newest = Get-ChildItem $versions -Directory |
      Where-Object { $_.Name -match '^v\d' } |
      Sort-Object { [version] ($_.Name.TrimStart('v')) } -Descending |
      Select-Object -First 1
    if ($newest) {
      $exe = Join-Path $newest.FullName 'installation\node.exe'
      if (Test-Path $exe) { return $exe }
    }
  }
  return $null
}

function Resolve-Pm2Cli {
  param([string] $NodeExe, [string] $ProjectRoot)

  # The project declares pm2 as a devDependency, so a plain `pnpm install` is
  # enough and no global install is required. Prefer that copy: it is the one
  # `pnpm pm2:start` runs, and pinning to it keeps the scheduled task on the same
  # version as the documented command.
  $local = Join-Path $ProjectRoot 'node_modules\pm2\bin\pm2'
  if (Test-Path $local) { return $local }

  # Global installs. The Node directory holds them for fnm/nvm-style layouts, but
  # that is a coincidence of those managers, not a rule - so ask npm for the real
  # prefix before giving up.
  $candidates = @(
    (Join-Path (Split-Path $NodeExe -Parent) 'node_modules\pm2\bin\pm2'),
    (Join-Path $env:APPDATA 'npm\node_modules\pm2\bin\pm2')
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) { return $candidate }
  }

  try {
    $npmRoot = (& npm root -g 2>$null | Select-Object -First 1)
    if ($npmRoot) {
      $fromNpm = Join-Path $npmRoot.Trim() 'pm2\bin\pm2'
      if (Test-Path $fromNpm) { return $fromNpm }
    }
  } catch {
    # npm missing from a scheduled task's PATH is not fatal on its own.
  }

  return $null
}

Write-Log '--- pm2-boot start ---'

if ($DelaySeconds -gt 0) {
  Write-Log ("waiting {0}s before start" -f $DelaySeconds)
  Start-Sleep -Seconds $DelaySeconds
}

$node = Resolve-NodeExe
if (-not $node) {
  Write-Log 'FATAL: node.exe not found (fnm alias, PATH and node-versions all failed).'
  exit 1
}

# ecosystem.config.cjs uses `script: 'node'`, which PM2 only treats as an
# executable if it is on PATH - otherwise it looks for a file named "node" in the
# project root and fails. A scheduled task inherits none of fnm's per-shell PATH,
# so put the resolved Node directory back on it. Done before resolving pm2, which
# may need npm on PATH.
$nodeDir = Split-Path $node -Parent
if (($env:Path -split ';') -notcontains $nodeDir) {
  $env:Path = "{0};{1}" -f $nodeDir, $env:Path
  Write-Log ("PATH += {0}" -f $nodeDir)
}

$pm2 = Resolve-Pm2Cli -NodeExe $node -ProjectRoot $projectRoot
if (-not $pm2) {
  Write-Log 'FATAL: pm2 not found (project node_modules, global prefix and Node directory all failed).'
  Write-Log 'Run `pnpm install` in the project, or `npm i -g pm2`.'
  exit 1
}

$ecosystem = Join-Path $projectRoot 'ecosystem.config.cjs'
if (-not (Test-Path $ecosystem)) {
  Write-Log ("FATAL: {0} not found." -f $ecosystem)
  exit 1
}

Write-Log ("node : {0}" -f $node)
Write-Log ("pm2  : {0}" -f $pm2)
Write-Log ("root : {0}" -f $projectRoot)

Push-Location $projectRoot
try {
  # Decode PM2's output as UTF-8, otherwise its box-drawing table arrives already
  # mangled through the OEM code page and the filter below cannot recognise it.
  $previousEncoding = [Console]::OutputEncoding
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

  # PM2 writes routine notices ([PM2][WARN], deprecation notes) to stderr. With
  # ErrorActionPreference = Stop those become terminating errors, which would
  # abort the boot over a message that is not a failure. Judge by exit code.
  $ErrorActionPreference = 'Continue'

  $output = & $node $pm2 start $ecosystem 2>&1
  $code = $LASTEXITCODE

  foreach ($line in $output) {
    $text = "$line"
    if ([string]::IsNullOrWhiteSpace($text)) { continue }
    # Drop PM2's box-drawing status table: unreadable in a log file, and its
    # glyphs come back mangled through the console code page. The real state is
    # captured below, after the apps have had a moment to crash if they will.
    # Escaped, not literal: powershell.exe 5.1 reads a BOM-less .ps1 as ANSI, so
    # non-ASCII source characters arrive corrupted.
    if ($text -match '[\u2500-\u257F]') { continue }
    Write-Log ("  | {0}" -f $text)
  }
  Write-Log ("pm2 start exit code: {0}" -f $code)

  # `launched` only means PM2 spawned it. Give crash loops time to surface, then
  # record the real per-app state - this log is the only trace after a reboot.
  # The helper is a file rather than `node -e`: PowerShell strips the quotes out
  # of an inline script when handing it to a native command.
  Start-Sleep -Seconds 8
  $statusScript = Join-Path $PSScriptRoot 'pm2-status.cjs'
  # Derived from the resolved CLI (<pm2>/bin/pm2), so it follows whichever copy
  # Resolve-Pm2Cli picked instead of re-guessing a location.
  $pm2Module = Split-Path (Split-Path $pm2 -Parent) -Parent
  $statusLines = & $node $statusScript $pm2Module 2>&1

  $notOnline = @()
  foreach ($entry in $statusLines) {
    $text = "$entry"
    if ($text -notmatch '^(.+)=([a-z_]+):(\d+)$') {
      Write-Log ("  status: {0}" -f $text)
      continue
    }
    Write-Log ("  status: {0} = {1} (restarts: {2})" -f $Matches[1], $Matches[2], $Matches[3])
    if ($Matches[2] -ne 'online') { $notOnline += $Matches[1] }
  }
  if ($notOnline.Count -gt 0) {
    Write-Log ("WARNING: not online -> {0}" -f ($notOnline -join ', '))
  }

  exit $code
} catch {
  Write-Log ("FATAL: {0}" -f $_.Exception.Message)
  exit 1
} finally {
  if ($previousEncoding) { [Console]::OutputEncoding = $previousEncoding }
  Pop-Location
}

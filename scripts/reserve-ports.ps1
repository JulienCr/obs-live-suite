#Requires -Version 5.1
<#
.SYNOPSIS
  Reserve OBS Live Suite's fixed ports so Windows (or apps like Stream Deck) can't
  grab them as dynamic ports — the root cause of EADDRINUSE on 3002/3004.

.DESCRIPTION
  On this machine the TCP dynamic port range starts at 1024, so any app can be
  assigned a low port (3000-3004) as an ephemeral port. This script reserves the
  suite's ports via `netsh ... add excludedportrange` (IPv4 + IPv6) so they are
  never auto-assigned to anything else.

  The script:
    1. Self-elevates via UAC (netsh excludedportrange requires admin).
    2. Stops PM2 to free the ports (skipped with -SkipPm2).
    3. Reserves each port that isn't already excluded (idempotent — safe to re-run).
    4. Restarts PM2 (skipped with -NoRestart or -SkipPm2).

  A port that is still held after the PM2 stop is reported (with the owning PID
  and process name) and skipped — close that app and re-run.

.PARAMETER Ports
  Ports to reserve. Default: 3000 (frontend), 3002 (backend HTTP), 3003 (WS hub),
  3004 (MCP). 3000/3003 are usually already reserved and will be skipped.

.PARAMETER NoRestart
  Reserve the ports but do not restart PM2 afterwards.

.PARAMETER SkipPm2
  Don't touch PM2 at all (assumes the ports are already free).

.EXAMPLE
  pnpm reserve:ports

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/reserve-ports.ps1 -Ports 3002,3004
#>
[CmdletBinding()]
param(
  [int[]] $Ports = @(3000, 3002, 3003, 3004),
  [switch] $NoRestart,
  [switch] $SkipPm2
)

$ErrorActionPreference = 'Stop'

# --- Self-elevate (netsh excludedportrange needs admin) ----------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "Administrator rights required - relaunching via UAC..." -ForegroundColor Yellow
  $exe = (Get-Process -Id $PID).Path
  $argList = @('-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath,
    '-Ports', ($Ports -join ','))
  if ($NoRestart) { $argList += '-NoRestart' }
  if ($SkipPm2)   { $argList += '-SkipPm2' }
  try {
    Start-Process -FilePath $exe -Verb RunAs -ArgumentList $argList
  } catch {
    Write-Host "Elevation cancelled. Re-run from an elevated terminal." -ForegroundColor Red
    exit 1
  }
  exit 0
}

# --- Helpers -----------------------------------------------------------------
function Get-ExcludedRanges {
  param([string] $Family)
  $ranges = @()
  $out = netsh int $Family show excludedportrange protocol=tcp 2>$null
  foreach ($line in $out) {
    # Data rows are "<start>  <end>" (locale-independent); skip headers/dashes.
    if ($line -match '^\s*(\d+)\s+(\d+)') {
      $ranges += [pscustomobject]@{ Start = [int]$Matches[1]; End = [int]$Matches[2] }
    }
  }
  return , $ranges
}

function Test-PortExcluded {
  param([int] $Port, $Ranges)
  foreach ($r in $Ranges) {
    if ($Port -ge $r.Start -and $Port -le $r.End) { return $true }
  }
  return $false
}

function Get-PortHolder {
  param([int] $Port)
  $c = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -ne 0 }
  if (-not $c) { return $null }
  $g = $c | Group-Object OwningProcess | Select-Object -First 1
  $procId = [int] $g.Name
  $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
  return [pscustomobject]@{
    Pid    = $procId
    Name   = if ($p) { $p.ProcessName } else { 'unknown' }
    States = (($g.Group.State | Sort-Object -Unique) -join ',')
  }
}

function Invoke-Pnpm {
  param([string] $Script)
  Push-Location $projectRoot
  try {
    pnpm $Script 2>&1 | Out-Host
    return $true
  } catch {
    Write-Host ("  pnpm $Script failed: {0}" -f $_.Exception.Message) -ForegroundColor DarkYellow
    return $false
  } finally {
    Pop-Location
  }
}

# --- Main --------------------------------------------------------------------
$projectRoot = Split-Path $PSScriptRoot -Parent
$families = @('ipv4', 'ipv6')

Write-Host ""
Write-Host "OBS Live Suite - port reservation" -ForegroundColor Cyan
Write-Host ("Ports : {0}" -f ($Ports -join ', '))
Write-Host ("Root  : {0}" -f $projectRoot)

# 1. Free the ports by stopping PM2.
if (-not $SkipPm2) {
  Write-Host "`nStopping PM2 (to free the ports)..." -ForegroundColor Yellow
  [void] (Invoke-Pnpm 'pm2:stop')
  Start-Sleep -Milliseconds 800
}

# 2. Reserve each port (IPv4 + IPv6), idempotently, only if currently free.
Write-Host "`nReserving ports..." -ForegroundColor Yellow
foreach ($port in $Ports) {
  $holder = Get-PortHolder $port
  if ($holder) {
    Write-Host ("  {0}: STILL IN USE by PID {1} ({2}) [{3}] - skipped. Close it and re-run." -f `
        $port, $holder.Pid, $holder.Name, $holder.States) -ForegroundColor Red
    continue
  }
  foreach ($fam in $families) {
    if (Test-PortExcluded $port (Get-ExcludedRanges $fam)) {
      Write-Host ("  {0} [{1}]: already reserved" -f $port, $fam) -ForegroundColor DarkGray
      continue
    }
    $null = netsh int $fam add excludedportrange protocol=tcp startport=$port numberofports=1
    if ($LASTEXITCODE -eq 0) {
      Write-Host ("  {0} [{1}]: reserved" -f $port, $fam) -ForegroundColor Green
    } else {
      Write-Host ("  {0} [{1}]: netsh failed (exit {2})" -f $port, $fam, $LASTEXITCODE) -ForegroundColor Red
    }
  }
}

# 3. Restart PM2.
if (-not $SkipPm2 -and -not $NoRestart) {
  Write-Host "`nStarting PM2..." -ForegroundColor Yellow
  [void] (Invoke-Pnpm 'pm2:start')
}

# 4. Summary.
Write-Host "`nSummary (IPv4 exclusions):" -ForegroundColor Cyan
$ranges4 = Get-ExcludedRanges 'ipv4'
foreach ($port in $Ports) {
  $ok = Test-PortExcluded $port $ranges4
  $mark = if ($ok) { 'reserved   ' } else { 'NOT reserved' }
  $color = if ($ok) { 'Green' } else { 'Red' }
  Write-Host ("  {0} : {1}" -f $port, $mark) -ForegroundColor $color
}
Write-Host "`nDone." -ForegroundColor Cyan

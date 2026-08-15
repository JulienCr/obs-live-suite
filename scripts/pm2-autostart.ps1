#Requires -Version 5.1
<#
.SYNOPSIS
  Register (or remove) a logon scheduled task that starts the OBS Live Suite PM2
  stack automatically, with no terminal window.

.DESCRIPTION
  Without this, PM2 has to be started by hand after every reboot, from a terminal
  that then has to stay out of the way.

  The task runs scripts/pm2-boot.ps1 in the *interactive session*, on purpose,
  rather than installing PM2 as a Windows service:

    - PathManager resolves the data directory from homedir(). A LocalSystem
      service would resolve it to config\systemprofile and quietly use the wrong
      database.
    - obs-stt captures a microphone. Audio endpoints are per-session, so a
      session 0 service would find no capture device.

  Consequence: the stack comes up at *logon*, not at boot. On a machine that is
  logged in and running OBS anyway, that is the intended trade-off.

  Stray terminal windows are a separate matter, already fixed at the source: PM2
  runs its apps with no console, so any grandchild console process spawned
  without CREATE_NO_WINDOW gets a brand-new console, i.e. a visible window. That
  is why ecosystem.config.cjs uses `node --import tsx` (no tsx CLI re-spawn) and
  why the spawns in start-frontend.mjs and realtime-stt/run.mjs pass
  windowsHide. -Action status also reports the default terminal application,
  which only changes what such a window would look like, not whether it appears.

.PARAMETER Action
  install   - create/replace the task (default)
  uninstall - delete the task
  status    - show the task, its last result, and the default terminal setting
  run       - trigger the task now (to verify it works without rebooting)

.PARAMETER DelaySeconds
  Delay between logon and the start, letting the network, Tailscale and audio
  devices settle first. Default 45.

.EXAMPLE
  pnpm pm2:autostart

.EXAMPLE
  pnpm pm2:autostart:status

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pm2-autostart.ps1 -Action uninstall
#>
[CmdletBinding()]
param(
  [ValidateSet('install', 'uninstall', 'status', 'run')]
  [string] $Action = 'install',
  [int] $DelaySeconds = 45
)

$ErrorActionPreference = 'Stop'

$TaskName = 'OBS Live Suite - PM2 autostart'
$projectRoot = Split-Path $PSScriptRoot -Parent
$bootScript = Join-Path $PSScriptRoot 'pm2-boot.ps1'
$logFile = Join-Path $projectRoot '.pm2\logs\autostart.log'

# conhost; Windows Terminal uses different GUIDs for console vs terminal.
$ConhostGuid = '{B23D10C0-E52E-411E-9D5B-C09FDF709C7D}'

function Get-DefaultTerminal {
  $sub = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Console\%%Startup')
  $console = if ($null -eq $sub) { $null } else { $sub.GetValue('DelegationConsole') }
  if ([string]::IsNullOrWhiteSpace($console)) { return 'Windows Terminal (Windows 11 default)' }
  if ($console -eq $ConhostGuid) { return 'Windows Console Host / conhost' }
  return ("custom ({0})" -f $console)
}

function Get-Task {
  Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
}

switch ($Action) {

  'install' {
    if (-not (Test-Path $bootScript)) { throw "Boot script not found: $bootScript" }

    Write-Host ""
    Write-Host "OBS Live Suite - PM2 autostart" -ForegroundColor Cyan
    Write-Host ("Task  : {0}" -f $TaskName)
    Write-Host ("Runs  : {0}" -f $bootScript)
    Write-Host ("User  : {0}" -f "$env:USERDOMAIN\$env:USERNAME")
    Write-Host ("Delay : {0}s after logon" -f $DelaySeconds)

    # Named taskAction, not action: PowerShell variables are case-insensitive, so
    # $action would overwrite this script's own -Action parameter.
    $taskAction = New-ScheduledTaskAction `
      -Execute 'powershell.exe' `
      -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $bootScript) `
      -WorkingDirectory $projectRoot

    $taskTrigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
    $taskTrigger.Delay = ('PT{0}S' -f $DelaySeconds)

    $principal = New-ScheduledTaskPrincipal `
      -UserId "$env:USERDOMAIN\$env:USERNAME" `
      -LogonType Interactive `
      -RunLevel Limited

    # Hidden keeps the task itself out of sight; the window suppression comes
    # from -WindowStyle Hidden plus conhost being the default terminal.
    $settings = New-ScheduledTaskSettingsSet `
      -Hidden `
      -AllowStartIfOnBatteries `
      -DontStopIfGoingOnBatteries `
      -StartWhenAvailable `
      -MultipleInstances IgnoreNew `
      -ExecutionTimeLimit ([TimeSpan]::Zero)

    try {
      Register-ScheduledTask -TaskName $TaskName -Action $taskAction -Trigger $taskTrigger `
        -Principal $principal -Settings $settings `
        -Description 'Starts the OBS Live Suite PM2 stack (frontend, backend, MCP, STT) at logon.' `
        -Force | Out-Null
    } catch {
      Write-Host ("`nRegistration failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
      Write-Host "If this is an access error, re-run from an elevated terminal." -ForegroundColor Yellow
      exit 1
    }

    Write-Host "`nTask registered." -ForegroundColor Green
    Write-Host ("Default terminal: {0}" -f (Get-DefaultTerminal))
    Write-Host "`nVerify without rebooting:  pnpm pm2:autostart:run" -ForegroundColor Cyan
    Write-Host ("Boot log:                  {0}" -f $logFile)
  }

  'uninstall' {
    if (-not (Get-Task)) {
      Write-Host "Task not registered - nothing to do." -ForegroundColor DarkGray
      break
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Task removed." -ForegroundColor Green
    Write-Host "PM2 itself is untouched; stop it with pnpm pm2:stop." -ForegroundColor DarkGray
  }

  'status' {
    Write-Host ""
    Write-Host "OBS Live Suite - PM2 autostart status" -ForegroundColor Cyan

    $task = Get-Task
    if (-not $task) {
      Write-Host "  Task      : NOT registered" -ForegroundColor Yellow
      Write-Host "  Install it: pnpm pm2:autostart"
    } else {
      $info = Get-ScheduledTaskInfo -TaskName $TaskName
      Write-Host ("  Task      : registered ({0})" -f $task.State) -ForegroundColor Green
      Write-Host ("  Last run  : {0}" -f $info.LastRunTime)
      $resultColor = if ($info.LastTaskResult -eq 0) { 'Green' } else { 'Yellow' }
      Write-Host ("  Last result: {0}" -f $info.LastTaskResult) -ForegroundColor $resultColor
    }

    Write-Host ("  Default terminal: {0}" -f (Get-DefaultTerminal))

    if (Test-Path $logFile) {
      Write-Host "`n  Last lines of autostart.log:" -ForegroundColor Cyan
      Get-Content $logFile -Tail 12 | ForEach-Object { Write-Host ("    {0}" -f $_) -ForegroundColor DarkGray }
    } else {
      Write-Host "`n  No autostart.log yet (task has never run)." -ForegroundColor DarkGray
    }
  }

  'run' {
    if (-not (Get-Task)) {
      Write-Host "Task not registered. Run: pnpm pm2:autostart" -ForegroundColor Red
      exit 1
    }
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "Task triggered. Follow it with: pnpm pm2:autostart:status" -ForegroundColor Green
  }
}

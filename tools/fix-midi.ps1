# Fix MIDI - Restart Windows MIDI Service after loopMIDI is running
# Run as Administrator

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Relancement en tant qu'administrateur..." -ForegroundColor Yellow
    Start-Process powershell.exe "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "=== Fix MIDI Ports ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check loopMIDI is running
$loopMidi = Get-Process -Name "loopMIDI" -ErrorAction SilentlyContinue
if (-not $loopMidi) {
    Write-Host "[!] loopMIDI n'est pas lance. Lancement..." -ForegroundColor Yellow
    $loopMidiPath = "${env:ProgramFiles(x86)}\Tobias Erichsen\loopMIDI\loopMIDI.exe"
    if (-not (Test-Path $loopMidiPath)) {
        $loopMidiPath = "$env:ProgramFiles\Tobias Erichsen\loopMIDI\loopMIDI.exe"
    }
    if (Test-Path $loopMidiPath) {
        Start-Process $loopMidiPath
        Write-Host "    Attente 3s pour que les ports se creent..." -ForegroundColor Gray
        Start-Sleep -Seconds 3
    } else {
        Write-Host "[X] loopMIDI introuvable. Lance-le manuellement puis relance ce script." -ForegroundColor Red
        Read-Host "Appuie sur Entree pour quitter"
        exit 1
    }
}
Write-Host "[OK] loopMIDI tourne" -ForegroundColor Green

# 2. Restart Windows MIDI Service
Write-Host ""
Write-Host "Redemarrage du service Windows MIDI..." -ForegroundColor Cyan
sc.exe stop MidiSrv | Out-Null
Start-Sleep -Seconds 2
sc.exe config MidiSrv start=auto | Out-Null
sc.exe start MidiSrv | Out-Null
Start-Sleep -Seconds 2

$svc = sc.exe query MidiSrv | Select-String "RUNNING"
if ($svc) {
    Write-Host "[OK] Service Windows MIDI demarre" -ForegroundColor Green
} else {
    Write-Host "[!] Service pas encore pret, nouvelle tentative..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    sc.exe start MidiSrv | Out-Null
}

# 3. List ports
Write-Host ""
Write-Host "=== Verification des ports MIDI ===" -ForegroundColor Cyan

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinMM2 {
    [DllImport("winmm.dll")] public static extern uint midiInGetNumDevs();
    [DllImport("winmm.dll")] public static extern uint midiOutGetNumDevs();
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
    public struct MIDIINCAPS {
        public ushort wMid; public ushort wPid; public uint vDriverVersion;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string szPname;
        public uint dwSupport;
    }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
    public struct MIDIOUTCAPS {
        public ushort wMid; public ushort wPid; public uint vDriverVersion;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string szPname;
        public ushort wTechnology; public ushort wVoices; public ushort wNotes;
        public ushort wChannelMask; public uint dwSupport;
    }
    [DllImport("winmm.dll", CharSet=CharSet.Auto)]
    public static extern uint midiInGetDevCaps(uint uDeviceID, ref MIDIINCAPS lpCaps, uint cbCaps);
    [DllImport("winmm.dll", CharSet=CharSet.Auto)]
    public static extern uint midiOutGetDevCaps(uint uDeviceID, ref MIDIOUTCAPS lpCaps, uint cbCaps);
}
"@

$numIn = [WinMM2]::midiInGetNumDevs()
$numOut = [WinMM2]::midiOutGetNumDevs()

Write-Host ""
Write-Host "MIDI IN ($numIn ports):" -ForegroundColor White
for ($i = 0; $i -lt $numIn; $i++) {
    $caps = New-Object WinMM2+MIDIINCAPS
    $size = [System.Runtime.InteropServices.Marshal]::SizeOf($caps)
    [WinMM2]::midiInGetDevCaps([uint32]$i, [ref]$caps, [uint32]$size) | Out-Null
    Write-Host "  $i : $($caps.szPname)"
}

Write-Host ""
Write-Host "MIDI OUT ($numOut ports):" -ForegroundColor White
for ($i = 0; $i -lt $numOut; $i++) {
    $caps = New-Object WinMM2+MIDIOUTCAPS
    $size = [System.Runtime.InteropServices.Marshal]::SizeOf($caps)
    [WinMM2]::midiOutGetDevCaps([uint32]$i, [ref]$caps, [uint32]$size) | Out-Null
    Write-Host "  $i : $($caps.szPname)"
}

if ($numIn -gt 1) {
    Write-Host ""
    Write-Host "[OK] Ports MIDI detectes avec succes !" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[X] Aucun port loopMIDI detecte. Essaie de redemarrer le PC." -ForegroundColor Red
}

Write-Host ""
Read-Host "Appuie sur Entree pour quitter"

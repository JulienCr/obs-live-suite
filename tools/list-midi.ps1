Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinMM {
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

Write-Host "=== MIDI INPUT PORTS ==="
$numIn = [WinMM]::midiInGetNumDevs()
Write-Host "  Count: $numIn"
for ($i = 0; $i -lt $numIn; $i++) {
    $caps = New-Object WinMM+MIDIINCAPS
    $size = [System.Runtime.InteropServices.Marshal]::SizeOf($caps)
    [WinMM]::midiInGetDevCaps([uint32]$i, [ref]$caps, [uint32]$size) | Out-Null
    Write-Host "  $i : $($caps.szPname)"
}

Write-Host ""
Write-Host "=== MIDI OUTPUT PORTS ==="
$numOut = [WinMM]::midiOutGetNumDevs()
Write-Host "  Count: $numOut"
for ($i = 0; $i -lt $numOut; $i++) {
    $caps = New-Object WinMM+MIDIOUTCAPS
    $size = [System.Runtime.InteropServices.Marshal]::SizeOf($caps)
    [WinMM]::midiOutGetDevCaps([uint32]$i, [ref]$caps, [uint32]$size) | Out-Null
    Write-Host "  $i : $($caps.szPname)"
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@

# Find the Recall process window
$proc = Get-Process -Name "recall" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) {
    Write-Error "Recall process not found"
    exit 1
}

$hwnd = $proc.MainWindowHandle
if ($hwnd -eq [IntPtr]::Zero) {
    Write-Error "Recall has no main window"
    exit 1
}

# Bring to foreground
[WinAPI]::ShowWindow($hwnd, 9)  # SW_RESTORE
[WinAPI]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 500

# Get updated window rect
$proc.Refresh()
$rect = $proc.MainWindowHandle
Add-Type @"
using System;
using System.Runtime.InteropServices;
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
public class WinRect {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
}
"@

$r = New-Object RECT
[WinRect]::GetWindowRect($hwnd, [ref]$r)

$width = $r.Right - $r.Left
$height = $r.Bottom - $r.Top

Write-Host "Capturing window: $($proc.MainWindowTitle) ($width x $height)"

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($r.Left, $r.Top, 0, 0, (New-Object System.Drawing.Size($width, $height)))

$outputPath = $args[0]
$bitmap.Save($outputPath)
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "Saved: $outputPath"

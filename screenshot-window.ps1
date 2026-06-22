param([string]$OutputPath, [string]$WindowTitle)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Find the window by title (partial match)
$procs = Get-Process | Where-Object { $_.MainWindowTitle -like "*$WindowTitle*" }
if (-not $procs) {
    Write-Host "ERROR: No window found matching '$WindowTitle'"
    exit 1
}

$proc = $procs[0]
$hwnd = $proc.MainWindowHandle
$rect = New-Object System.Drawing.Rectangle

# Get window bounds
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left; public int Top; public int Right; public int Bottom;
    }
}
"@

[WinAPI]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 500

$winRect = New-Object WinAPI+RECT
[WinAPI]::GetWindowRect($hwnd, [ref]$winRect) | Out-Null

$left = $winRect.Left
$top = $winRect.Top
$width = $winRect.Right - $winRect.Left
$height = $winRect.Bottom - $winRect.Top

Write-Host "Capturing window: $($proc.MainWindowTitle) ($width x $height)"

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($left, $top, 0, 0, (New-Object System.Drawing.Size($width, $height)))
$bitmap.Save($OutputPath)
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "Saved: $OutputPath"

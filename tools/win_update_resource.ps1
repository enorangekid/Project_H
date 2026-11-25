# Windows 실행 파일의 리소스를 바꾸는 도우미 (tools/ai6win_exe.js 가 부름)
#   powershell -NoProfile -File tools/win_update_resource.ps1 <대상.exe> <목록.json>
# 목록.json: [{"type":4,"name":104,"lang":1041,"file":"<리소스 바이너리 경로>"}, ...]
param([Parameter(Mandatory)] [string]$Exe, [Parameter(Mandatory)] [string]$Manifest)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public static class ResWriter {
  [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern IntPtr BeginUpdateResource(string file, bool deleteExisting);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool UpdateResource(IntPtr h, IntPtr type, IntPtr name, ushort lang, byte[] data, uint size);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool EndUpdateResource(IntPtr h, bool discard);
}
"@
$items = Get-Content -Raw -Encoding UTF8 $Manifest | ConvertFrom-Json
$h = [ResWriter]::BeginUpdateResource($Exe, $false)
if ($h -eq [IntPtr]::Zero) { throw "BeginUpdateResource 실패: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
foreach ($it in $items) {
  $bytes = [IO.File]::ReadAllBytes($it.file)
  $ok = [ResWriter]::UpdateResource($h, [IntPtr][int]$it.type, [IntPtr][int]$it.name, [uint16]$it.lang, $bytes, [uint32]$bytes.Length)
  if (-not $ok) { [void][ResWriter]::EndUpdateResource($h, $true); throw "UpdateResource 실패 (type $($it.type) name $($it.name)): $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
}
if (-not [ResWriter]::EndUpdateResource($h, $false)) { throw "EndUpdateResource 실패: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
Write-Output "resources updated: $($items.Count)"

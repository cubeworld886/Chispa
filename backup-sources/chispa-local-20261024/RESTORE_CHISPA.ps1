param(
    [Parameter(Mandatory = $true)]
    [string]$Destination
)
$ErrorActionPreference = 'Stop'
$manifestPath = Join-Path $PSScriptRoot 'MANIFIESTO_SHA256.json'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$destinationRoot = [System.IO.Path]::GetFullPath($Destination)
$repoPrefix = $repoRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$destPrefix = $destinationRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (Test-Path -LiteralPath $destinationRoot -PathType Leaf) { throw 'Destination is a file.' }
if (Test-Path -LiteralPath $destinationRoot -PathType Container) {
    if (Get-ChildItem -LiteralPath $destinationRoot -Force | Select-Object -First 1) { throw 'Destination must be empty.' }
} else {
    New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$plan = @()
foreach ($entry in $manifest.files) {
    $source = [System.IO.Path]::GetFullPath((Join-Path $repoRoot ($entry.backup_path -replace '/', '\')))
    $target = [System.IO.Path]::GetFullPath((Join-Path $destinationRoot ($entry.path -replace '/', '\')))
    if (-not $source.StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Manifest source escapes repository root.' }
    if (-not $target.StartsWith($destPrefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Manifest target escapes destination.' }
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing source file: $($entry.path)" }
    $item = Get-Item -LiteralPath $source
    $hash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($item.Length -ne [long]$entry.size_bytes -or $hash -ne $entry.sha256) { throw "Source verification failed: $($entry.path)" }
    $plan += [pscustomobject]@{ Entry = $entry; Source = $source; Target = $target }
}
foreach ($item in $plan) {
    $parent = Split-Path -Parent $item.Target
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    Copy-Item -LiteralPath $item.Source -Destination $item.Target
    $hash = (Get-FileHash -LiteralPath $item.Target -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne $item.Entry.sha256) { throw "Copied file verification failed: $($item.Entry.path)" }
}
$bytes = ($manifest.files | Measure-Object -Property size_bytes -Sum).Sum
Write-Output ("Restored and SHA-256 verified {0} files ({1} bytes) to {2}" -f $plan.Count, $bytes, $destinationRoot)

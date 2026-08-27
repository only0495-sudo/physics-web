param(
    [Parameter(Mandatory = $true)]
    [string]$DocumentPath,
    [Parameter(Mandatory = $true)]
    [string]$OutputDir
)

$resolvedDocument = (Resolve-Path -LiteralPath $DocumentPath).Path
$resolvedOutputParent = (Resolve-Path -LiteralPath (Split-Path -Parent $OutputDir)).Path
$outputLeaf = Split-Path -Leaf $OutputDir
$resolvedOutput = Join-Path $resolvedOutputParent $outputLeaf

if (-not $resolvedOutput.StartsWith($resolvedOutputParent, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Output directory escaped its intended parent."
}

New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$pdfPath = Join-Path $resolvedOutput "高一物理_CH4_學生學習單.pdf"
$pagePrefix = Join-Path $resolvedOutput "page"

$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($resolvedDocument, $false, $true)
    $document.ExportAsFixedFormat($pdfPath, 17)
}
finally {
    if ($null -ne $document) {
        $document.Close(0)
    }
    if ($null -ne $word) {
        $word.Quit()
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

& 'C:\Users\only0\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\override\pdftoppm.cmd' -png -r 150 $pdfPath $pagePrefix

$pages = Get-ChildItem -LiteralPath $resolvedOutput -Filter 'page-*.png' | Sort-Object Name
if (-not $pages) {
    throw "No page PNGs were produced."
}

Write-Output "PDF: $pdfPath"
Write-Output "Pages: $($pages.Count)"
$pages | ForEach-Object { Write-Output $_.FullName }

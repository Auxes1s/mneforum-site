[CmdletBinding()]
param(
    [string]$Source = "origin/master:dev/index.html",
    [string]$Destination = (Join-Path $PSScriptRoot "..\index.html")
)

$ErrorActionPreference = "Stop"

function Replace-Expected {
    param(
        [Parameter(Mandatory)] [string]$Text,
        [Parameter(Mandatory)] [string]$Needle,
        [Parameter(Mandatory)] [string]$Replacement,
        [Parameter(Mandatory)] [int]$ExpectedCount
    )

    $actualCount = ([regex]::Matches($Text, [regex]::Escape($Needle))).Count
    if ($actualCount -ne $ExpectedCount) {
        throw "Expected $ExpectedCount occurrence(s) of the local UI-lock marker; found $actualCount. The master /dev loader changed and needs review."
    }

    return $Text.Replace($Needle, $Replacement)
}

$destinationPath = [System.IO.Path]::GetFullPath($Destination)
$current = [System.IO.File]::ReadAllText($destinationPath)
$speakerBlockPattern = '(?s)\r?\n    // Speaker launches use.*?\r?\n    template = template\.replace\(\r?\n      ''speakerFilters, speakers,'',\r?\n      ''speakerFilters, speakerSessions, speakerLaunchWaves, speakerLaunchSummary,''\r?\n    \);\r?\n'
$speakerBlockMatch = [regex]::Match($current, $speakerBlockPattern)

if (-not $speakerBlockMatch.Success) {
    throw "The current speaker-launch block could not be found in $destinationPath."
}

$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = "git"
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.StandardOutputEncoding = [System.Text.UTF8Encoding]::new($false)
$startInfo.ArgumentList.Add("show")
$startInfo.ArgumentList.Add($Source)

$process = [System.Diagnostics.Process]::Start($startInfo)
$sourceHtml = $process.StandardOutput.ReadToEnd()
$sourceError = $process.StandardError.ReadToEnd()
$process.WaitForExit()

if ($process.ExitCode -ne 0) {
    throw "Unable to read $Source. $sourceError"
}

$insertionMarker = "    // Nested page bundles"
$markerCount = ([regex]::Matches($sourceHtml, [regex]::Escape($insertionMarker))).Count
if ($markerCount -ne 1) {
    throw "Expected one speaker-block insertion marker in $Source; found $markerCount."
}

$portedHtml = $sourceHtml.Replace(
    $insertionMarker,
    $speakerBlockMatch.Value + $insertionMarker
)

# The master /dev page is allowed to evolve, but these two local decisions are
# not: Ultra remains a coherent night presentation and the Forum uses the full
# desktop canvas. Preload and mount the local lock after every upstream sheet,
# then include it in the loader's self-healing stylesheet-order invariant.
$responsivePreload = '<link rel="preload" href="assets/forum-responsive.css?v=20260813-ultra-mobile" as="style">'
$lockPreload = '<link rel="preload" href="assets/forum-ui-lock.css?v=20260826-night-layout" as="style">'
$portedHtml = Replace-Expected $portedHtml $responsivePreload ($responsivePreload + $lockPreload) 2

$responsiveRemoval = "    document.getElementById('forum-responsive-styles')?.remove();"
$lockRemoval = $responsiveRemoval + [Environment]::NewLine + "    document.getElementById('forum-ui-lock-styles')?.remove();"
$portedHtml = Replace-Expected $portedHtml $responsiveRemoval $lockRemoval 1

$responsiveHref = "    responsiveLink.href = 'assets/forum-responsive.css?v=20260813-ultra-mobile';"
$lockMount = $responsiveHref + [Environment]::NewLine +
    "    const uiLockLink = document.createElement('link');" + [Environment]::NewLine +
    "    uiLockLink.id = 'forum-ui-lock-styles';" + [Environment]::NewLine +
    "    uiLockLink.rel = 'stylesheet';" + [Environment]::NewLine +
    "    uiLockLink.href = 'assets/forum-ui-lock.css?v=20260826-night-layout';"
$portedHtml = Replace-Expected $portedHtml $responsiveHref $lockMount 1

$responsiveAppend = "    document.head.appendChild(responsiveLink);"
$lockAppend = $responsiveAppend + [Environment]::NewLine + "    document.head.appendChild(uiLockLink);"
$portedHtml = Replace-Expected $portedHtml $responsiveAppend $lockAppend 2

$responsiveInvariant = "      if (document.head.lastElementChild === responsiveLink &&"
$lockInvariant = "      if (document.head.lastElementChild === uiLockLink &&" + [Environment]::NewLine +
    "          uiLockLink.previousElementSibling === responsiveLink &&"
$portedHtml = Replace-Expected $portedHtml $responsiveInvariant $lockInvariant 1

if ($portedHtml -notmatch "lastElementChild === uiLockLink" -or
    $portedHtml -notmatch "uiLockLink\.previousElementSibling === responsiveLink") {
    throw "The local UI-lock stylesheet-order invariant was not preserved."
}

$tempPath = $destinationPath + ".porting.tmp"
[System.IO.File]::WriteAllText($tempPath, $portedHtml, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::Move($tempPath, $destinationPath, $true)

Write-Host "Ported $Source to $destinationPath and retained the speaker-launch customization."

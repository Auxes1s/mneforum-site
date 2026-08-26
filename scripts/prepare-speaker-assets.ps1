[CmdletBinding()]
param(
    [string]$SourceRoot = 'C:\Cloud\OneDrive - National Economic and Development Authority\&MES-soed - Documents\Forum\13th M&E Network Forum 2026\3 Resource Persons\Resource Persons',
    [string]$OutputRoot = (Join-Path $PSScriptRoot '..\assets\speakers\2026')
)

$ErrorActionPreference = 'Stop'

$ffmpeg = Get-Command ffmpeg -ErrorAction Stop
$ffprobe = Get-Command ffprobe -ErrorAction Stop
$outputDirectory = [IO.Path]::GetFullPath($OutputRoot)
$scratchDirectory = Join-Path $env:TEMP 'mneforum-speaker-assets'
New-Item -ItemType Directory -Force -Path $outputDirectory, $scratchDirectory | Out-Null

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$assets = @(
    [pscustomobject]@{
        Speaker = 'Arsenio M. Balisacan'
        Slug = 'arsenio-balisacan'
        Source = 'Speakers (Keynote and Closing)\SAMB Photo.jpg'
        Kind = 'file'
        EmbeddedPath = ''
        ObjectPosition = '50% 28%'
    },
    [pscustomobject]@{
        Speaker = 'Christophe Bahuet'
        Slug = 'christophe-bahuet'
        Source = 'Speakers (Keynote and Closing)\RR Christophe Bahuet photo 2.jpeg'
        Kind = 'file'
        EmbeddedPath = ''
        ObjectPosition = '50% 24%'
    },
    [pscustomobject]@{
        Speaker = 'Roderick M. Planta'
        Slug = 'roderick-planta'
        Source = 'Speakers (Keynote and Closing)\ARMP Portrait.jpg'
        Kind = 'file'
        EmbeddedPath = ''
        ObjectPosition = '50% 24%'
    },
    [pscustomobject]@{
        Speaker = 'Diane Gail L. Maharjan'
        Slug = 'diane-maharjan'
        Source = 'Plenary 1\2_Bionote and Picture\Dir DG L Mahajan 4X6-2.jpg'
        Kind = 'file'
        EmbeddedPath = ''
        ObjectPosition = '50% 25%'
    },
    [pscustomobject]@{
        Speaker = 'Joseph J. Capuno'
        Slug = 'joseph-capuno'
        Source = 'Plenary 2\2_Bionote and Picture\Bionote - DEPDev Joseph Capuno.docx'
        Kind = 'docx-media'
        EmbeddedPath = 'word/media/image1.jpeg'
        ObjectPosition = '50% 22%'
    },
    [pscustomobject]@{
        Speaker = 'Vivien Suerte-Cortez'
        Slug = 'vivien-suerte-cortez'
        Source = 'Plenary 2\2_Bionote and Picture\Vivien Suerte photo 2x2.jpg'
        Kind = 'file'
        EmbeddedPath = ''
        ObjectPosition = '50% 28%'
    }
)

function Get-ImageDimensions {
    param([Parameter(Mandatory)][string]$Path)

    $image = [Drawing.Image]::FromFile($Path)
    try {
        return [pscustomobject]@{ Width = $image.Width; Height = $image.Height }
    }
    finally {
        $image.Dispose()
    }
}

function Get-EncodedDimensions {
    param([Parameter(Mandatory)][string]$Path)

    $value = & $ffprobe.Source -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 $Path
    if ($LASTEXITCODE -ne 0 -or $value -notmatch '^(\d+)x(\d+)$') {
        throw "Could not read encoded dimensions: $Path"
    }
    return [pscustomobject]@{ Width = [int]$Matches[1]; Height = [int]$Matches[2] }
}

function Get-SourceImage {
    param([Parameter(Mandatory)]$Asset)

    $sourcePath = Join-Path $SourceRoot $Asset.Source
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Speaker source not found: $sourcePath"
    }

    if ($Asset.Kind -eq 'file') {
        return $sourcePath
    }

    if ($Asset.Kind -ne 'docx-media') {
        throw "Unsupported source kind '$($Asset.Kind)' for $($Asset.Speaker)"
    }

    $extension = [IO.Path]::GetExtension($Asset.EmbeddedPath)
    $extractedPath = Join-Path $scratchDirectory ($Asset.Slug + '-source' + $extension)
    $archive = [IO.Compression.ZipFile]::OpenRead($sourcePath)
    try {
        $entry = $archive.GetEntry($Asset.EmbeddedPath)
        if ($null -eq $entry) {
            throw "Embedded portrait '$($Asset.EmbeddedPath)' not found in $sourcePath"
        }
        $inputStream = $entry.Open()
        $outputStream = [IO.File]::Open($extractedPath, [IO.FileMode]::Create, [IO.FileAccess]::Write)
        try {
            $inputStream.CopyTo($outputStream)
        }
        finally {
            $outputStream.Dispose()
            $inputStream.Dispose()
        }
    }
    finally {
        $archive.Dispose()
    }
    return $extractedPath
}

$manifest = foreach ($asset in $assets) {
    $sourceImage = Get-SourceImage -Asset $asset
    $sourceDimensions = Get-ImageDimensions -Path $sourceImage
    $outputPath = Join-Path $outputDirectory ($asset.Slug + '.webp')
    $quality = 82

    do {
        $arguments = @(
            '-hide_banner', '-loglevel', 'error', '-y',
            '-i', $sourceImage,
            '-frames:v', '1',
            '-vf', "scale=w='min(720,iw)':h='min(900,ih)':force_original_aspect_ratio=decrease",
            '-c:v', 'libwebp', '-quality', [string]$quality, '-compression_level', '6',
            '-map_metadata', '-1', '-an',
            $outputPath
        )
        & $ffmpeg.Source @arguments
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $outputPath -PathType Leaf)) {
            throw "ffmpeg failed while preparing $($asset.Speaker)"
        }
        $outputBytes = (Get-Item -LiteralPath $outputPath).Length
        $quality -= 7
    } while ($outputBytes -gt 153600 -and $quality -ge 68)

    if ($outputBytes -gt 153600) {
        throw "Optimized portrait exceeds 150 KB: $outputPath ($outputBytes bytes)"
    }

    $outputDimensions = Get-EncodedDimensions -Path $outputPath
    if ($outputDimensions.Width -gt $sourceDimensions.Width -or $outputDimensions.Height -gt $sourceDimensions.Height) {
        throw "Portrait was unexpectedly upscaled: $outputPath"
    }

    [pscustomobject]@{
        speaker = $asset.Speaker
        output_file = $asset.Slug + '.webp'
        source_relative_path = $asset.Source
        source_kind = $asset.Kind
        embedded_path = $asset.EmbeddedPath
        source_width_px = $sourceDimensions.Width
        source_height_px = $sourceDimensions.Height
        output_width_px = $outputDimensions.Width
        output_height_px = $outputDimensions.Height
        output_bytes = $outputBytes
        object_position = $asset.ObjectPosition
        verified = 'yes'
    }
}

$manifestPath = Join-Path $outputDirectory 'manifest.csv'
$manifest | Export-Csv -LiteralPath $manifestPath -NoTypeInformation -Encoding utf8
$manifest | Format-Table speaker, output_file, output_width_px, output_height_px, output_bytes -AutoSize

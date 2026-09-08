$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'run-gallery-closeout.mjs') @args
exit $LASTEXITCODE

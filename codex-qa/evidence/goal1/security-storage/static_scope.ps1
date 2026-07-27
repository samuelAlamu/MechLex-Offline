$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../../.."))
$files=@("app.js","core/persistence.js","core/shared-sync.js","core/start-local-server.ps1","core/integrity.js")
$patterns="MECHLEX_MOCK_ROLE|adminRole|superPin|contentPin|function Test-SharedPayload|function Test-Semantic|shared\.data|saveAll = function|api/can-write|Origin|Host"
$rows=foreach($f in $files){Select-String -Path (Join-Path $root $f) -Pattern $patterns|ForEach-Object{[pscustomobject]@{file=$f;line=$_.LineNumber;text=$_.Line.Trim()}}}
$rows|Export-Csv (Join-Path $PSScriptRoot "G1-SEC-static-scope.csv") -NoTypeInformation -Encoding UTF8

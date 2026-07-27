$ErrorActionPreference="Stop"
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../../.."))
$workspace=Join-Path $root "codex-qa/workspaces/normal"
$guard=Join-Path $root "codex-qa/scripts/real-shared-path-guard.ps1"
$share=Join-Path $PSScriptRoot ("disposable-share-"+[guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $share|Out-Null
& $guard -ProjectRoot $root -TestPath $share -OutputPath (Join-Path $PSScriptRoot "guard-runtime.json")|Out-Null
if($LASTEXITCODE-ne 0){throw "guard rejected"}
$port=8912
$env:MECHLEX_MOCK_ROLE="Viewer"
$p=Start-Process powershell.exe -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $PSScriptRoot "helper.stdout.log") -RedirectStandardError (Join-Path $PSScriptRoot "helper.stderr.log") -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File","`"$(Join-Path $workspace 'core/start-local-server.ps1')`"","-Port",$port,"-NoBrowser","-SharedDataPath","`"$share`"")
Remove-Item Env:\MECHLEX_MOCK_ROLE
try{
  for($i=0;$i-lt 50;$i++){try{$t=[Net.Sockets.TcpClient]::new("127.0.0.1",$port);$t.Close();break}catch{Start-Sleep -Milliseconds 100}}
  $state=Join-Path $share "state.json"
  $before=@{exists=Test-Path $state}
  $cw=Invoke-WebRequest "http://127.0.0.1:$port/api/can-write" -UseBasicParsing
  $after=@{exists=Test-Path $state;length=if(Test-Path $state){(Get-Item $state).Length}else{$null};sha256=if(Test-Path $state){(Get-FileHash $state -Algorithm SHA256).Hash}else{$null}}
  function Raw([string]$hostName,[string]$origin,[string]$path="/api/shared-health"){
    $c=[Net.Sockets.TcpClient]::new("127.0.0.1",$port);try{$s=$c.GetStream();$o=if($origin){"Origin: $origin`r`n"}else{""};$q="GET $path HTTP/1.1`r`nHost: $hostName`r`n$o"+"Connection: close`r`n`r`n";$b=[Text.Encoding]::UTF8.GetBytes($q);$s.Write($b,0,$b.Length);$r=[IO.StreamReader]::new($s);$x=$r.ReadToEnd();@{host=$hostName;origin=$origin;path=$path;status=($x-split"`r?`n")[0]}}finally{$c.Close()}}
  $probes=@((Raw "evil.example" ""),(Raw "127.0.0.1:$port" "http://evil.example" "/api/shared-state"),(Raw "evil.example" "http://evil.example" "/api/shared-health"),(Raw "127.0.0.1:$port" "null" "/api/shared-state"))
  $result=@{timestampUtc=[DateTime]::UtcNow.ToString("o");identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name;mockRole="Viewer";before=$before;canWrite=@{status=[int]$cw.StatusCode;body=$cw.Content};after=$after;hostOrigin=$probes;realSharedDataUsed=$false}
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot "G1-SEC-03-04-runtime.json"),($result|ConvertTo-Json -Depth 8),(New-Object Text.UTF8Encoding($false)))
}finally{if(!$p.HasExited){Stop-Process $p.Id -Force};Remove-Item -LiteralPath $share -Recurse -Force}

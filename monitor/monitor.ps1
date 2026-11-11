# Monitor de cameras - Prefeitura de Arraial do Cabo
# Testa cada IP (ping) e atualiza o status no app. Windows PowerShell 5.1 ou superior.
# Uso:  .\monitor.ps1           (monitora e grava no app)
#       .\monitor.ps1 -Teste    (so testa e mostra na tela, nao grava nada)
param([switch]$Teste)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Log($m) { Write-Host ("{0:dd/MM HH:mm:ss}  {1}" -f (Get-Date), $m) }

$cfg = Get-Content (Join-Path $dir 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$intervalo = [int]$cfg.intervaloSegundos; if ($intervalo -lt 15) { $intervalo = 60 }
$limite    = [int]$cfg.falhasParaOffline;  if ($limite -lt 1)     { $limite = 3 }
$timeout   = [int]$cfg.timeoutMs;          if ($timeout -lt 300)  { $timeout = 1500 }
$proj = $cfg.projectId
$base = "https://firestore.googleapis.com/v1/projects/$proj/databases/(default)/documents"

# ---- lista de cameras (numero;ip) ----
$csvPath = Join-Path $dir 'cameras.csv'
$first = (Get-Content $csvPath -TotalCount 1)
$sep = ','; if ($first -match ';') { $sep = ';' }
$cams = @()
foreach ($r in (Import-Csv $csvPath -Delimiter $sep)) {
  $n = 0; $ip = ($r.ip + '').Trim()
  if ([int]::TryParse(($r.numero + '').Trim(), [ref]$n) -and $n -gt 0 -and $ip -ne '') { $cams += [pscustomobject]@{ Id = $n; Ip = $ip } }
}
if ($cams.Count -eq 0) { throw 'cameras.csv vazio ou fora do formato (colunas: numero,ip).' }
Log ("{0} cameras na lista." -f $cams.Count)

function PingAll {
  $pings = @(); $tasks = @()
  foreach ($c in $cams) { $p = New-Object System.Net.NetworkInformation.Ping; $pings += $p; $tasks += $p.SendPingAsync($c.Ip, $timeout) }
  try { [void][Threading.Tasks.Task]::WaitAll($tasks, ($timeout * 3 + 5000)) } catch {}
  $res = @{}
  for ($i = 0; $i -lt $cams.Count; $i++) {
    $ok = $false
    try { if ($tasks[$i].Status -eq 'RanToCompletion' -and $tasks[$i].Result.Status -eq 'Success') { $ok = $true } } catch {}
    $res[$cams[$i].Id] = $ok
    $pings[$i].Dispose()
  }
  return $res
}

if ($Teste) {
  $res = PingAll
  $off = @($cams | Where-Object { -not $res[$_.Id] })
  Log ("Respondem: {0}   Nao respondem: {1}" -f ($cams.Count - $off.Count), $off.Count)
  foreach ($c in $off) { Log ("  SEM RESPOSTA  camera {0:000}  {1}" -f $c.Id, $c.Ip) }
  return
}

# ---- login no app ----
$script:token = $null; $script:tokenAt = [datetime]::MinValue
function Login {
  $body = @{ email = $cfg.email; password = $cfg.senha; returnSecureToken = $true } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -ContentType 'application/json' -Body $body -Uri ("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + $cfg.apiKey)
  $script:token = $r.idToken; $script:tokenAt = Get-Date
}
function Hdr { if (((Get-Date) - $script:tokenAt).TotalMinutes -gt 40) { Login }; return @{ Authorization = "Bearer $($script:token)" } }

function Iso { return (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") }

function SetStatus($id, $on) {
  $uri = "$base/cameras/$id" + "?updateMask.fieldPaths=on&updateMask.fieldPaths=at&updateMask.fieldPaths=by"
  $body = @{ fields = @{ on = @{ booleanValue = $on }; at = @{ timestampValue = (Iso) }; by = @{ stringValue = 'monitor automatico' } } } | ConvertTo-Json -Depth 6
  [void](Invoke-RestMethod -Method Patch -Headers (Hdr) -ContentType 'application/json' -Body $body -Uri $uri)
}
function Heartbeat($total, $off) {
  $uri = "$base/config/monitor" + "?updateMask.fieldPaths=t&updateMask.fieldPaths=total&updateMask.fieldPaths=off"
  $body = @{ fields = @{ t = @{ timestampValue = (Iso) }; total = @{ integerValue = "$total" }; off = @{ integerValue = "$off" } } } | ConvertTo-Json -Depth 6
  [void](Invoke-RestMethod -Method Patch -Headers (Hdr) -ContentType 'application/json' -Body $body -Uri $uri)
}
function LoadState {
  $st = @{}; $tok = $null
  do {
    $uri = "$base/cameras?pageSize=300"; if ($tok) { $uri += "&pageToken=$tok" }
    $r = Invoke-RestMethod -Method Get -Headers (Hdr) -Uri $uri
    foreach ($d in $r.documents) {
      $id = [int]($d.name.Split('/')[-1]); $v = $true
      if ($d.fields.on -and $d.fields.on.PSObject.Properties.Name -contains 'booleanValue') { $v = [bool]$d.fields.on.booleanValue }
      $st[$id] = $v
    }
    $tok = $r.nextPageToken
  } while ($tok)
  return $st
}

Login
Log "Login feito. Monitorando (Ctrl+C para parar)."
$state = LoadState
$fails = @{}
foreach ($c in $cams) { $fails[$c.Id] = 0 }

while ($true) {
  try {
    $res = PingAll
    $offTotal = 0
    foreach ($c in $cams) {
      $id = $c.Id
      if ($res[$id]) { $fails[$id] = 0; $want = $true }
      else { $fails[$id] = $fails[$id] + 1; if ($fails[$id] -ge $limite) { $want = $false } else { $want = $null } }
      if ($want -eq $null) { if ($state.ContainsKey($id)) { if (-not $state[$id]) { $offTotal++ } }; continue }
      if (-not $want) { $offTotal++ }
      $cur = $true; if ($state.ContainsKey($id)) { $cur = $state[$id] }
      if ($want -ne $cur -or -not $state.ContainsKey($id)) {
        SetStatus $id $want
        $state[$id] = $want
        if ($want) { Log ("camera {0:000} VOLTOU ({1})" -f $id, $c.Ip) } else { Log ("camera {0:000} CAIU ({1})" -f $id, $c.Ip) }
      }
    }
    Heartbeat $cams.Count $offTotal
  } catch {
    Log ("Erro: " + $_.Exception.Message + " - tentando de novo no proximo ciclo.")
    try { Login } catch {}
  }
  Start-Sleep -Seconds $intervalo
}

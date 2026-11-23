# Monitor de cameras - Prefeitura de Arraial do Cabo        (versao 2)
# Testa cada IP (ping) e atualiza o status no app. Windows PowerShell 5.1 ou superior.
#   .\monitor.ps1           monitora de verdade e grava no app
#   .\monitor.ps1 -Teste    so testa e mostra na tela (NAO grava nada no app)
param([switch]$Teste)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $dir 'monitor.log'

function Log($m, $cor = 'Gray') {
  $l = ("{0:dd/MM HH:mm:ss}  {1}" -f (Get-Date), $m)
  Write-Host $l -ForegroundColor $cor
  try { Add-Content -Path $logFile -Value $l -Encoding UTF8 } catch {}
}
function Fail($m) {
  Write-Host ''
  Write-Host ('PROBLEMA: ' + $m) -ForegroundColor Red
  Write-Host ''
  exit 1
}
function ErrCode($e) { try { return [int]$e.Exception.Response.StatusCode.value__ } catch { return 0 } }

# ---------- configuracao ----------
$cfgPath = Join-Path $dir 'config.json'
$cfg = $null
if (Test-Path $cfgPath) {
  try { $cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch { Fail 'O arquivo config.json esta com erro (falta uma aspas ou virgula?). De dois cliques em configurar.bat para refazer.' }
} elseif (-not $Teste) {
  Fail 'Nao achei o arquivo config.json. De dois cliques em configurar.bat para criar.'
}
$intervalo = 60; $limite = 3; $timeout = 1500
if ($cfg) {
  if ($cfg.intervaloSegundos) { $intervalo = [int]$cfg.intervaloSegundos }
  if ($cfg.falhasParaOffline) { $limite = [int]$cfg.falhasParaOffline }
  if ($cfg.timeoutMs)         { $timeout = [int]$cfg.timeoutMs }
}
if ($intervalo -lt 15)  { $intervalo = 60 }
if ($limite -lt 1)      { $limite = 3 }
if ($timeout -lt 300)   { $timeout = 1500 }

# ---------- lista de cameras ----------
$csvPath = Join-Path $dir 'cameras.csv'
if (-not (Test-Path $csvPath)) { Fail 'Nao achei o arquivo cameras.csv. Copie o cameras.exemplo.csv para cameras.csv e coloque as cameras (numero e IP).' }
$first = (Get-Content $csvPath -TotalCount 1)
$sep = ','; if ($first -match ';') { $sep = ';' }
$f0 = (($first -split $sep)[0]).Trim().Trim([char]0xFEFF)
if ($f0 -match '^\d+$') { $rows = Import-Csv $csvPath -Delimiter $sep -Header 'numero', 'ip' } else { $rows = Import-Csv $csvPath -Delimiter $sep }
$cams = @(); $vistos = @{}; $ignoradas = 0; $linha = 1
foreach ($r in $rows) {
  $linha++
  $nomes = @($r.PSObject.Properties.Name)
  if ($nomes.Count -lt 2) { $ignoradas++; continue }
  $n = 0; $ip = (($r.($nomes[1])) + '').Trim()
  $ok = [int]::TryParse((($r.($nomes[0])) + '').Trim(), [ref]$n)
  if (-not $ok -or $n -le 0 -or $ip -eq '') { $ignoradas++; Log ("Linha {0} do cameras.csv ignorada (precisa de numero e IP)." -f $linha) 'Yellow'; continue }
  if ($vistos.ContainsKey($n)) { Log ("Camera {0:000} aparece mais de uma vez no cameras.csv; usando so a primeira." -f $n) 'Yellow'; continue }
  $vistos[$n] = $true
  $cams += [pscustomobject]@{ Id = $n; Ip = $ip }
}
if ($cams.Count -eq 0) { Fail 'O cameras.csv esta vazio ou fora do formato. Precisa ter a linha "numero,ip" e depois uma camera por linha, como 1,10.0.0.11' }
Log ("{0} cameras na lista{1}." -f $cams.Count, $(if ($ignoradas) { " ($ignoradas linhas ignoradas)" } else { '' }))

# ---------- ping ----------
function PingList($lista) {
  $pings = @(); $tasks = @()
  foreach ($c in $lista) { $p = New-Object System.Net.NetworkInformation.Ping; $pings += $p; $tasks += $p.SendPingAsync($c.Ip, $timeout) }
  try { [void][Threading.Tasks.Task]::WaitAll($tasks, ($timeout * 3 + 5000)) } catch {}
  $res = @{}
  for ($i = 0; $i -lt $lista.Count; $i++) {
    $ok = $false; $ms = 0
    try { if ($tasks[$i].Status -eq 'RanToCompletion' -and $tasks[$i].Result.Status -eq 'Success') { $ok = $true; $ms = [int]$tasks[$i].Result.RoundtripTime } } catch {}
    $res[$lista[$i].Id] = [pscustomobject]@{ Ok = $ok; Ms = $ms }
    $pings[$i].Dispose()
  }
  return $res
}

# ---------- modo teste ----------
if ($Teste) {
  Write-Host ''
  Write-Host 'TESTE DE PING (nao grava nada no app)' -ForegroundColor Cyan
  Write-Host ''
  $res = PingList $cams
  $falhas = @($cams | Where-Object { -not $res[$_.Id].Ok })
  if ($falhas.Count -gt 0) {
    Start-Sleep -Seconds 1
    $res2 = PingList $falhas
    foreach ($c in $falhas) { if ($res2[$c.Id].Ok) { $res[$c.Id] = $res2[$c.Id] } }
  }
  $linhas = @()
  foreach ($c in $cams) {
    $x = $res[$c.Id]
    if ($x.Ok) { $t = "{0:000}  {1,-16}  RESPONDE ({2} ms)" -f $c.Id, $c.Ip, $x.Ms; Write-Host $t -ForegroundColor Green }
    else       { $t = "{0:000}  {1,-16}  SEM RESPOSTA" -f $c.Id, $c.Ip; Write-Host $t -ForegroundColor Red }
    $linhas += $t
  }
  $off = @($cams | Where-Object { -not $res[$_.Id].Ok })
  Write-Host ''
  $resumo = "RESUMO: {0} responderam, {1} sem resposta, de {2} cameras." -f ($cams.Count - $off.Count), $off.Count, $cams.Count
  Write-Host $resumo -ForegroundColor Cyan
  try { (@("Teste em {0:dd/MM/yyyy HH:mm}" -f (Get-Date), '') + $linhas + @('', $resumo)) | Set-Content -Path (Join-Path $dir 'resultado-teste.txt') -Encoding UTF8; Write-Host 'Resultado salvo em resultado-teste.txt' -ForegroundColor Gray } catch {}
  Write-Host ''
  return
}

# ---------- login e gravacao no app ----------
if ($cfg.email -like 'COLOQUE*' -or $cfg.senha -like 'COLOQUE*' -or -not $cfg.email -or -not $cfg.senha) { Fail 'O config.json ainda esta com o texto de exemplo. De dois cliques em configurar.bat e informe o e-mail e a senha do login do programa.' }
$proj = $cfg.projectId
$base = "https://firestore.googleapis.com/v1/projects/$proj/databases/(default)/documents"
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

Log 'Entrando no app...'
try { Login } catch {
  $c = ErrCode $_
  if ($c -eq 400) { Fail 'E-mail ou senha incorretos, ou o usuario nao existe no Firebase (Authentication > Usuarios). Confira com configurar.bat.' }
  Fail ('Nao consegui entrar no app. Confira a internet. Detalhe: ' + $_.Exception.Message)
}
Log 'Login feito.' 'Green'
try { $state = LoadState; Heartbeat $cams.Count 0 } catch {
  $c = ErrCode $_
  if ($c -eq 403) { Fail 'O login entrou, mas NAO tem permissao para gravar. Falta liberar esse e-mail nas regras do Firestore (me avise o e-mail para eu incluir).' }
  Fail ('Nao consegui falar com o banco de dados. Detalhe: ' + $_.Exception.Message)
}
Log ("Monitorando {0} cameras a cada {1} s. Deixe esta janela aberta (Ctrl+C para parar)." -f $cams.Count, $intervalo) 'Green'

$fails = @{}
foreach ($c in $cams) { $fails[$c.Id] = 0 }
$semCamera = @()
foreach ($c in $cams) { if (-not $state.ContainsKey($c.Id)) { $semCamera += $c.Id } }
if ($semCamera.Count -gt 0) { Log ("Aviso: {0} camera(s) da lista nao existem no app e serao criadas ao mudar de status: {1}" -f $semCamera.Count, (($semCamera | Select-Object -First 10 | ForEach-Object { '{0:000}' -f $_ }) -join ', ')) 'Yellow' }

while ($true) {
  try {
    $res = PingList $cams
    $offTotal = 0; $mudou = 0
    foreach ($c in $cams) {
      $id = $c.Id
      $want = $null
      if ($res[$id].Ok) { $fails[$id] = 0; $want = $true }
      else { $fails[$id] = $fails[$id] + 1; if ($fails[$id] -ge $limite) { $want = $false } }
      if ($null -eq $want) { if ($state.ContainsKey($id) -and -not $state[$id]) { $offTotal++ }; continue }
      if (-not $want) { $offTotal++ }
      $cur = $true; if ($state.ContainsKey($id)) { $cur = $state[$id] }
      if (($want -ne $cur) -or (-not $state.ContainsKey($id))) {
        SetStatus $id $want
        $state[$id] = $want; $mudou++
        if ($want) { Log ("camera {0:000} VOLTOU   ({1})" -f $id, $c.Ip) 'Green' } else { Log ("camera {0:000} CAIU     ({1})" -f $id, $c.Ip) 'Red' }
      }
    }
    Heartbeat $cams.Count $offTotal
  } catch {
    Log ("Erro: " + $_.Exception.Message + "  - tentando de novo no proximo ciclo.") 'Yellow'
    try { Login } catch {}
  }
  Start-Sleep -Seconds $intervalo
}

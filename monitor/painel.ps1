# Painel do robo de cameras - Prefeitura de Arraial do Cabo
# Abre um painel no navegador (so neste computador) para ligar/parar o robo, ver as cameras e editar IPs.
# Nao muda o monitor.ps1. O robo continua sendo o monitor.ps1; o painel so liga, desliga e mostra.
param([int]$Porta = 8080, [switch]$AutoLigar)
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$csvPath = Join-Path $dir 'cameras.csv'
$logPath = Join-Path $dir 'monitor.log'
$htmlPath = Join-Path $dir 'painel.html'
$timeout = 1500
try { $cfg = Get-Content (Join-Path $dir 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json; if ($cfg.timeoutMs -and [int]$cfg.timeoutMs -ge 300) { $timeout = [int]$cfg.timeoutMs } } catch {}

$script:rows = @(); $script:csvTime = [datetime]::MinValue; $script:sep = ';'
$script:colN = $null; $script:colI = $null; $script:colC = $null; $script:colNm = $null
$script:res = @{}; $script:pingAt = [datetime]::MinValue; $script:csvErro = ''
$script:backupFeito = $false
$script:procs = @(); $script:procsAt = [datetime]::MinValue

function LerCsv {
  if (-not (Test-Path $csvPath)) { $script:rows = @(); $script:csvErro = 'Nao achei o cameras.csv nesta pasta.'; return }
  $t = (Get-Item $csvPath).LastWriteTime
  if ($t -eq $script:csvTime -and $script:rows.Count -gt 0) { return }
  try {
    $first = (Get-Content $csvPath -TotalCount 1)
    $script:sep = ','; if ($first -match ';') { $script:sep = ';' }
    $f0 = (($first -split $script:sep)[0]).Trim().Trim([char]0xFEFF).Trim('"')
    if ($f0 -match '^\d+$') { $r = @(Import-Csv $csvPath -Delimiter $script:sep -Header 'numero', 'ip') } else { $r = @(Import-Csv $csvPath -Delimiter $script:sep) }
    $script:colN = $null; $script:colI = $null; $script:colC = $null; $script:colNm = $null
    if ($r.Count -gt 0) {
      $nomes = @($r[0].PSObject.Properties.Name)
      foreach ($h in $nomes) {
        $hh = ($h + '').Trim().Trim([char]0xFEFF).ToLower()
        if ($hh -eq 'numero') { $script:colN = $h } elseif ($hh -eq 'ip') { $script:colI = $h } elseif ($hh -eq 'codigo') { $script:colC = $h } elseif ($hh -eq 'nome') { $script:colNm = $h }
      }
      if ((-not $script:colN) -or (-not $script:colI)) { if ($nomes.Count -ge 2) { $script:colN = $nomes[0]; $script:colI = $nomes[1] } }
    }
    $script:rows = $r; $script:csvTime = $t; $script:csvErro = ''
    $script:pingAt = [datetime]::MinValue
  } catch { $script:csvErro = 'Nao consegui ler o cameras.csv: ' + $_.Exception.Message }
}

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

function Pingar($forcar) {
  if (-not $forcar -and ((Get-Date) - $script:pingAt).TotalSeconds -lt 12) { return }
  $lista = @()
  foreach ($r in $script:rows) {
    $n = 0; $ip = (($r.($script:colI)) + '').Trim()
    if ([int]::TryParse((($r.($script:colN)) + '').Trim(), [ref]$n) -and $n -gt 0 -and $ip -ne '') { $lista += [pscustomobject]@{ Id = $n; Ip = $ip } }
  }
  $res = @{}
  if ($lista.Count -gt 0) {
    try {
      $res = PingList $lista
      $falhas = @($lista | Where-Object { -not $res[$_.Id].Ok })
      if ($falhas.Count -gt 0) { $r2 = PingList $falhas; foreach ($c in $falhas) { if ($r2[$c.Id].Ok) { $res[$c.Id] = $r2[$c.Id] } } }
    } catch {}
  }
  $script:res = $res; $script:pingAt = Get-Date
}

function RoboProcs {
  try {
    return @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction Stop | Where-Object { $_.CommandLine -and ($_.CommandLine -like '*monitor.ps1*') -and ($_.CommandLine -notlike '*-Teste*') })
  } catch { return @() }
}
function AtualizarProcs { $script:procs = @(RoboProcs); $script:procsAt = Get-Date }
function PararRobo {
  foreach ($p in (RoboProcs)) { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch {} }
  Start-Sleep -Milliseconds 800
  AtualizarProcs
}
function LigarRobo {
  if ((RoboProcs).Count -gt 0) { AtualizarProcs; return @{ ok = $true; msg = 'O robo ja estava ligado.' } }
  $args2 = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $dir 'monitor.ps1') + '"'
  Start-Process -FilePath 'powershell.exe' -ArgumentList $args2 -WindowStyle Hidden -WorkingDirectory $dir | Out-Null
  Start-Sleep -Seconds 5
  AtualizarProcs
  if ($script:procs.Count -gt 0) { return @{ ok = $true; msg = 'Robo ligado.' } }
  return @{ ok = $false; msg = 'O robo fechou logo ao iniciar. De dois cliques em iniciar-monitor.bat para ver o motivo na tela (login, config.json ou cameras.csv).' }
}

function Estado {
  LerCsv
  $cams = @(); $sem = 0; $resp = 0; $nao = 0
  foreach ($r in $script:rows) {
    $n = 0; $ip = (($r.($script:colI)) + '').Trim()
    if (-not [int]::TryParse((($r.($script:colN)) + '').Trim(), [ref]$n)) { continue }
    $cod = ''; if ($script:colC) { $cod = (($r.($script:colC)) + '').Trim() }
    $nome = ''; if ($script:colNm) { $nome = (($r.($script:colNm)) + '').Trim() }
    $ok = $null; $ms = 0
    if ($ip -eq '') { $sem++ }
    elseif ($script:res.ContainsKey($n)) { $ok = [bool]$script:res[$n].Ok; $ms = [int]$script:res[$n].Ms; if ($ok) { $resp++ } else { $nao++ } }
    $cams += [pscustomobject]@{ numero = $n; codigo = $cod; nome = $nome; ip = $ip; ok = $ok; ms = $ms }
  }
  $seg = ((Get-Date) - $script:pingAt).TotalSeconds; if ($seg -gt 99999) { $seg = 99999 }; $seg = [int]$seg
  $pr = @($script:procs)
  $min = 0; $pid2 = 0
  if ($pr.Count -gt 0) { $pid2 = [int]$pr[0].ProcessId; try { $min = [int]((Get-Date) - $pr[0].CreationDate).TotalMinutes } catch {} }
  $log = @(); try { if (Test-Path $logPath) { $log = @(Get-Content $logPath -Tail 120 -Encoding UTF8 | ForEach-Object { [string]('' + $_) }) } } catch {}
  return @{
    robo = @{ ligado = ($pr.Count -gt 0); pid = $pid2; minutos = $min }
    resumo = @{ total = $cams.Count; respondendo = $resp; semResposta = $nao; semIp = $sem; testadoHa = $seg }
    csvErro = $script:csvErro
    cameras = $cams
    log = $log
  }
}

function SalvarIp($numero, $ip) {
  $ip = ($ip + '').Trim()
  if ($ip -ne '' -and $ip -notmatch '^(\d{1,3}\.){3}\d{1,3}$') { return @{ ok = $false; msg = 'IP invalido. Use o formato 192.168.0.45 ou deixe em branco.' } }
  LerCsv
  $achou = $false
  foreach ($r in $script:rows) {
    $n = 0
    if ([int]::TryParse((($r.($script:colN)) + '').Trim(), [ref]$n) -and $n -eq [int]$numero) { $r.($script:colI) = $ip; $achou = $true; break }
  }
  if (-not $achou) { return @{ ok = $false; msg = 'Camera nao encontrada no cameras.csv.' } }
  try {
    if (-not $script:backupFeito) { Copy-Item $csvPath ($csvPath + '.bak') -Force; $script:backupFeito = $true }
    ($script:rows | ConvertTo-Csv -Delimiter $script:sep -NoTypeInformation) | Set-Content -Path $csvPath -Encoding UTF8
    $script:csvTime = (Get-Item $csvPath).LastWriteTime
    $script:pingAt = [datetime]::MinValue
  } catch { return @{ ok = $false; msg = 'Nao consegui salvar o cameras.csv. Ele esta aberto no Excel? Feche e tente de novo. (' + $_.Exception.Message + ')' } }
  return @{ ok = $true; msg = 'IP salvo. Reinicie o robo para ele passar a usar o IP novo.' }
}

function Send($ctx, $code, $ctype, [byte[]]$bytes) {
  $r = $ctx.Response; $r.StatusCode = $code; $r.ContentType = $ctype; $r.ContentLength64 = $bytes.Length
  $r.Headers.Add('Cache-Control', 'no-store')
  $r.OutputStream.Write($bytes, 0, $bytes.Length); $r.OutputStream.Close()
}
function SendJson($ctx, $obj, $code = 200) {
  $j = ConvertTo-Json -InputObject $obj -Depth 8 -Compress
  Send $ctx $code 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($j))
}

if (-not (Test-Path $htmlPath)) { Write-Host 'PROBLEMA: nao achei o painel.html nesta pasta.' -ForegroundColor Red; exit 1 }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Porta/")
try { $listener.Start() } catch {
  Write-Host ("PROBLEMA: nao consegui abrir o painel na porta {0}. Talvez ele ja esteja aberto em outra janela. Feche e tente de novo." -f $Porta) -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor DarkGray; exit 1
}
Write-Host ''
Write-Host ("Painel do robo aberto em  http://localhost:{0}/" -f $Porta) -ForegroundColor Green
Write-Host 'Deixe esta janela aberta enquanto usa o painel (fechar so fecha o painel; o robo continua).' -ForegroundColor Gray
Write-Host 'Para fechar o painel: Ctrl+C ou feche a janela.' -ForegroundColor Gray
Write-Host ''
Write-Host 'Preparando (lendo a lista e testando as cameras)...' -ForegroundColor Gray
try { LerCsv; AtualizarProcs; Pingar $true } catch {}
Write-Host 'Pronto. Abrindo o painel no navegador.' -ForegroundColor Green
if ($AutoLigar) { try { if ($script:procs.Count -eq 0) { $rr = LigarRobo; Write-Host $rr.msg -ForegroundColor Cyan } } catch {} }
try { Start-Process ("http://localhost:{0}/" -f $Porta) } catch {}

$async = $listener.BeginGetContext($null, $null)
while ($true) {
  if (-not $async.AsyncWaitHandle.WaitOne(500)) {
    # ocioso: atualiza em segundo plano (assim a tela responde na hora)
    try { LerCsv; if (((Get-Date) - $script:procsAt).TotalSeconds -gt 4) { AtualizarProcs }; Pingar $false } catch {}
    continue
  }
  $ctx = $listener.EndGetContext($async)
  $async = $listener.BeginGetContext($null, $null)
  try {
    $req = $ctx.Request; $path = $req.Url.AbsolutePath; $metodo = $req.HttpMethod
    if ($metodo -eq 'GET' -and ($path -eq '/' -or $path -eq '/index.html')) {
      Send $ctx 200 'text/html; charset=utf-8' ([IO.File]::ReadAllBytes($htmlPath))
    } elseif ($metodo -eq 'GET' -and $path -eq '/api/estado') {
      SendJson $ctx (Estado)
    } elseif ($metodo -eq 'POST' -and $path.StartsWith('/api/')) {
      if ($req.Headers['X-Painel'] -ne '1') { SendJson $ctx @{ ok = $false; msg = 'Pedido recusado.' } 403 }
      else {
        $corpo = ''; try { $sr = New-Object IO.StreamReader($req.InputStream, [Text.Encoding]::UTF8); $corpo = $sr.ReadToEnd() } catch {}
        $d = $null; if ($corpo) { try { $d = $corpo | ConvertFrom-Json } catch {} }
        if ($path -eq '/api/robo' -and $d) {
          if ($d.acao -eq 'parar') { PararRobo; SendJson $ctx @{ ok = $true; msg = 'Robo parado.' } }
          elseif ($d.acao -eq 'ligar') { SendJson $ctx (LigarRobo) }
          elseif ($d.acao -eq 'reiniciar') { PararRobo; SendJson $ctx (LigarRobo) }
          else { SendJson $ctx @{ ok = $false; msg = 'Acao desconhecida.' } 400 }
        } elseif ($path -eq '/api/ip' -and $d) { SendJson $ctx (SalvarIp $d.numero $d.ip) }
        elseif ($path -eq '/api/testar') { Pingar $true; SendJson $ctx @{ ok = $true; msg = 'Testado.' } }
        else { SendJson $ctx @{ ok = $false; msg = 'Pedido invalido.' } 400 }
      }
    } else { Send $ctx 404 'text/plain; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('Nao encontrado')) }
  } catch {
    Write-Host ('ERRO no painel: ' + $_.Exception.Message) -ForegroundColor Red
    try { SendJson $ctx @{ ok = $false; msg = ('Erro: ' + $_.Exception.Message) } 500 } catch {}
  }
}

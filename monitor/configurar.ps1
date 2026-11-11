# Cria o config.json perguntando o e-mail e a senha do login do programa.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ex = Join-Path $dir 'config.exemplo.json'
$out = Join-Path $dir 'config.json'
if (-not (Test-Path $ex)) { Write-Host 'Nao achei o config.exemplo.json nesta pasta.' -ForegroundColor Red; exit 1 }
$cfg = Get-Content $ex -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host ''
Write-Host 'CONFIGURACAO DO MONITOR' -ForegroundColor Cyan
Write-Host 'Use o e-mail e a senha do login criado SO PARA O PROGRAMA (Firebase > Authentication > Usuarios).'
Write-Host ''
$email = (Read-Host 'E-mail do login do programa').Trim()
$sec = Read-Host 'Senha (nao aparece enquanto voce digita)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$senha = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
if ($email -eq '' -or $senha -eq '') { Write-Host 'E-mail e senha nao podem ficar vazios. Rode de novo.' -ForegroundColor Red; exit 1 }
$cfg.email = $email
$cfg.senha = $senha
($cfg | ConvertTo-Json) | Set-Content -Path $out -Encoding UTF8
Write-Host ''
Write-Host 'Pronto! config.json criado. Agora de dois cliques em iniciar-monitor.bat' -ForegroundColor Green
Write-Host ''

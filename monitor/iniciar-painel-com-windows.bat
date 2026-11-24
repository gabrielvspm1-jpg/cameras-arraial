@echo off
title Abrir o painel e ligar o robo junto com o Windows
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\Painel do robo de cameras.lnk');$s.TargetPath='%~dp0abrir-painel-auto.bat';$s.WorkingDirectory='%~dp0';$s.WindowStyle=7;$s.Save()"
echo.
echo Pronto. Quando o Windows ligar, o painel abre sozinho (janela minimizada), liga o robo e abre a pagina no navegador.
echo Confira se a VPN conecta sozinha ao ligar o PC, senao o robo marca as cameras como fora do ar.
echo Se voce tinha usado o iniciar-automatico-com-windows.bat antes, apague aquele atalho para nao ligar o robo duas vezes:
echo   aperte Win+R, digite shell:startup e apague o atalho "Monitor de cameras".
echo Para desfazer este: apague o atalho "Painel do robo de cameras" na mesma pasta.
echo.
pause

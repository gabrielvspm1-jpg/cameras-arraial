@echo off
title Iniciar o monitor junto com o Windows
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\Monitor de cameras.lnk');$s.TargetPath='%~dp0iniciar-monitor.bat';$s.WorkingDirectory='%~dp0';$s.WindowStyle=7;$s.Save()"
echo.
echo Pronto. O monitor vai abrir sozinho (minimizado) quando o Windows ligar.
echo Para desfazer: aperte Win+R, digite shell:startup e apague o atalho "Monitor de cameras".
echo.
pause

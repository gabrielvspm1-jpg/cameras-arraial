@echo off
title Teste de ping das cameras
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor.ps1" -Teste
pause

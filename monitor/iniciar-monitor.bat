@echo off
title Monitor de cameras
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor.ps1"
pause

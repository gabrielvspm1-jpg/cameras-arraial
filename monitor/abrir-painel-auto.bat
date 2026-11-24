@echo off
title Painel do robo de cameras
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0painel.ps1" -AutoLigar

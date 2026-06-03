@echo off
REM ─── Generar Keystore para TurnosApp (Windows) ───
REM Ejecutar: scripts\generate-keystore.bat
REM Requisito: Java JDK 17+ instalado (keytool.exe)

set KEYSTORE_FILE=turnos-keystore.jks
set KEY_ALIAS=turnosapp
set VALIDITY=36500

echo ======================================
echo   ^^^¡ Generar Keystore - TurnosApp
echo ======================================
echo.

REM Verificar que keytool existe
where keytool >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [31mERROR: keytool no encontrado. Instala Java JDK 17+[0m
    pause
    exit /b 1
)

REM Solicitar contraseñas
set /p "KEYSTORE_PASSWORD=^^^¡ Contrasena del keystore: "
set /p "KEY_PASSWORD=^^^¡ Contrasena de la key: "

REM Datos del propietario
echo.
echo Datos del propietario (dejar vacio = omitir):
set /p "NAME=   Nombre y Apellido: "
set /p "OU=   Unidad Organizacional: "
set /p "ORG=   Organizacion: "
set /p "CITY=   Ciudad: "
set /p "STATE=   Provincia: "
set /p "COUNTRY=   Pais (CL): "
if "%COUNTRY%"=="" set COUNTRY=CL

if "%NAME%"=="" set NAME=TurnosApp
if "%OU%"=="" set OU=Development
if "%ORG%"=="" set ORG=Personal
if "%CITY%"=="" set CITY=Santiago
if "%STATE%"=="" set STATE=RM

echo.
echo Generando keystore...
keytool -genkey -v ^
    -keystore "%KEYSTORE_FILE%" ^
    -alias "%KEY_ALIAS%" ^
    -keyalg RSA ^
    -keysize 2048 ^
    -validity %VALIDITY% ^
    -storepass "%KEYSTORE_PASSWORD%" ^
    -keypass "%KEY_PASSWORD%" ^
    -dname "CN=%NAME%, OU=%OU%, O=%ORG%, L=%CITY%, ST=%STATE%, C=%COUNTRY%"

echo.
echo ======================================
echo   Keystore generado: %KEYSTORE_FILE%
echo ======================================
echo.
echo GUARDA ESTOS DATOS EN UN LUGAR SEGURO:
echo   Alias:        %KEY_ALIAS%
echo   Keystore:     %KEYSTORE_FILE%
echo.
echo Para subir a GitHub Secrets:
echo   1. Codificar en base64:
echo      certutil -encode %KEYSTORE_FILE% keystore_base64.txt
echo      type keystore_base64.txt
echo.
echo   2. Crear Secrets en GitHub:
echo      - ANDROID_KEYSTORE_BASE64 = contenido del txt
echo      - KEYSTORE_PASSWORD       = (la que ingresaste)
echo      - KEY_ALIAS               = %KEY_ALIAS%
echo      - KEY_PASSWORD            = (la que ingresaste)
echo.
echo NUNCA subas el archivo .jks al repositorio
pause

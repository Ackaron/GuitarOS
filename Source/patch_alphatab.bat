@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo =======================================================
echo GuitarOS AlphaTab Patcher (v1.3.1)
echo =======================================================
echo.

:: 1. Проверяем наличие установленного NodeJS
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] NodeJS не найден!
    echo Для работы патчера необходим NodeJS.
    echo Пожалуйста, скачайте его с https://nodejs.org/ и установите.
    echo.
    pause
    exit /b 1
)

:: 2. Находим папку GuitarOS по умолчанию, если не передан аргумент
set "APP_DIR=%LocalAppData%\Programs\GuitarOS\resources"
if not "%~1"=="" set "APP_DIR=%~1\resources"

if not exist "%APP_DIR%\app.asar" (
    echo [ОШИБКА] Не найден файл app.asar в директории:
    echo %APP_DIR%
    echo Убедитесь, что GuitarOS установлен. Если он установлен в другом месте,
    echo запустите скрипт так: patch_alphatab.bat "D:\Path\To\GuitarOS"
    echo.
    pause
    exit /b 1
)

echo [1/4] Папка приложения найдена: %APP_DIR%
cd /d "%APP_DIR%"

:: 3. Подготовка директорий
if exist "app.asar.backup" (
    echo [INFO] Бэкап app.asar уже существует.
) else (
    echo [2/4] Создаем резервную копию app.asar...
    copy "app.asar" "app.asar.backup" >nul
)

if exist "app_extracted" (
    echo [INFO] Удаляем старую папку app_extracted...
    rmdir /s /q "app_extracted"
)

:: 4. Распаковка app.asar (используем npx asar)
echo [3/4] Распаковываем app.asar (это может занять минутку)...
call npx asar extract app.asar app_extracted
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось распаковать app.asar!
    pause
    exit /b 1
)

:: 5. Патчинг файлов .next/static/chunks/app/page-*.js
echo [4/4] Применяем патч к JS файлам...

:: Создаем временный JS скрипт для парсинга и замены
set "PATCHER_JS=%TEMP%\guitaros_patcher.js"
> "%PATCHER_JS%" echo const fs = require('fs'^);
>>"%PATCHER_JS%" echo const path = require('path'^);
>>"%PATCHER_JS%" echo const appDir = process.argv[2];
>>"%PATCHER_JS%" echo const chunksDir = path.join(appDir, '.next', 'static', 'chunks', 'app'^);
>>"%PATCHER_JS%" echo if (!fs.existsSync(chunksDir^)^) { console.error('Chunks dir not found'^); process.exit(1^); }
>>"%PATCHER_JS%" echo const files = fs.readdirSync(chunksDir^).filter(f =^> f.startsWith('page-'^) ^&^& f.endsWith('.js'^)^);
>>"%PATCHER_JS%" echo let patched = 0;
>>"%PATCHER_JS%" echo for (const file of files^) {
>>"%PATCHER_JS%" echo   const filePath = path.join(chunksDir, file^);
>>"%PATCHER_JS%" echo   let content = fs.readFileSync(filePath, 'utf8'^);
>>"%PATCHER_JS%" echo   const original = content;
>>"%PATCHER_JS%" echo   content = content.replace(/scriptFile:\"\$\{([a-zA-Z0-9_]+)\}alphaTab\.mjs\"/g, 'scriptFile:`${$1}alphaTab.min.js`'^);
>>"%PATCHER_JS%" echo   content = content.replace(/if\(typeof window==="undefined"\)return"\.\/alphatab\/";const ([a-zA-Z0-9_]+)=window\.location\.href;const ([a-zA-Z0-9_]+)=\1\.substring\(0,\1\.lastIndexOf\("\/"\)\+1\);return \2\+"alphatab\/"/g, 'if(typeof window==="undefined")return"./alphatab/";const $1=window.location.href;if(window.location.protocol==="file:"){const asarIdx=$1.indexOf("app.asar");if(asarIdx>0){return $1.substring(0,asarIdx)+"app.asar.unpacked/out/alphatab/";}}const $2=$1.substring(0,$1.lastIndexOf("/")+1);return $2+"alphatab/"');
>>"%PATCHER_JS%" echo   if (original !== content^) {
>>"%PATCHER_JS%" echo     fs.writeFileSync(filePath, content^);
>>"%PATCHER_JS%" echo     patched++;
>>"%PATCHER_JS%" echo   }
>>"%PATCHER_JS%" echo }
>>"%PATCHER_JS%" echo console.log(`Patched ${patched} files`^);

node "%PATCHER_JS%" "app_extracted"
del "%PATCHER_JS%"

:: 6. Перемещение папки alphatab в app.asar.unpacked (как делает electron-builder)
echo Подготовка app.asar.unpacked...
if not exist "app.asar.unpacked\out" mkdir "app.asar.unpacked\out"
if exist "app_extracted\out\alphatab" (
    echo Перемещение папки alphatab в распакованный ресурс...
    xcopy /E /I /Y "app_extracted\out\alphatab" "app.asar.unpacked\out\alphatab" >nul
    rmdir /s /q "app_extracted\out\alphatab"
)

:: 7. Упаковка обратно
echo Упаковываем обратно в app.asar...
call npx asar pack app_extracted app.asar
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось запаковать app.asar!
    echo Восстанавливаем резервную копию...
    copy /Y "app.asar.backup" "app.asar" >nul
    pause
    exit /b 1
)

:: 8. Очистка
echo Очистка временных файлов...
rmdir /s /q "app_extracted"

echo.
echo =======================================================
echo ГОТОВО! GuitarOS успешно пропатчен!
echo =======================================================
echo Теперь вы можете запустить GuitarOS.
echo.
pause

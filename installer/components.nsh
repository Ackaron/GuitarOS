; ─────────────────────────────────────────────────────────────────────────────
; GuitarOS — Simple Interactive Selection
; ─────────────────────────────────────────────────────────────────────────────

!include "LogicLib.nsh"

Var InstallReaperVar

!macro customInit
  ; Ask user if they want Portable Reaper
  MessageBox MB_YESNO|MB_ICONQUESTION "Установить встроенный Portable Reaper?$\r$\n$\r$\nЭто настроенная портативная (фоновая) версия для интеграции с GuitarOS.$\r$\nРекомендуется нажать 'Да', если у вас нет отдельно установленного Reaper." /SD IDYES IDYES +2
  StrCpy $InstallReaperVar "no"
  Goto endReaperPrompt
  StrCpy $InstallReaperVar "yes"
  endReaperPrompt:
!macroend

!macro customInstall
  ${If} $InstallReaperVar == "no"
    ; If user declined Reaper, delete the automatically extracted folder
    RMDir /r "$INSTDIR\Apps\Reaper"
  ${Else}
    ; Ensure Reaper listener directory exists
    CreateDirectory "$INSTDIR\Apps\Reaper\Reaper64\Scripts"
    CopyFiles "$INSTDIR\resources\scripts\reaper_listener.lua" "$INSTDIR\Apps\Reaper\Reaper64\Scripts\reaper_listener.lua"
  ${EndIf}

  ; Setup Environment Variable
  WriteRegExpandStr HKCU "Environment" "GUITAROS_DATA" "$INSTDIR\Data"
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
!macroend

!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Удалить ваш прогресс и базу данных (профили пользователей)?$\r$\n$\r$\nНажмите 'Да', чтобы полностью очистить компьютер от данных GuitarOS.$\r$\nНажмите 'Нет', чтобы сохранить прогресс для будущих установок." /SD IDNO IDNO skipDataDeletion
  
  ; User clicked Yes - clean up AppData
  RMDir /r "$APPDATA\GuitarOS"
  
  skipDataDeletion:
  ; Always clean up application-specific assets in installation directory
  RMDir /r "$INSTDIR\Apps"
  RMDir /r "$INSTDIR\Data"
  DeleteRegValue HKCU "Environment" "GUITAROS_DATA"
!macroend

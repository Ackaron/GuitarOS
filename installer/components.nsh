; ─────────────────────────────────────────────────────────────────────────────
; GuitarOS — Simple Interactive Selection
; ─────────────────────────────────────────────────────────────────────────────

!include "LogicLib.nsh"

Var InstallReaperVar
Var InstallGPVar

!macro customInit
  ; Initialize
  StrCpy $InstallReaperVar "1"
  StrCpy $InstallGPVar "1"

  ; Questions
  MessageBox MB_YESNO "Install Portable REAPER?" IDYES +2
    StrCpy $InstallReaperVar "0"

  MessageBox MB_YESNO "Install Portable Guitar Pro?" IDYES +2
    StrCpy $InstallGPVar "0"
!macroend

!macro customInstall
  ; Use variables
  ${If} $InstallReaperVar == "0"
    RMDir /r "$INSTDIR\Apps\Reaper"
  ${Else}
    CreateDirectory "$INSTDIR\Apps\Reaper\Reaper64\Scripts"
    CopyFiles "$INSTDIR\resources\scripts\reaper_listener.lua" "$INSTDIR\Apps\Reaper\Reaper64\Scripts\reaper_listener.lua"
  ${EndIf}

  ${If} $InstallGPVar == "0"
    RMDir /r "$INSTDIR\Apps\GuitarPro"
  ${EndIf}

  ; Setup Environment Variable
  WriteRegExpandStr HKCU "Environment" "GUITAROS_DATA" "$INSTDIR\Data"
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
!macroend

!macro customUnInstall
  RMDir /r "$INSTDIR\Apps"
  RMDir /r "$INSTDIR\Data"
  DeleteRegValue HKCU "Environment" "GUITAROS_DATA"
!macroend

; Uninstall leftovers that the stock electron-builder NSIS template keeps.
; The template already removes $INSTDIR, shortcuts, and the current-hive
; uninstall / install-location keys (SHELL_CONTEXT, native registry view).
; deleteAppDataOnUninstall removes Roaming (%APPDATA%) only.

!macro deleteAppRegistryHive ROOT
  DeleteRegKey ${ROOT} "${UNINSTALL_REGISTRY_KEY}"
  !ifdef UNINSTALL_REGISTRY_KEY_2
    DeleteRegKey ${ROOT} "${UNINSTALL_REGISTRY_KEY_2}"
  !endif
  DeleteRegKey ${ROOT} "${INSTALL_REGISTRY_KEY}"
!macroend

!macro customUnInit
  ; HKLM is not writable from a per-user uninstall. Elevate once so those
  ; keys can be removed; if the user declines, uninstall still continues.
  ${ifNot} ${isUpdated}
    ${ifNot} ${UAC_IsAdmin}
    ${andIfNot} ${UAC_IsInnerInstance}
      StrCpy $R7 ""
      ReadRegStr $R7 HKLM "${UNINSTALL_REGISTRY_KEY}" UninstallString
      ${if} $R7 == ""
        ReadRegStr $R7 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
      ${endif}
      ${if} $R7 == ""
        SetRegView 32
        ReadRegStr $R7 HKLM "${UNINSTALL_REGISTRY_KEY}" UninstallString
        ${if} $R7 == ""
          ReadRegStr $R7 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
        ${endif}
        SetRegView 64
      ${endif}
      ${if} $R7 != ""
        ShowWindow $HWNDPARENT ${SW_HIDE}
        !insertmacro UAC_RunElevated
        ${Switch} $0
          ${Case} 0
            ${If} $1 = 1
              Quit
            ${EndIf}
          ${Default}
        ${EndSwitch}
        ShowWindow $HWNDPARENT ${SW_SHOW}
      ${endif}
    ${endif}
  ${endif}
!macroend

!macro customUnInstall
  ; --updated is an in-place upgrade: keep the other hive and user data.
  ; The current hive is rewritten by the new installer after this uninstall.
  ${ifNot} ${isUpdated}
    ${if} $installMode == "all"
      !insertmacro deleteAppRegistryHive HKCU
    ${else}
      !insertmacro deleteAppRegistryHive HKLM
    ${endif}

    ; Same keys in the 32-bit view. This x64 installer writes the native view;
    ; restore that view so shortcut cleanup can still read MenuDirectory.
    SetRegView 32
    !insertmacro deleteAppRegistryHive HKCU
    !insertmacro deleteAppRegistryHive HKLM
    SetRegView 64
  ${endif}

  ; Mirror uninstaller.nsh: Roaming is removed there; Local is not.
  ClearErrors
  ${GetParameters} $R0
  ${GetOptions} $R0 "--delete-app-data" $R1
  ${if} ${Errors}
    !ifdef DELETE_APP_DATA_ON_UNINSTALL
      ${ifNot} ${isUpdated}
        StrCpy $R1 "1"
      ${else}
        StrCpy $R1 "0"
      ${endif}
    !else
      StrCpy $R1 "0"
    !endif
  ${else}
    StrCpy $R1 "1"
  ${endIf}

  ${if} $R1 == "1"
    ${if} $installMode == "all"
      SetShellVarContext current
    ${endif}

    RMDir /r "$LOCALAPPDATA\${APP_FILENAME}"
    !ifdef APP_PRODUCT_FILENAME
      RMDir /r "$LOCALAPPDATA\${APP_PRODUCT_FILENAME}"
    !endif
    !ifdef APP_PACKAGE_NAME
      RMDir /r "$LOCALAPPDATA\${APP_PACKAGE_NAME}"
    !endif

    ; Installer copy: $LOCALAPPDATA\<package>-updater\installer.exe
    !ifdef APP_INSTALLER_STORE_FILE
      Push $R7
      Push $R8
      Push $R9
      StrCpy $R7 "$LOCALAPPDATA\${APP_INSTALLER_STORE_FILE}"
      Delete "$R7"
      StrLen $R8 $R7
      ${if} $R8 > 14
        IntOp $R8 $R8 - 14
        StrCpy $R9 $R7 14 $R8
        ${if} $R9 == "\installer.exe"
          StrCpy $R7 $R7 $R8
          StrCpy $R9 "x\y" 1 1
          StrCpy $R9 "$LOCALAPPDATA$R9"
          StrLen $R8 $R9
          StrCpy $R8 $R7 $R8
          ${if} $R8 == $R9
          ${andIf} $R7 != $R9
            RMDir /r "$R7"
          ${endif}
        ${endif}
      ${endif}
      Pop $R9
      Pop $R8
      Pop $R7
    !endif

    ${if} $installMode == "all"
      SetShellVarContext all
    ${endif}
  ${endif}
!macroend

#ifndef MyAppName
#define MyAppName "ODK Star Citizen Collector"
#endif
#ifndef MyAppVersion
#define MyAppVersion "0.2.0"
#endif
#ifndef MyAppPublisher
#define MyAppPublisher "ODK Clan"
#endif
#ifndef MyAppURL
#define MyAppURL "https://github.com/Manuquake/odk-starcitizen-collector"
#endif
#ifndef SourceDir
#define SourceDir ".\staging\starcitizen-collector-windows"
#endif
#ifndef OutputDir
#define OutputDir ".\release"
#endif
#ifndef MyAppIcon
#define MyAppIcon SourceDir + "\ODK-StarCitizen-Collector.ico"
#endif

[Setup]
AppId={{7B3F3C2C-3F68-4D87-8AC1-0E65D17F6E8D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\ODK Star Citizen Collector
DefaultGroupName=ODK Star Citizen Collector
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename=ODK-StarCitizen-Collector-Setup
SetupIconFile={#MyAppIcon}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupLogging=yes
InfoBeforeFile={#SourceDir}\PRIVACY_INSTALL.txt
UninstallDisplayName={#MyAppName}
UninstallDisplayIcon={app}\ODK-StarCitizen-Collector.ico
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=Collector locale Star Citizen per ODK Entity Live
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

[Languages]
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"

[Tasks]
Name: "desktopicon"; Description: "Crea icona sul desktop"; GroupDescription: "Scorciatoie:"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\ODK Star Citizen Collector\Avvia Collector"; Filename: "{app}\Avvia Collector.cmd"; WorkingDir: "{app}"; IconFilename: "{app}\ODK-StarCitizen-Collector.ico"
Name: "{autoprograms}\ODK Star Citizen Collector\Configura Collector"; Filename: "{app}\Configura Collector.cmd"; WorkingDir: "{app}"; IconFilename: "{app}\ODK-StarCitizen-Collector.ico"
Name: "{autoprograms}\ODK Star Citizen Collector\Guida rapida"; Filename: "{app}\README.txt"; IconFilename: "{app}\ODK-StarCitizen-Collector.ico"
Name: "{autoprograms}\ODK Star Citizen Collector\Sicurezza e privacy"; Filename: "{app}\SICUREZZA_PRIVACY.txt"; IconFilename: "{app}\ODK-StarCitizen-Collector.ico"
Name: "{autoprograms}\ODK Star Citizen Collector\Disinstalla ODK Star Citizen Collector"; Filename: "{uninstallexe}"; IconFilename: "{app}\ODK-StarCitizen-Collector.ico"
Name: "{autodesktop}\ODK Star Citizen Collector"; Filename: "{app}\Avvia Collector.cmd"; WorkingDir: "{app}"; IconFilename: "{app}\ODK-StarCitizen-Collector.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\README.txt"; Description: "Apri la guida rapida"; Flags: postinstall shellexec skipifsilent unchecked
Filename: "{app}\Configura Collector.cmd"; Description: "Configura ora il collector"; Flags: postinstall skipifsilent nowait unchecked

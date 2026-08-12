# DEVELOPMENT.md — Entwicklungs- und Build-Anleitung (Fork)

Dieses Dokument beschreibt die Einrichtung dieses Forks von
[SoluceTechnologies/nextcloud-calendar-mobile](https://github.com/SoluceTechnologies/nextcloud-calendar-mobile).
Es ergänzt die (weiterhin gültige) Upstream-Anleitung [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

**Wichtigste Abweichung vom Upstream:** Dieser Fork verwendet die Android-Package-ID
`com.custom.nextcloudcalendar` (temporär, bis ein endgültiges Branding feststeht) sowie den
App-Namen **Nextcloud Calendar Fork**, den Slug `nextcloud-calendar-fork` und das
Deep-Link-Scheme `nextcloud-calendar-fork`. Alle `adb`-Beispiele in der Upstream-CONTRIBUTING.md,
die `com.soluce.nextcloudcalendar` verwenden, gelten hier entsprechend mit
`com.custom.nextcloudcalendar`.

---

## Voraussetzungen

| Software | Version / Hinweis |
| --- | --- |
| **Node.js** | LTS oder neuer (verifiziert mit v24) |
| **Yarn** | 4.5.3 — im Repo gepinnt. Entweder `corepack enable` ausführen, **oder** ohne Corepack direkt `node .yarn/releases/yarn-4.5.3.cjs <befehl>` nutzen (die Release-Datei ist eingecheckt) |
| **JDK** | **17 oder neuer** (verifiziert mit JDK 21). Java 8 funktioniert nicht. Tipp: Android Studio bringt unter `C:\Program Files\Android\Android Studio\jbr` ein passendes JDK mit |
| **Android SDK** | Platform android-36 + Build-Tools (via Android Studio SDK Manager). NDK/CMake werden bei Bedarf automatisch nachgeladen |
| **Android Studio** | Empfohlen (SDK-Manager, Emulator, gebündeltes JDK), aber kein Muss |
| **EAS CLI** | Nur für Cloud-Builds: `npm install -g eas-cli` (kostenloses Expo-Konto nötig) |

**Expo Go wird nicht unterstützt** — die App enthält nativen Code (WatermelonDB, MMKV/Nitro,
Reanimated 4, patch-package). Es ist immer ein Development Build / echter nativer Build nötig.

Umgebungsvariablen für Android-Builds (Windows, PowerShell):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

Alternativ (robuster): eine Datei `android/local.properties` mit
`sdk.dir=C:\\Users\\<user>\\AppData\\Local\\Android\\Sdk` anlegen (wird von Prebuild/Gradle
gelesen, ist gitignored).

---

## Installation (Clone → erster Start)

```bash
git clone https://github.com/PVTvetica/nextcloud-calendar-mobile.git
cd nextcloud-calendar-mobile

# Upstream-Remote für spätere Updates (einmalig)
git remote add upstream https://github.com/SoluceTechnologies/nextcloud-calendar-mobile.git

# Dependencies (postinstall wendet automatisch die patch-package-Patches an)
corepack enable
yarn install

# Natives Android-Projekt generieren (android/ ist bis auf das Manifest gitignored)
npx expo prebuild --platform android
```

Prüfen, ob alles steht:

```bash
yarn tsc --noEmit
```

```bash
yarn test
```

---

## Development Build (Emulator / Gerät)

Emulator starten (Android Studio) oder Gerät mit USB-Debugging anschließen, dann:

```bash
yarn android
```

Das kompiliert die native App, installiert sie und startet Metro. Danach reicht für reine
JS/TS-Änderungen:

```bash
yarn start
```

Ein nativer Rebuild (`yarn android`) ist nur nötig nach: neuen/entfernten nativen Dependencies,
Änderungen an `app.config.ts` oder Config-Plugins, neuen Patches in `patches/`.

---

## APK erstellen

### Variante A: Lokal mit Gradle (verifiziert)

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

Unter Windows (PowerShell): `cd android; .\gradlew.bat assembleRelease`

Ergebnis: `android/app/build/outputs/apk/release/app-release.apk`

**Platzbedarf:** Der Voll-Build (4 CPU-Architekturen) braucht erheblichen Festplattenplatz —
Yarn-/Gradle-Caches + node_modules + Build-Intermediates summieren sich auf ~30 GB. Wenn nur
ein echtes Gerät versorgt werden soll, reicht ein deutlich schlankerer Single-ABI-Build
(so wurde dieser Fork verifiziert; APK ~58 MB, arm64-v8a deckt praktisch alle aktuellen
Android-Geräte ab):

```bash
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

> **Signierung:** Das Release-APK wird mit dem **Debug-Keystore** signiert — für eigene Geräte
> und Tests völlig ausreichend, aber nicht für eine Store-Veröffentlichung. Für ein eigenes
> Release-Signing später einen eigenen Keystore erzeugen (niemals committen, `*.jks`/`*.key`
> sind bereits gitignored).

### Variante B: Cloud-Build mit EAS

Der Upstream-EAS-Projektbezug (`owner: soluce`, dessen `projectId`) wurde aus `app.config.ts`
entfernt. Einmalig das eigene Expo-Konto verknüpfen:

```bash
eas login
```

```bash
eas init
```

(`eas init` trägt eine neue `extra.eas.projectId` in die Config ein — diese Änderung committen.)
Danach:

```bash
eas build --platform android --profile apk
```

Das `apk`-Profil existiert bereits in [eas.json](eas.json) (`buildType: apk` → installierbares
APK statt AAB). Falls EAS das Projekt wegen des eingecheckten Manifests als „bare" einstuft:
vorher `android/`- und `ios/`-Ordner entfernen (so macht es auch die Upstream-CI) und nach dem
Build lokal `npx expo prebuild` erneut ausführen.

---

## APK installieren (Sideloading)

Am Gerät USB-Debugging aktivieren, dann:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Nützlich:

```bash
adb uninstall com.custom.nextcloudcalendar
```

```bash
adb logcat --pid=$(adb shell pidof -s com.custom.nextcloudcalendar)
```

Der Fork ist **parallel zur originalen App installierbar** (andere Application ID).

---

## Upstream synchronisieren

Das Original bleibt als `upstream`-Remote eingebunden:

```bash
git fetch upstream
```

```bash
git merge upstream/main
```

(Alternativ `git rebase upstream/main`, solange der eigene `main` noch nicht geteilt wird —
nach einem Rebase ist `git push --force-with-lease` nötig. Für diesen Fork ist **Merge** die
sicherere Standardempfehlung.)

**Erwartbare Konfliktstellen** (hier wurden Fork-Identität/Doku geändert — bei Konflikten die
Fork-Werte behalten):

- `app.config.ts` (Name, Slug, Scheme, Package-IDs, entfernte EAS-Felder)
- `package.json` + `yarn.lock` (Paketname `nextcloud-calendar-fork`)
- `android/app/src/main/AndroidManifest.xml` (Scheme, `WIDGET_CLICK`-Actions, Labels)
- `src/features/widget/core/types.ts` (`APP_SCHEME`)
- `src/features/widget/storage/widgetStore.ts` (`WIDGET_MMKV_ID`)
- `README.md` (Fork-Hinweis)

Nach jedem Upstream-Merge: `yarn install`, `yarn tsc --noEmit`, `yarn test`,
`npx expo prebuild --platform android` und prüfen, ob sich das getrackte Manifest ändert.

---

## Nextcloud-Testinstanz

Zum Entwickeln braucht es eine erreichbare Nextcloud-Instanz (eigener Server, Docker-Container
oder ein Test-Account auf einem gehosteten Anbieter). Die App meldet sich per **Login Flow**
an; empfohlen ist ein **App-Passwort** (Nextcloud: Einstellungen → Sicherheit → App-Passwort).

Testdaten einspielen (Bash nötig, unter Windows z. B. Git Bash):

```bash
NC_URL=https://cloud.example.com NC_USER=admin NC_PASS=<app-passwort> bash scripts/seed-nextcloud.sh
```

Oder bequemer: `.env.example` nach `.env` kopieren, Werte eintragen (`.env` ist gitignored)
und `just seed` / `just unseed` verwenden (das justfile lädt `.env` automatisch).

---

## Umgang mit Secrets

- **Niemals committen:** Passwörter, App-Passwörter, Tokens, Keystores (`*.jks`, `*.key`,
  `*.p12` …), `.env` mit echten Werten. `.gitignore` deckt diese Muster bereits ab.
- Ein **gitleaks**-pre-commit-Hook ist konfiguriert (`.pre-commit-config.yaml`); aktivieren mit
  `pip install pre-commit && pre-commit install`. Zusätzlich läuft gitleaks in der CI
  (`.github/workflows/security.yml`).
- CI-Secrets des Upstreams (`EXPO_TOKEN`, GitHub-App-Keys für Releases) sind **nicht** im Fork
  vorhanden — siehe „Bekannte offene Punkte" unten.

---

## npm/yarn-Scripts (Bestand, unverändert)

| Script | Zweck |
| --- | --- |
| `yarn start` | Metro-Bundler (`expo start`) |
| `yarn android` | Nativer Build + Start auf Emulator/Gerät (`expo run:android`) |
| `yarn ios` | dito iOS (nur macOS) |
| `yarn test` | Jest-Testsuite (61 Suites / 510 Tests) |
| `yarn tsc --noEmit` | TypeScript-Check (strict) |
| `yarn release` | release-it (Upstream-Release-Prozess; im Fork erst nach eigener Konfiguration sinnvoll) |

Ein separater Linter ist im Projekt **nicht** konfiguriert (kein ESLint/Prettier); die CI prüft
Typecheck + Tests.

---

## Troubleshooting (tatsächlich aufgetretene Punkte)

1. **`yarn` nicht gefunden** → `corepack enable` ausführen oder direkt
   `node .yarn/releases/yarn-4.5.3.cjs <befehl>` verwenden.
2. **`Internal Error: Package for nextcloud-calendar-fork@workspace:. not found`** → tritt nach
   Änderungen an `package.json` (z. B. `name`) auf; einmal `yarn install` ausführen, das
   aktualisiert Install-State und `yarn.lock` (Lockfile-Änderung mit committen, sonst schlägt
   `yarn install --immutable` in der CI fehl).
3. **Gradle bricht mit Java-Fehler ab** → `JAVA_HOME` zeigt auf ein zu altes JDK (z. B. Java 8).
   Auf JDK 17+ zeigen lassen, z. B. das Android-Studio-JBR (siehe Voraussetzungen).
4. **SDK nicht gefunden** → `ANDROID_HOME` setzen oder `android/local.properties` mit `sdk.dir`
   anlegen.
5. **Peer-Dependency-Warnungen bei `yarn install`** (`@react-native/jest-preset`,
   `react-native-screens`, `@babel/core`) → bekannt und unkritisch, Install schlägt nicht fehl.
6. **Prebuild-Hinweis `userInterfaceStyle: Install expo-system-ui`** → harmloser Hinweis des
   Upstream-Setups, kein Fehler.
7. **`expo prebuild` überschreibt `android/`** → gewollt (CNG). Nur `app.config.ts`/Config-Plugins
   ändern, nie generierte Dateien in `android/` (einzige getrackte Ausnahme:
   `android/app/src/main/AndroidManifest.xml`, die nach Config-Änderungen per Prebuild neu
   generiert und committet wird).
8. **Gradle-Build hängt bei den nativen Modulen** (z. B. `:watermelondb-jsi:configureCMake…`,
   Log-Meldung „Daemon will be stopped … running out of JVM Metaspace", Daemon dreht bei hoher
   CPU-Last ohne Fortschritt) → die vom Expo-Template generierten Speichergrenzen
   (`-Xmx2048m -XX:MaxMetaspaceSize=512m`) reichen für diesen Build nicht. Abhilfe: Daemons
   beenden (`.\gradlew.bat --stop`, notfalls Java-Prozesse killen) und in
   `android/gradle.properties` `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1280m`
   setzen. Achtung: `expo prebuild --clean` setzt die Datei wieder zurück — alternativ die
   Werte dauerhaft in `%USERPROFILE%\.gradle\gradle.properties` hinterlegen.
9. **`Execution failed for task ':app:mergeReleaseNativeLibs'` / „nicht genug Speicherplatz"**
   → Festplatte voll. Platz schaffen (`android/app/build` kann gefahrlos gelöscht werden,
   ebenso per `.\gradlew.bat clean`) und/oder den Single-ABI-Build verwenden (siehe oben).
10. **`Cannot lock execution history cache … as it has already been locked by this process`**
   → Überbleibsel eines abgestürzten Builds (z. B. nach vollgelaufener Platte). Daemons
   stoppen (`.\gradlew.bat --stop`, notfalls Java-Prozesse beenden) und das projektlokale
   Verzeichnis `android\.gradle` löschen — es wird beim nächsten Build neu erzeugt.

---

## Bekannte offene Punkte des Forks

- **EAS**: `eas init` wurde noch nicht ausgeführt (erfordert Login in dein Expo-Konto).
  Lokale APK-Builds funktionieren unabhängig davon.
- **GitHub Actions**: `test.yml` (Typecheck + Tests) läuft ohne Secrets. Der
  Release-Workflow (`release.yml` → `expo.yml`) benötigt `EXPO_TOKEN` sowie eine GitHub-App
  (`APP_ID`/`APP_PRIVATE_KEY`) und funktioniert im Fork erst nach eigener Einrichtung.
- **Store-Metadaten**: `fastlane/metadata` und `.release-it.json` sind unverändert Upstream-Stand
  und vor einem eigenen Release anzupassen.
- **iOS**: Bundle-IDs wurden konsistent auf `com.custom.*` umgestellt, aber iOS-Builds erfordern
  ein eigenes Apple-Developer-Setup (Team, App Group `group.com.custom.nextcloud-calendar`).

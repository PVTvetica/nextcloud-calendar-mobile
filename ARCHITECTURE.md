# Architektur

> Diese Datei beschreibt den Stand dieses Forks zum Zeitpunkt der Erstellung (Basis: Upstream-Commit `692342f` von SoluceTechnologies/nextcloud-calendar-mobile, Stand 2026-08). Fork-Identität: App-Name **"Nextcloud Calendar Fork"**, Android-Package **`com.custom.nextcloudcalendar`**, Slug **`nextcloud-calendar-fork`**, Deep-Link-Scheme **`nextcloud-calendar-fork`**. Die EAS-`projectId`/`owner` des Upstreams wurden aus `app.config.ts` entfernt.

## 1. Überblick + Verzeichnisstruktur

Expo SDK 57 / React Native 0.86 App (TypeScript), die Nextcloud-Kalender per CalDAV synchronisiert. Kernprinzipien:

- **Local-first**: Die UI liest ausschließlich reaktiv aus einer WatermelonDB (SQLite); Sync läuft nebenläufig und schreibt in die DB.
- **Kein Backend außer dem Nextcloud-Server des Nutzers**: Basic Auth mit App-Passwort, keine Vendor-APIs, kein Push-Dienst.
- **Handgerollter CalDAV-Client**: Alle Requests über globales `fetch`; `tsdav` ist zwar in `package.json` deklariert, wird aber **nirgends importiert**.
- **expo-router** (dateibasiertes Routing), **Zustand** (persistiert in MMKV), **ical.js** (ICS-Parsing), **i18next** (8 Sprachen).

```
NextcloudCalendar/
├── app/                          # expo-router-Routen (dateibasiertes Routing)
│   ├── _layout.tsx               # Root-Layout: Provider, Init-Hooks, Splash-Gating
│   ├── index.tsx                 # Auth-Gate (einzelner Redirect)
│   ├── (auth)/setup.tsx          # Login-Screen (manuell + QR)
│   ├── (tabs)/                   # Tab-Navigator: calendar/ + settings/
│   └── event/                    # Event-Detail/-Edit/-New auf dem Root-Stack
├── src/
│   ├── components/               # App-weite Komponenten (Providers, RootNavigator, FakeSplash, …)
│   ├── database/                 # WatermelonDB: Schema, Modelle, Sync, Mapper, Hooks
│   ├── features/
│   │   ├── account/              # Account-UI, QR-Scanner, Reconnect, Avatar
│   │   ├── calendar/             # Kalenderansichten (Monat/Time-Grid/Agenda), Drag & Drop
│   │   ├── event/                # EventForm, Mutations-Hooks, Recurrence-Scopes
│   │   ├── notifications/        # Lokale Erinnerungen (expo-notifications)
│   │   ├── settings/             # Settings-Komponenten (SettingsPage, Toggles)
│   │   └── widget/               # Agenda-Snapshots, Widget-Surfaces, Background-Sync
│   ├── hooks/                    # useAppInitialization, useAccounts, useCalendars, …
│   ├── locales/                  # i18n-JSONs: en, de, es, fr, it, nl, pt, ru
│   ├── services/
│   │   ├── nextcloud/            # caldav.ts, nextcloud.ts (OCS), auth.ts, talk.ts
│   │   └── shared/               # errors.ts (HttpError), network.ts (Online-State)
│   ├── storage/                  # Default-MMKV-Instanz + AsyncStorage→MMKV-Migration
│   ├── stores/                   # Zustand-Stores (account/calendar/settings) + legacyStorage
│   ├── theme.ts                  # Light-/Dark-Theme (einzige Theme-Quelle)
│   ├── types/                    # Gemeinsame Typen (Account, CalendarEvent, ViewMode, …)
│   ├── ui/components/            # ~22 handgerollte Design-System-Primitives
│   └── utils/                    # ics.ts, caldav-parse.ts, i18n.ts, timezone.ts, …
├── modules/live-updates/         # Lokales Expo-Native-Module (Android/Kotlin): Live-Update-Notification
├── android/                      # Von `expo prebuild` generiert (gitignored) — nur AndroidManifest.xml ist getrackt
├── patches/                      # 5 patch-package-Patches (via postinstall angewandt)
├── assets/                       # Icons, Splash-Bild
├── __tests__/, __mocks__/        # Jest-Tests + Auto-Mocks (react-native-mmkv, expo-widgets)
├── scripts/seed-nextcloud.sh     # CalDAV-Testdaten-Seeder (NC_URL/NC_USER/NC_PASS)
├── fastlane/                     # Android-Store-Metadaten (kein Fastfile)
├── index.ts                      # Entry-Shim — wird durch package.json "main" umgangen (s. Abschnitt 15)
├── app.config.ts                 # Expo-Config (Fork-Identität, Plugins)
├── eas.json                      # EAS-Build-Profile (submit-Block trägt noch Upstream-Apple-IDs)
└── package.json                  # main: expo-router/entry, Jest-Config, yarn 4.5.3
```

## 2. App-Einstiegspunkt

- `package.json` deklariert `"main": "expo-router/entry"` — Metro nutzt direkt den Library-Entry von expo-router.
- `index.ts` (Root) existiert ebenfalls: importiert `expo-router/entry` und ruft `registerWidgetEntry()` (Registrierung des Android-Widget-Task-Handlers) auf. Da `main` aber direkt auf `expo-router/entry` zeigt, wird **`index.ts` nie geladen** — siehe Abschnitt 15.
- expo-router mountet `app/_layout.tsx` als Root-Layout. Es rendert `Providers` (`GestureHandlerRootView` > `DatabaseProvider` > expo-router `ThemeProvider`), importiert `@/utils/i18n` als Seiteneffekt, sperrt die Orientation (Portrait auf Phones, frei auf Tablets) und mountet die Init-Hooks `useAppInitialization`, `useCapabilitiesSync`, `useLanguageSync`, `useWidgetSync`, `useEventAlerts`.

Startsequenz (`src/hooks/useAppInitialization.ts`):

1. `SplashScreen.preventAutoHideAsync()` (Modul-Scope)
2. `migrateFromAsyncStorage()` — einmalige Kopie der Legacy-Keys aus AsyncStorage nach MMKV
3. Manuelle Rehydrierung der drei Zustand-Persist-Stores (`persist.rehydrate()`)
4. `initializeDatabaseOnStartup()` — WatermelonDB-Init inkl. Health-Check (`src/database/utils/initialization.ts`)
5. `loadAccounts()` aus SecureStore/MMKV → `setAccounts()` (Modul-Store in `src/hooks/useAccounts.ts`)
6. Aktive Account-ID auflösen (persistierte ID oder erster Account), doppelt persistieren
7. Fire-and-forget: `syncCalendars()`, `refreshAccountProfiles()`, `fetchCapabilities()`
8. `isAppReady = true` → statt `FakeSplash` (`src/components/FakeSplash.tsx`, hartkodiert `#109be6`) rendert `RootNavigator` (`src/components/RootNavigator.tsx`, headerloser `<Stack>`).

## 3. Navigation (expo-router)

Deep-Link-Basis ist das Scheme `nextcloud-calendar-fork` (registriert in `app.config.ts:16`, dupliziert als `APP_SCHEME` in `src/features/widget/core/types.ts:2` — beide müssen synchron bleiben, ebenso das getrackte `android/app/src/main/AndroidManifest.xml`).

| Route | Datei | Zweck |
|---|---|---|
| `/` | `app/index.tsx` | Auth-Gate: `<Redirect>` zu `/(tabs)/calendar` wenn ≥1 Account existiert, sonst `/(auth)/setup` |
| `/setup` | `app/(auth)/setup.tsx` | Login (manuell + QR); dient auch als "Account hinzufügen" |
| `/calendar` | `app/(tabs)/calendar/index.tsx` | Hauptkalender (5 Ansichten, Drawer, FAB) |
| `/settings` | `app/(tabs)/settings/index.tsx` | Settings-Hub |
| `/settings/appearance` | `app/(tabs)/settings/appearance.tsx` | Theme-Präferenz + Sprache |
| `/settings/calendar` | `app/(tabs)/settings/calendar.tsx` | Wochenstart + Stunden-Zoom |
| `/settings/accessibility` | `app/(tabs)/settings/accessibility.tsx` | Haptik + Reduce-Motion |
| `/settings/notifications` | `app/(tabs)/settings/notifications.tsx` | Wrapper um `NotificationSettings` |
| `/settings/widgets` | `app/(tabs)/settings/widgets.tsx` | Wrapper um `WidgetCalendarSettings` |
| `/settings/accounts` | `app/(tabs)/settings/accounts.tsx` | Account-Liste, Account hinzufügen |
| `/settings/account/[id]` | `app/(tabs)/settings/account/[id].tsx` | Account-Detail, Reconnect, Löschen |
| `/settings/about` | `app/(tabs)/settings/about.tsx` | Version + GitHub-Links (noch Upstream-URLs) |
| `/event/[uid]` | `app/event/[uid].tsx` | Event-Detail (auch Ziel der Widget-Deep-Links `nextcloud-calendar-fork://event/<uid>`) |
| `/event/edit/[uid]` | `app/event/edit/[uid].tsx` | Edit-Formular; liest `?scope=` (`this` \| `thisAndFollowing` \| default `all`) |
| `/event/new` | `app/event/new.tsx` | Create-Formular; liest `?date=` (ISO) als Default-Datum |

- **Auth-Gating** ist ausschließlich der eine Redirect in `app/index.tsx`; die `(auth)`-Gruppe hat kein eigenes `_layout` und keine Route ist sonst geschützt.
- **Tabs**: `app/(tabs)/_layout.tsx` definiert zwei Tabs (`calendar/index`, `settings`) in `TAB_ITEMS`; auf iOS ≥ 26 werden `NativeTabs` aus `expo-router/unstable-native-tabs` genutzt (`src/utils/nativeTabs.ts`), sonst klassische JS-`<Tabs>` mit lucide-Icons.
- **Settings-Substack**: `app/(tabs)/settings/_layout.tsx` ist ein verschachtelter `Stack`, der bei Tab-Blur per `RESET`-Dispatch immer auf den Hub zurückgesetzt wird.
- Es gibt **kein `+not-found.tsx`** — unaufgelöste Deep-Links haben keine Fallback-Route.
- Navigations-Helpers: `src/utils/navigationGuard.ts` (`goBackOrHome`, 700-ms-Doppeltipp-Guard).

## 4. Screens

- **Auth**: `app/(auth)/setup.tsx` — Server-URL/Benutzername/App-Passwort-Formular (URL wird normalisiert, https erzwungen) plus QR-Scanner (`src/features/account/components/QrLoginScanner.tsx`, expo-camera). Zurück-Button nur bei >1 Account.
- **Kalender**: `app/(tabs)/calendar/index.tsx` — komponiert `MonthDayView`, `AgendaView` und `TimeGridView` (alle gleichzeitig gemountet, Sichtbarkeit über `ViewLayer`), `CalendarTopBar`, custom `CalendarDrawer`, `CalendarFab`; zeigt `CalendarUnavailable` bei Server-Capability `calendarApp === 'unconfigured'` und `OfflineBanner` bei Offline.
- **Settings**: Hub + Unterscreens (Tabelle oben), gebaut auf `src/features/settings/components/SettingsPage.tsx` / `SettingsLink.tsx`. Account-Detail rendert bei verlorenen Credentials (`useAccountAuthStatus`, 401/403) die `AccountReconnectForm`.
- **Event-Screens**: Detail (`[uid]`), Edit, New — liegen außerhalb der Tabs auf dem Root-Stack und werden als Full-Screen-Cards gepusht. Detail enthält einen Stack-Dedup-Effekt (`navigation.reset()` bei doppelter Route) und einen Talk-Join-Button (Android: `intent://`-URL auf die externe App `com.nextcloud.talk2`, Browser-Fallback).

## 5. UI-Komponenten

- **Design-System**: `src/ui/components/` — ~22 kleine, handgerollte Primitives (Barrel-Export `index.ts`): `Typography` (11 Varianten), `Stack`, `Button`, `Chip`, `IconButton`, `Icon`, `Item`, `List`, `Sheet`, `Dialog`, `Select`, `TextField`, `DateField`, `Toggle`, `Divider`, `Spinner`, `Avatar`, `Accordion`, `ScreenHeader`, `SectionHeader`, `ViewContainer`, `AnimatedPressable`. Kein Third-Party-Design-System (kein tamagui/nativewind/styled-components).
- **App-Komponenten**: `src/components/` — `Providers.tsx`, `RootNavigator.tsx`, `FakeSplash.tsx`, `AvatarImage.tsx`, `LanguageSheet.tsx`.
- **Theming**: `src/theme.ts` definiert `ThemeColors` (21 semantische Tokens; primary `#109be6` light / `#29aef7` dark), spacing/radius/typography und exportiert `lightTheme`/`darkTheme` inkl. globaler `ReactNavigation.Theme`-Augmentation. `src/components/Providers.tsx` löst `settingsStore.themePreference` (`system`/`light`/`dark`) gegen `useColorScheme()` auf und injiziert das Theme über expo-routers `ThemeProvider`; Konsum überall via `useTheme()`.
- Einige Farben umgehen das Theme (Rebranding-relevant): `FakeSplash` `#109be6`, Now-Indicator `'red'` (`DayColumn.tsx`), weiße Texte in `TimeGridHeader.tsx`/`CalendarFab.tsx`, Widget-Palette in `src/features/widget/core/theme.ts` (plus Inline-Kopien in den iOS-Widget-Dateien).

## 6. State Management (Zustand)

Alle drei Stores nutzen `zustand/middleware persist` mit `createJSONStorage` in die **eine** Default-MMKV-Instanz (`src/storage/index.ts`, `createMMKV()` ohne id, unverschlüsselt), gewrappt in `legacyBackedStorage` (`src/stores/legacyStorage.ts`), das fehlende Keys aus dem alten monolithischen `app-store`-Blob nachlädt.

| Store | Datei | Inhalt | Persistenz-Key |
|---|---|---|---|
| `useAccountStore` | `src/stores/accountStore.ts` | `activeAccountId`, `capabilities` (`talkEnabled`, `calendarApp`) | `account-store` |
| `useCalendarStore` | `src/stores/calendarStore.ts` | `viewMode` (Default `week`), `hiddenCalendarIds`, `notifDisabledCalendarIds`, `widgetDisabledCalendarIds`, `hourRowHeight` (Default 60); `selectedDate` bewusst nicht persistiert | `calendar-store` |
| `useSettingsStore` | `src/stores/settingsStore.ts` | `themePreference`, `language`, `weekStartsOn` (0\|1), `liveActivityEnabled`, `timedAlert`/`allDayAlert`, `hapticsEnabled`, `reduceMotion` | `settings-store` (Version 1) |

- **Accounts sind nicht in Zustand**: `src/hooks/useAccounts.ts` ist ein Modul-Level-Store via `useSyncExternalStore` (`useAccounts()`, `useActiveAccount()`), Quelle ist `loadAccounts()` aus `src/services/nextcloud/auth.ts`.
- **i18n**: `src/utils/i18n.ts` initialisiert i18next + react-i18next als Modul-Seiteneffekt (Import in `app/_layout.tsx`) mit 8 gebündelten Locales aus `src/locales/` (en, de, es, fr, it, nl, pt, ru), immer mit `lng: 'en'`; `src/hooks/useLanguageSync.ts` schiebt danach `settingsStore.language` (Initialwert via expo-localization) in `i18n.changeLanguage()` und `dayjs.locale()`. Sprachauswahl über `src/components/LanguageSheet.tsx` im Appearance-Screen; Übersetzungsparität wird von `__tests__/i18n/parity.test.ts` geprüft.
- Die aktive Account-ID wird **doppelt** persistiert: roher MMKV-Key `active_account_id` (autoritativ beim Start) und im Zustand-Blob `account-store` (reaktiv für die UI). Beide werden stets zusammen geschrieben.
- Rehydrierung ist manuell und wird von `useAppInitialization` abgewartet — Komponenten außerhalb des `isAppReady`-Gates sähen Default-Werte.

## 7. Datenbank / lokale Speicherung

**WatermelonDB** (SQLite, Schema-Version 3):

| Baustein | Datei |
|---|---|
| Schema: Tabellen `events` (17 Spalten) und `calendars` (12 Spalten, inkl. `ctag`, `sync_token`, `expanded_center`) | `src/database/schema.ts` |
| Migrationen (v2: `sync_token`/`expanded_center`; v3: `alarm_minutes`) | `src/database/migrations.ts` |
| DB-Instanz (`SQLiteAdapter`, Modelle `Event`, `Calendar`) | `src/database/index.ts`, `src/database/models/` |
| Sync-Kern (`syncCalendars`, `syncEvents`, `syncCalendarDelta`, Row-Mapper, Dirty-Checks, `markLocalWrite`-Epoch) | `src/database/sync.ts` |
| Optimistische lokale Writes (`insertEvents`, `patchByUid`, `shiftSeriesDates`, `snapshotByBase`, `removeWhere`, `restoreSeries`) | `src/database/eventWrites.ts` |
| Row→`CalendarEvent`-Mapper | `src/database/mappers/event.ts` |
| Reaktive Hooks (`useEventsForRange`, `useEventByUid`, `useCalendarsFromDb`) + beobachtete Spaltenlisten | `src/database/useEvents.ts`, `useEventByUid.ts`, `useCalendars.ts`, `observedColumns.ts` |
| Provider/Singleton + `ClearDatabaseForAccount` | `src/database/DatabaseProvider.tsx` |
| `safeWrite`/`safeRead` (Timeout-Race), Startup-Init/Recovery | `src/database/utils/safeTransaction.ts`, `initialization.ts` |

Wiederkehrende Events werden **vor-expandiert** gespeichert: eine Zeile pro Occurrence mit uid-Suffix `${uid}_occ_<unixTime>` (Expansion via ical.js, Cap 1000). `events.calendar_id` enthält die absolute Server-URL des Kalenders, nicht eine WatermelonDB-Row-ID.

**MMKV-Instanzen**:

1. Default-Instanz (`src/storage/index.ts`) — Zustand-Blobs, `account_ids`, `active_account_id`, Avatar-Cache (`avatar:<accountId>`), Migrations-Flag.
2. Widget-Instanz mit `WIDGET_MMKV_ID = 'group.com.custom.nextcloud-calendar'` (`src/features/widget/storage/widgetStore.ts:6`) — Keys `widget.agenda.v1` (Snapshot-Timeline) und `widget.live.v1`. Die ID entspricht der iOS-App-Group und muss mit `app.config.ts` (Entitlement + expo-widgets `groupIdentifier`) synchron bleiben.

**SecureStore**: Das vollständige Account-JSON (inkl. `appPassword` im Klartext innerhalb des Blobs) liegt in expo-secure-store unter `account_<uuid>` (`src/services/nextcloud/auth.ts`).

Wichtigste Speicher-Keys im Überblick:

| Key | Ablage | Inhalt | Geschrieben von |
|---|---|---|---|
| `account_<uuid>` | SecureStore | Account-JSON inkl. `appPassword` | `src/services/nextcloud/auth.ts` |
| `account_ids` | Default-MMKV | JSON-Array der Account-IDs | `src/services/nextcloud/auth.ts` |
| `active_account_id` | Default-MMKV | aktive Account-ID (autoritativ beim Start) | `src/services/nextcloud/auth.ts` |
| `account-store` / `calendar-store` / `settings-store` | Default-MMKV | Zustand-Persist-Blobs | Persist-Middleware |
| `app-store` | Default-MMKV | Legacy-Monolith (nur Lese-Fallback) | Altbestand |
| `avatar:<accountId>` | Default-MMKV | Avatar als Data-URI | `src/features/account/hooks/useAvatar.ts` |
| `__migrated_from_async_storage__` | Default-MMKV | Migrations-Flag | `src/storage/index.ts` |
| `widget.agenda.v1` / `widget.live.v1` | Widget-MMKV | Snapshot-Timeline / Live-Event-State | `src/features/widget/storage/widgetStore.ts` |

**AsyncStorage-Migration**: `migrateFromAsyncStorage()` (`src/storage/index.ts`) kopiert einmalig `account_ids`, `active_account_id`, `app-store` aus AsyncStorage nach MMKV, geschützt durch das Flag `__migrated_from_async_storage__` (Flag wird auch bei Fehlern gesetzt).

## 8. Nextcloud-Verbindung & Authentifizierung

- **Auth-Modell**: Nextcloud-App-Passwort + HTTP Basic Auth (`btoa(username:appPassword)`). Es gibt **keinen Login Flow v2** (kein `/index.php/login/v2`-Polling) und kein OAuth.
- **Manueller Login** (`app/(auth)/setup.tsx` → `connectWith()`): URL normalisieren → `validateCredentials()` (`src/services/nextcloud/caldav.ts`): PROPFIND auf `/remote.php/dav/` nach `current-user-principal`, dann `calendar-home-set`, daraus `davUserId` (Fallback: PROPFIND `principals/users/<username>/`, dann roher Username) → `fetchUserInfo()` (OCS `/ocs/v2.php/cloud/users/<davUserId>`, Fehler werden zu Leerstrings verschluckt) → Account mit `Crypto.randomUUID()` speichern und aktivieren → `router.replace('/(tabs)/calendar')`.
- **QR-Login**: `parseNcLoginUrl` (`src/features/account/utils/ncLoginUrl.ts`) versteht `nc://login/...` (Passwort ist direkt das App-Passwort) und `nc://onetime-login/...`; One-Time-Tokens werden per `exchangeOneTimeToken()` (`src/services/nextcloud/nextcloud.ts`, GET `/ocs/v2.php/core/getapppassword-onetime`) gegen ein permanentes App-Passwort getauscht. Gleicher Pfad in der `AccountReconnectForm`.
- **Credential-Speicherung**: siehe Abschnitt 7 (SecureStore + MMKV). "Logout" existiert nur als Account-Löschung (`useDeleteAccount`: SecureStore-Key, DB-Rows, Avatar-Cache; App-Passwort wird serverseitig **nicht** widerrufen).
- **Capabilities**: `fetchCapabilities()` (`src/services/nextcloud/nextcloud.ts`) prüft `spreed` (→ `talkEnabled`) und die Calendar-App (`/ocs/v2.php/core/navigation/apps` → `available`/`unconfigured`/`unknown`); gespeichert in `accountStore.capabilities`, abgerufen beim Start (`useAppInitialization`) und bei Account-Wechsel (`src/hooks/useCapabilitiesSync.ts`).
- **Talk**: `createTalkRoom()` (`src/services/nextcloud/talk.ts`, OCS spreed API v4, roomType 2 privat / 3 öffentlich); Raum-URL landet in `LOCATION` des Events.
- **Fehler/Netz**: `HttpError` + `describeMutationError` (`src/services/shared/errors.ts`, i18n-Mapping für 401/403/404/429/5xx/Netzfehler); Online-State via expo-network (`src/services/shared/network.ts`).

## 9. CalDAV

- **Kein tsdav**: `tsdav ^2.2.0` steht in `package.json`, wird aber nirgendwo importiert (verifiziert per Grep). Der gesamte CalDAV-Verkehr ist handgerollt in `src/services/nextcloud/caldav.ts`: XML-Bodies als Template-Strings, 207-Multistatus-Antworten werden mit **Regexen** geparst (kein XML-Parser; angewiesen auf Nextclouds `d:`/`cs:`/`cal:`-Namespace-Präfixe).
- Requests (`davFetch`: Basic Auth, `credentials: 'omit'`, 20-s-AbortController, kein Retry/Backoff):
  - `PROPFIND Depth:1` — Kalenderliste (`fetchCalendars`: displayname, calendar-color, `cs:getctag`, `cs:source`, Privilege-Set für Read-only-Heuristik)
  - `REPORT calendar-query` — Events im Zeitfenster (`fetchEvents`); abonnierte Kalender laden stattdessen das rohe ICS-Feed von `sourceUrl` (unauthentifiziert)
  - `REPORT calendar-multiget` — Batches von 50 hrefs (`fetchEventsByHrefs`, `MULTIGET_BATCH`)
  - `REPORT sync-collection` — RFC-6578-Delta (`syncCollection`; 507/403/409 = Token ungültig → Full-Resync) — aktuell ohne Aufrufer, s. Abschnitt 10
  - `PUT` / `MOVE` (Destination + `Overwrite:T`) / `DELETE` (404 wird toleriert) / `GET` (`fetchEventIcs`)
- **ICS-Parsing** (`src/utils/caldav-parse.ts`, ical.js): `parseIcsItem`/`parseIcsObjectsAsync` (8-ms-Frame-Budget), RRULE-Expansion über `ICAL.Event.iterator()` (Cap `MAX_OCCURRENCES = 1000`), Occurrence-uids `${uid}_occ_<unix>`, VALARM → `alarmMinutes`, Talk-URL-Erkennung (`/\/call\//` in LOCATION), Reparatur kaputter ICS-Zeilenfaltung, `extractExtraVeventLines` bewahrt nicht verwaltete VEVENT-Properties beim Rewrite.
- **ICS-Erzeugung** (`src/utils/ics.ts`, handgeschriebener Serializer, PRODID `-//Nextcloud Calendar Mobile//EN`): `buildIcs`, `buildAllDayIcs`, `buildExceptionIcs` (RECURRENCE-ID), `shiftIcsDates`, `injectExdate`, `truncateRruleUntil`; 75-Byte-Zeilenfaltung, TZID-basierte lokale Timestamps.

## 10. Kalender-Synchronisation

Sync ist rein **pull-basiert** (kein Push, kein Pull-to-Refresh):

| Trigger | Ort | Was läuft |
|---|---|---|
| App-Start | `src/hooks/useAppInitialization.ts` | `syncCalendars(activeAccount)` (fire-and-forget) |
| 30-s-Foreground-Poll | `src/hooks/useCalendars.ts` (`LIVE_POLL_MS = 30000`) | Kalenderliste (`syncCalendars`) |
| Account-/Kalender-/Monatswechsel | `src/features/calendar/hooks/useCalendarData.ts` | `syncEvents` für das 3-Monats-Fenster (`monthRange`, `src/features/calendar/utils/range.ts`), danach Prefetch Vor-/Folgemonat mit `deleteMissing=false` |
| Event-Detail/Edit-Aufruf | `app/event/[uid].tsx` | `syncEvents` für ±3 Monate |
| Background-Task (≥15 min) | `src/features/widget/sync/backgroundSync.ts` | `syncCalendars` + `syncEvents` (7 Tage, `deleteMissing=false`) |

Mechanik (`src/database/sync.ts`):

- `syncCalendars`: PROPFIND-Ergebnis wird per `remote_id` gegen die `calendars`-Tabelle abgeglichen (create/update/markAsDeleted in einem `db.batch`).
- `syncEvents`: **Windowed Full-State-Reconciliation** — Feldvergleich (`eventUnchanged`), keyed auf `accountId|calendarId|uid`. Löschungen (`prepareMarkAsDeleted`) nur bei `deleteMissing=true` (aktives Monatsfenster). Ein `localWriteEpoch`-Zähler (`markLocalWrite`) lässt einen laufenden Pull abbrechen, wenn der Nutzer währenddessen lokal geschrieben hat.
- **ctag/etag/sync-token**: `getetag` wird zwar angefragt, aber **nie geparst oder gespeichert** — es gibt keine etag-/If-Match-Konfliktbehandlung (Writes sind last-writer-wins). `ctag` wird auf Kalender-Rows gespeichert, aber nicht genutzt, um unveränderte Kalender zu überspringen. Der komplette RFC-6578-Delta-Pfad (`syncCalendarDelta` + `syncCollection`, Spalten `sync_token`/`expanded_center`, ±18-Monats-Horizont in `src/features/calendar/utils/horizon.ts`) ist implementiert und getestet, wird aber **von keinem Produktivpfad aufgerufen** (nur `__tests__/database/syncCalendarDelta.test.ts`).
- Die UI abonniert die DB reaktiv (`observeWithColumns`) — Sync-Ergebnisse erscheinen automatisch, Screens warten nie auf Sync.

## 11. Event-Erstellung / -Bearbeitung / -Löschung

Kern: `src/features/event/hooks/useMutateEvent.ts` (`useCreateEvent` / `useUpdateEvent` / `useDeleteEvent`) — alle Mutationen sind **optimistisch**: lokale DB zuerst (`src/database/eventWrites.ts`), dann Server; bei Serverfehler Rollback aus einem Snapshot (`snapshotByBase`/`restoreSeries`) plus Alert (`describeMutationError`).

- **Create** (`app/event/new.tsx` → `EventForm`): uid = `Crypto.randomUUID()`; recurring Input wird optimistisch über −1/+3 Monate expandiert; optional Talk-Raum (`createTalkRoom`, URL → LOCATION + `Talk: <url>` in DESCRIPTION); ICS via `buildIcs`/`buildAllDayIcs`; `putEvent` → `PUT {calendar.url}{uid}.ics`.
- **Update** (`app/event/edit/[uid].tsx`, Scope aus `?scope=`):
  - `all` / nicht-recurring: Master-ICS per `fetchEventIcs` holen, SEQUENCE+1, nicht verwaltete Properties via `extractExtraVeventLines` erhalten, komplettes ICS neu bauen und `PUT`; Kalenderwechsel danach per WebDAV `MOVE` (bei recurring Events ist Kalenderwechsel im Formular gesperrt).
  - `this`: Master mit `injectExdate(dtstart)` zurückschreiben + Exception-VEVENT (`buildExceptionIcs`, Ressource `{uid}-exc-<ts>.ics`).
  - `thisAndFollowing`: Master-RRULE per `truncateRruleUntil` kappen + neue Serie unter frischer UID `PUT`ten (SEQUENCE 0 — Attendee-Kontinuität geht verloren).
  - Drag & Drop im Time-Grid nutzt die `datesOnly`-Variante: `shiftIcsDates` patcht nur DTSTART/DTEND/SEQUENCE im rohen Master.
- **Delete** (`app/event/[uid].tsx`): Scope-Prompt (`askRecurrenceScope`, `src/features/event/recurrenceScope.ts`) + Bestätigung; Server: `DELETE` (`all`/nicht-recurring), `injectExdate` (`this`), `truncateRruleUntil` (`thisAndFollowing`).
- **Scope-Entscheidung**: `decideMoveEventScope` (`src/features/calendar/utils/moveEventScope.ts`) — nicht-recurring → `all`; RRULE, die der bewusst strikte Parser `parseRrule` (`src/features/calendar/utils/parseRrule.ts`, nur FREQ/INTERVAL/BYDAY/COUNT/UNTIL) nicht versteht → stillschweigend `this`; sonst Nutzer-Prompt.
- **Formular** (`src/features/event/components/EventForm.tsx`): Titel, Kalender-Chips (Default bevorzugt Slug `personal`), All-Day-Toggle, plattformspezifische Datums-/Zeit-Picker (iOS inline compact, Android zweistufiger Dialog), `RecurrencePicker` (nur FREQ + weekly BYDAY, Intervall immer 1), `AlertPicker` (ein einzelner Reminder), E-Mail-Attendees, `TalkToggle`. Organizer wird aus dem Account abgeleitet (`src/features/event/utils/organizer.ts`) und bei Updates vom Server-Event übernommen.

## 12. Hintergrund-Synchronisation

- `src/features/widget/sync/backgroundSync.ts` definiert per `TaskManager.defineTask` den Task **`widget-agenda-refresh`** (expo-background-task/expo-task-manager) beim Modul-Load.
- Registrierung: `useWidgetSync` (`src/features/widget/hooks/useWidgetSync.ts`, gemountet in `app/_layout.tsx`) registriert den Task mit `minimumInterval` **15 Minuten**, sobald ein Account aktiv ist, und deregistriert ihn ohne Account. 15 min sind ein Floor — tatsächliche Ausführung bestimmt das OS (WorkManager/BGTaskScheduler).
- Task-Body: aktiven Account aus `src/services/nextcloud/auth.ts` laden → `syncCalendars` → `syncEvents` für heute+7 Tage (`WINDOW_DAYS = 7`, `deleteMissing=false`) → `syncWidget()` (nur DB → Widget-Flächen, kein Netz; `src/features/widget/sync/syncWidget.ts`) → `scheduleEventAlerts()`.
- Foreground-Widget-Refreshes (DB-Observation, 60-s-Tick, AppState `active`) rufen nur `syncWidget()`, nicht den Netz-Sync.

## 13. Notifications

Ausschließlich **lokale** expo-notifications — kein Push (kein APNs/FCM/`getExpoPushTokenAsync` im Code).

- **Event-Erinnerungen** (`src/features/notifications/`): `scheduleAlerts.ts` cancelt zuerst **alle** geplanten Notifications (`cancelAllScheduledNotificationsAsync`), legt den Android-Channel `event-alerts` (HIGH) an und plant dann bis zu **60** DATE-Trigger-Alerts über **30 Tage** (`MAX_SCHEDULED`, `HORIZON_DAYS`), mit `data:{uid}`. `alerts.ts` bestimmt die Zeit: per-Event-VALARM (`alarmMinutes`) gewinnt, sonst globale Defaults aus `settingsStore` (`timedAlert` Minuten vorher; `allDayAlert` um 09:00 lokal N Tage vorher). `alertContent.ts` baut den Body (Lead-Label, Ort, Meeting-Provider, gekürzte Beschreibung).
- **Re-Scheduling**: `useEventAlerts.ts` (Root-Layout) bei Account-/Einstellungs-Änderungen, DB-Änderungen der heutigen Events und App-Foreground; zusätzlich im Background-Task.
- **Kein Tap-Handling**: Es existiert kein `addNotificationResponseReceivedListener` — Tippen auf eine Erinnerung öffnet nur die App, nicht das Event.
- **Android "Live Update"**: `modules/live-updates/` (lokales Expo-Kotlin-Modul, Android-only via `expo-module.config.json`) postet für das laufende Event eine ongoing Notification (Channel `live_event`, ID 4201) mit Fortschrittsbalken, 30-s-Refresh-Handler und `setTimeoutAfter`; auf Android 16 (SDK 36) zusätzlich Promoted-Notification-Support (reflektives `setRequestPromotedOngoing`). Das iOS-Pendant ist eine echte Live Activity (`src/features/widget/surfaces/liveActivity/liveActivity.ios.tsx`).

## 14. Android-spezifischer Code

- **CNG / Prebuild-Workflow**: `android/` wird von `expo prebuild` aus `app.config.ts` generiert und ist **gitignored** — einzige getrackte Ausnahme ist `android/app/src/main/AndroidManifest.xml` (laut Upstream für F-Droid committet). Das generierte Projekt enthält u. a. `android/app/build.gradle` (namespace/applicationId `com.custom.nextcloudcalendar`), Kotlin-Sourcen unter `android/app/src/main/java/com/custom/nextcloudcalendar/` (`MainApplication.kt`, `MainActivity.kt`) und die vom react-native-android-widget-Plugin generierten Widget-Receiver (`widget/Calendar{Small,Medium,Large}Widget.java`). Native Änderungen gehören daher in `app.config.ts` bzw. Config-Plugins, nie direkt in `android/` (Ausnahme: nach Config-Änderungen das neu generierte getrackte Manifest committen). Der Upstream-CI-Workflow (`.github/workflows/expo.yml`) löscht `android/`+`ios/` vor EAS-Builds (`rm -rf android ios`) und verlässt sich rein auf CNG.
- **AndroidManifest** (`android/app/src/main/AndroidManifest.xml`): MainActivity mit VIEW-Intent-Filter für die Schemes `nextcloud-calendar-fork` und `exp+nextcloud-calendar-fork`; drei Widget-Receiver (`.widget.Calendar{Small,Medium,Large}Widget`) mit `APPWIDGET_UPDATE` + der Click-Action **`com.custom.nextcloudcalendar.WIDGET_CLICK`** (vom react-native-android-widget-Plugin aus dem Package-Namen abgeleitet); `RNWidgetCollectionService` (`BIND_REMOTEVIEWS`).
- **Widget-Plattform-Split**: `package.json` schließt `expo-widgets` vom Android-Autolinking aus (`expo.autolinking.android.exclude`) — expo-widgets ist hier iOS-only (WidgetKit-Widget `NextcloudCalendarWidget` + Live Activity). Android-Homescreen-Widgets kommen von **react-native-android-widget** (Plugin-Konfiguration in `app.config.ts:108-150`, drei Widgets, `updatePeriodMillis` 1800000 = 30 min). Der Headless-Renderer (`widgetTaskHandler` in `src/features/widget/surfaces/homeWidget/homeWidget.android.tsx`) liest eine vorberechnete Snapshot-Timeline aus der Widget-MMKV (`readAgendaSnapshot` wählt den Eintrag mit `atIso <= now`), sodass Widgets ohne Daten-Resync durch den Tag "weiterlaufen"; Event-Chips deep-linken per `OPEN_URI` auf `nextcloud-calendar-fork://event/<uid>`.
- **modules/live-updates**: siehe Abschnitt 13; Gradle-Namespace `expo.modules.liveupdates` (bewusst nicht ans App-Package gebunden); Build-Helfer `yarn build:live-updates`.
- **Patches** (`patches/`, via `postinstall` = patch-package): `@expo+ui+57.0.7` (Swift-Compile-Fix), `@morrowdigital+watermelondb-expo-plugin+2.3.3` (Android-Mod neutralisiert), `@nozbe+watermelondb+0.28.0` (16-KB-Page-Size-Linkerflags), `expo-modules-jsi+57.0.3` (Swift-6-Concurrency), `expo-widgets+57.0.6` (Live-Activity `widgetURL`).

## 15. Bekannte Eigenheiten / Caveats

- **`index.ts` wird umgangen**: `package.json` `"main": "expo-router/entry"` lädt den Library-Entry direkt; das Root-`index.ts` (und damit `registerWidgetEntry()`, die Registrierung des Android-`widgetTaskHandler`) wird nie ausgeführt. Für funktionierende Android-Widgets müsste `main` auf `./index.ts` zeigen — oder verifiziert werden, dass die Widgets dennoch rendern. Der Background-Task selbst wird davon unabhängig definiert (Modul-Import-Kette über `useWidgetSync`).
- **Auth-Gate ist weich**: nur der Redirect in `app/index.tsx`; `/(tabs)/...` und `/event/...` sind bei 0 Accounts per Deep-Link erreichbar; mehrere Screens nutzen `activeAccount!`-Non-Null-Assertions (Mutationen early-returnen aber bei fehlendem Account). Kein `+not-found.tsx`.
- **Delta-Sync ist toter Code**: `syncCalendarDelta`/`syncCollection` (RFC 6578) sind vollständig implementiert und getestet, haben aber keinen Produktiv-Aufrufer — der Live-Sync ist reine Fenster-Reconciliation.
- **Keine Konflikterkennung**: kein etag/If-Match; `PUT` unconditional, `MOVE` mit `Overwrite:T` — konkurrierende Server-Edits werden überschrieben. `eventUnchanged` vergleicht `organizer_email`, `talk_url`, `alarm_minutes`, `is_recurring` nicht — Server-Änderungen nur an diesen Feldern aktualisieren bestehende lokale Rows nicht.
- **Löschungen propagieren nur im aktiv betrachteten Monatsfenster** (`deleteMissing=true`); Prefetch und Background-Sync löschen nicht — serverseitig gelöschte Events können in nicht geöffneten Monaten lokal liegen bleiben.
- **Regex-XML-Parsing** setzt Nextclouds exakte Namespace-Präfixe voraus; ein Server mit anderen Präfixen liefert stillschweigend null Kalender/Events. Ein einziger fehlschlagender Kalender blockiert den gesamten Event-Sync (`settleAllOrThrow`), der Fehler wird von Aufrufern verschluckt.
- **tsdav ist Dead Weight** (deklariert, nie importiert); ebenso `src/features/calendar/components/CalendarLegend.tsx` (nirgends importiert) und `sameDisplayedEvent.ts` (nur vom Test referenziert).
- **Sicherheits-/Storage-Details**: App-Passwort als Klartext-Feld im SecureStore-JSON; alles andere (Account-IDs, aktive ID, Avatare, Zustand-Blobs) in unverschlüsselter MMKV; aktive Account-ID doppelt persistiert (Drift möglich); AsyncStorage-Migrations-Flag wird auch bei Fehlschlag gesetzt.
- **Duplizierte Konstanten, die synchron bleiben müssen**: Scheme in `app.config.ts` + `APP_SCHEME` (`src/features/widget/core/types.ts:2`) + getracktes AndroidManifest; `WIDGET_MMKV_ID` + iOS-App-Group; Widget-Theme in `core/theme.ts` + Inline-Kopien in `homeWidget.ios.tsx`/`liveActivity.ios.tsx`; Splash-Farbe `#109be6` in `app.config.ts` + `FakeSplash.tsx`.
- **Verbleibende Upstream-Reste im Fork**: `app/(tabs)/settings/about.tsx:10-11` (GitHub-/Issues-URLs zeigen auf SoluceTechnologies), `eas.json` `submit.production` (Upstream `ascAppId`/`appleTeamId`), `CITATION.cff` (Upstream-Titel/-Repo, Lizenzangabe Apache-2.0 im Widerspruch zur GPL-3.0-`LICENSE`), `fastlane/metadata/android/*/changelogs/1.txt` (Upstream-Release-Links), PRODID in `src/utils/ics.ts`, `.release-it.json` bumpt ein nicht existierendes `app.json`, `modules/live-updates/LICENSE` (Soluce-Copyright). EAS ist bewusst entkoppelt: `eas init` nötig, bevor EAS-Builds funktionieren (Kommentar in `app.config.ts:52-53`).
- **UI-Eigenheiten**: alle drei Kalenderansichten bleiben gleichzeitig gemountet (`ViewLayer`); AgendaView zeigt nur heute..+120 Tage (keine Vergangenheit); `Typography color='secondary'` ist `colors.text` mit 0.5 Opacity, nicht `textSecondary`; NativeTabs-Umschaltung hängt an der unstable API + iOS ≥ 26; Settings-Stack wird bei Tab-Blur hart resettet; `scheduleEventAlerts` cancelt alle Notifications app-weit; i18next bootet immer mit `en` und wechselt erst per `useLanguageSync` (kurzer Englisch-Flash möglich).

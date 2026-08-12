# CUSTOMIZATION.md — Wo ändere ich was?

> **Stand des Forks:** basiert auf Upstream-Commit `692342f` (SoluceTechnologies/nextcloud-calendar-mobile, 2026-08).
> Stack: Expo SDK 57 / React Native 0.86, expo-router, WatermelonDB, Zustand, MMKV, ical.js, i18next.
> Hinweis: `tsdav` steht zwar in `package.json`, wird aber nirgends importiert — alle CalDAV-Requests sind handgeschrieben (raw `fetch`).

**Ist-Zustand der Fork-Identität** (teilweise umbenannt, Package-ID noch temporär):

| Wert | Aktuell | Wo |
|---|---|---|
| App-Name | `Nextcloud Calendar Fork` | `app.config.ts:14` |
| slug / scheme | `nextcloud-calendar-fork` | `app.config.ts:15-16` |
| Android package | `com.custom.nextcloudcalendar` | `app.config.ts:39` |
| iOS bundleIdentifier | `com.custom.nextcloud-calendar` | `app.config.ts:26` |
| App Group (iOS) | `group.com.custom.nextcloud-calendar` | `app.config.ts:34` |
| EAS-Projekt | **entfernt** — `eas init` nötig | Kommentar `app.config.ts:52-53` |
| Version | `1.5.0` → versionCode `10500` | `package.json:3` + `app.config.ts:11` |

---

## 1. Branding ändern

### 1.1 App-Name

| Stelle | Datei |
|---|---|
| Expo-Name | `app.config.ts` → `name` (Zeile 14) |
| iOS-Anzeigename | `app.config.ts` → `ios.infoPlist.CFBundleDisplayName` (Zeile 29) |
| iOS-Widget | `app.config.ts` → expo-widgets-Plugin `displayName` (Zeile 93) |
| Android-Widgets | `app.config.ts` → react-native-android-widget-Plugin `label` (Zeilen 114/126/138) |
| About-Screen | i18n-Keys `settings.about.name` / `settings.about.description` in **allen 8** `src/locales/*.json` (en.json:183-184) |
| ICS-Signatur | `src/utils/ics.ts:4` → `PRODID = '-//Nextcloud Calendar Mobile//EN'` (wird in jedes erzeugte Event geschrieben) |
| GitHub-Links | `app/(tabs)/settings/about.tsx:10-11` → `GITHUB_URL` / `ISSUES_URL` (zeigen noch auf Upstream!) |

Interne Widget-Namen (müssen zwischen Config und Code synchron bleiben, sind aber nicht nutzersichtbar):
`NextcloudCalendarWidget` (`app.config.ts:92` ↔ `src/features/widget/surfaces/homeWidget/homeWidget.ios.tsx`),
`CalendarSmall/Medium/LargeWidget` (`app.config.ts:113/125/137` ↔ `WIDGET_NAMES` in `homeWidget.android.tsx`),
`NextcloudCalendarLiveActivity` (`liveActivity.ios.tsx`).

Rest-Branding (nur relevant, falls Workflows/Store genutzt werden): `CITATION.cff` (Upstream-Titel/-Autoren, widerspricht mit "Apache-2.0" der GPL-3.0-LICENSE), `fastlane/metadata/android/*/` (Changelogs verlinken Upstream-Releases), APK-Artefaktname `NextcloudCalendar-v<version>.apk` in `.github/workflows/expo.yml` + `release.yml`.

### 1.2 Endgültige Package-ID

Alle Stellen, die **im Lockstep** geändert werden müssen:

| Wert (aktuell) | Datei |
|---|---|
| `com.custom.nextcloud-calendar` (iOS bundleIdentifier) | `app.config.ts:26` |
| `group.com.custom.nextcloud-calendar` (iOS App Group / entitlements) | `app.config.ts:34` |
| `com.custom.nextcloudcalendar` (Android package) | `app.config.ts:39` |
| `com.custom.nextcloud-calendar.ExpoWidgetsTarget` + `groupIdentifier` | `app.config.ts:88-89` (expo-widgets-Plugin) |
| `WIDGET_MMKV_ID = 'group.com.custom.nextcloud-calendar'` | `src/features/widget/storage/widgetStore.ts:6` — muss der iOS App Group entsprechen; bei Abweichung splittet sich der Widget-Storage **stumm** (alte Daten verwaist, kein Fehler) |
| `APP_SCHEME = 'nextcloud-calendar-fork'` | `src/features/widget/core/types.ts:2` — hartcodiertes Duplikat von `scheme` in `app.config.ts:16`; baut alle Widget-Deep-Links (`eventDeepLink()` / `openAppLink()`) |

Im generierten `android/`-Verzeichnis stecken die IDs zusätzlich in:

- `android/app/build.gradle:90,92` — `namespace` / `applicationId`
- `android/app/src/main/AndroidManifest.xml:31-32` — Deep-Link-Schemes `nextcloud-calendar-fork` / `exp+nextcloud-calendar-fork`
- `android/app/src/main/AndroidManifest.xml:38,45,52` — Widget-Click-Actions `com.custom.nextcloudcalendar.WIDGET_CLICK`
- Kotlin/Java-Quellen unter `android/app/src/main/java/com/custom/nextcloudcalendar/` (MainActivity.kt, MainApplication.kt, `widget/Calendar*Widget.java`)

**Vorgehen:** Werte in `app.config.ts` + `widgetStore.ts` + `types.ts` ändern, dann `npx expo prebuild --clean` — das regeneriert `android/` (Manifest, build.gradle, Widget-Receiver, mipmaps) vollständig aus der Config. Die IDs niemals nur in `android/` patchen.

Nicht verwechseln:

- `com.nextcloud.talk2` in `app/event/[uid].tsx` ist die **externe** Nextcloud-Talk-App (Intent-Ziel) — nicht umbenennen. Dazu gehört `LSApplicationQueriesSchemes: ['nextcloudtalk']` in `app.config.ts:30`.
- `expo.modules.liveupdates` in `modules/live-updates/` — neutraler Modul-Namespace, kann bleiben.

Falls EAS/Store-Builds geplant: `eas init` ausführen und in `eas.json` den `submit.production`-Block ersetzen — dort stehen noch die Upstream-Apple-IDs (`ascAppId: 6766678698`, `appleTeamId: M4HUX42J7K`, Play-Track `production`).

### 1.3 Icon

| Asset | Zweck |
|---|---|
| `assets/icon.png` | Haupt-Icon (`app.config.ts:21`), auch About-Screen (`require` in `about.tsx:23`) und Android-Widget-Preview (`previewImage` in `app.config.ts`) |
| `assets/adaptive-icon.png` | Android Adaptive Icon Foreground; Hintergrundfarbe `#109be6` in `app.config.ts:43` |
| `assets/icon-ios.icon/` | Apple-Icon-Composer-Bundle (Verzeichnis mit `Assets/icon.png` + `icon.json`), referenziert in `app.config.ts:27` |
| `assets/favicon.png` | Web (`app.config.ts:49`) |

Nach Icon-Tausch `npx expo prebuild --clean`, damit die Android-mipmaps (`android/app/src/main/res/mipmap-*/`) neu erzeugt werden.

### 1.4 Splash Screen — drei Stellen

1. `assets/splash-icon.png` — die Grafik.
2. `app.config.ts:69-79` — expo-splash-screen-Plugin (`imageWidth: 200`, `backgroundColor: '#109be6'` für hell **und** dunkel) → nativer Splash.
3. `src/components/FakeSplash.tsx` — React-Komponente, die nach dem nativen Splash bis App-Ready angezeigt wird; **hartcodiertes** `#109be6` und dieselbe Grafik (200×200). Muss manuell mit dem Plugin synchron gehalten werden, sonst "springt" der Splash beim Übergang.

### 1.5 Farben / Theme

- **Zentrale Paletten:** `src/theme.ts` — `lightColors` / `darkColors` (Zeilen 94-142) mit ~21 semantischen Tokens; `primary` ist `#109be6` (hell) / `#29aef7` (dunkel); dazu `spacing`/`radius`/`typography`. Aufgelöst in `src/components/Providers.tsx` (`themePreference` aus `settingsStore` + `useColorScheme`), konsumiert überall via `useTheme()` von expo-router. Kein styled-components/tamagui/nativewind.
- **Widget-Palette:** `src/features/widget/core/theme.ts`. Achtung: die iOS-Widget-Dateien (`homeWidget.ios.tsx`, `liveActivity.ios.tsx`) müssen self-contained sein und halten **Inline-Duplikate** der Palette — Farbänderungen also an drei Stellen nachziehen.
- **Hartcodierte Farben abseits des Themes** (beim Rebranding mitziehen):

| Farbe | Datei |
|---|---|
| `#109be6` Splash-Hintergrund | `src/components/FakeSplash.tsx` + `app.config.ts` (splash, adaptiveIcon) |
| `'red'` Now-Indicator | `src/features/calendar/components/DayColumn.tsx` |
| `#fff` All-Day-Chips / Today-Kreis | `src/features/calendar/components/TimeGridHeader.tsx` |
| `#ffffff` FAB-Icon | `src/features/calendar/components/CalendarFab.tsx` |
| `#1976d2` Default-Kalenderfarbe (Server ohne Farbe) | `src/services/nextcloud/caldav.ts` (fetchCalendars) |

---

## 2. Kalenderansichten ändern

Es existieren genau **fünf** Views (`VIEW_MODES` in `src/features/calendar/constants.ts`): `month`, `week`, `3days`, `day`, `schedule`. Woche/3-Tage/Tag sind **eine** Komponente mit variabler Spaltenzahl.

| Ansicht / Aufgabe | Datei(en) |
|---|---|
| Screen-Komposition | `app/(tabs)/calendar/index.tsx` — mountet alle Views gleichzeitig in `ViewLayer`-Wrappern (Sichtbarkeits-Toggle statt Unmount); Event-Press → `/event/[uid]`, Slot-Press/FAB → `/event/new?date=…` |
| Monatsansicht | `src/features/calendar/components/MonthDayView.tsx` — InfinitePager aus Monatsgrids (max. 3 Event-Dots pro Tag, Grid = 44 % Bildschirmhöhe) + FlatList der Tages-Events darunter; Long-Press auf Tag → neues Event |
| Woche / 3-Tage / Tag | `src/features/calendar/components/TimeGridView.tsx` (Container: vertikaler Scroll, Pinch-Zoom, zwei per Shared Value synchronisierte Pager) → `TimeGridPage.tsx` (Seiten-Layout + Drag) → `DayColumn.tsx` (Spalte, Now-Line, Slot-Tap); Spaltenzahl via `daysPerPage()` in `utils/grid.ts` (7/3/1) |
| Grid-Zubehör | `TimeGridHeader.tsx` (Tageszeile + All-Day-Chips), `GridLines.tsx` (Stundenlinien), `HourRail.tsx` (Stundenbeschriftung links) |
| Agenda ("schedule") | `src/features/calendar/components/AgendaView.tsx` — SectionList heute + 120 Tage (`DAYS_AHEAD`); Vergangenheit ist nicht erreichbar |
| View-Umschaltung | `src/features/calendar/components/CalendarTopBar.tsx` (Chips, i18n-Map `VIEW_MODE_KEYS`) → `useCalendarNavigation.switchMode`; persistiert als `viewMode` in `src/stores/calendarStore.ts` (Default `'week'`) |
| Eventblock | `TimeGridEvent.tsx` (Karte, Fontgrößen skalieren mit Zoom); Textkontrast: `utils/eventInk.ts` |
| Überlappungs-Layout | `utils/eventLayout.ts` — Greedy-Spaltenzuweisung pro Überlappungsgruppe |
| Drag & Resize | `hooks/useEventDrag.ts` (Longpress-Pan), `utils/dragMath.ts` (Snapping), `utils/hitTest.ts` (Resize-Zonen), `components/DragGhost.tsx`; Commit über `useUpdateEvent` mit Recurrence-Scope-Prompt (`utils/moveEventScope.ts`) |
| Pinch-Zoom | `hooks/useZoom.ts` + `utils/zoomAnchor.ts`; persistiert als `hourRowHeight` in `calendarStore` |
| Kalender-Drawer | `components/CalendarDrawer.tsx` + `CalendarDrawerRow.tsx` + `hooks/useCalendarDrawer.ts` — handgebauter Animated-Overlay-Drawer (Sichtbarkeits- und Notification-Toggles pro Kalender) |
| Daten | `hooks/useCalendarData.ts` — 3-Monats-Fenster aus `utils/range.ts`, filtert `hiddenCalendarIds`, triggert Sync |

**Wichtige Stellschrauben:**

| Konstante | Wert | Datei |
|---|---|---|
| `DAYS_AHEAD` (Agenda-Horizont) | 120 | `AgendaView.tsx` |
| `SNAP_MINUTES` (Drag-Raster) | 15 | `utils/dragMath.ts` |
| Longpress bis Drag | 300 ms | `hooks/useEventDrag.ts` |
| Resize-Zonen / Mindestdauer für Resize-Griffe | 20 % / 45 min | `utils/hitTest.ts` |
| `MIN_EVENT_WIDTH_PCT` (Überlappung) | 40 | `utils/eventLayout.ts` |
| Zoom-Grenzen / Default | 30–200 / 60 px | `utils/zoomAnchor.ts`, `calendarStore.ts` |
| Drawer-Breite | max 320 / 86 % | `constants.ts` |
| Rail-/Header-Maße | — | `utils/grid.ts` (`HOUR_RAIL_WIDTH`, `DAY_HEADER_HEIGHT`, All-Day-Chip-Konstanten) |

**Neue View hinzufügen:** `ViewMode`-Union in `src/types/index.ts` + `VIEW_MODES` in `constants.ts` + `VIEW_MODE_KEYS` in `CalendarTopBar.tsx` (plus i18n-Keys in 8 Locales) + Rendering-Zweig in `app/(tabs)/calendar/index.tsx`.

**Vorsicht:** `utils/grid.ts` nutzt bewusst rohe Date-Mathematik statt dayjs (Performance; Kommentare im Code); `TimeGridView.tsx` und `useCalendarData.ts` haben absichtlich unvollständige Effect-Deps — naives "Fixen" erzeugt Pager-Remounts bzw. Doppel-Syncs. `CalendarLegend.tsx` ist toter Code (nirgends importiert). All-Day-Events und Teilstücke mehrtägiger Events sind nicht draggable.

---

## 3. Event Editor ändern

| Aufgabe | Datei(en) |
|---|---|
| Erstellen | `app/event/new.tsx` (liest `?date=`-Param) → `EventForm` → `useCreateEvent` |
| Bearbeiten | `app/event/edit/[uid].tsx` (liest `?scope=` = `this` \| `thisAndFollowing` \| `all`) → `useUpdateEvent`; Kalenderwechsel ist bei wiederkehrenden Events gesperrt |
| Detail / Löschen | `app/event/[uid].tsx` — Zeiten, Erinnerung, Kalender, Ort (mit Copy), Talk-Join-Button, Teilnehmer, Delete mit Scope-Prompt; Edit/Delete versteckt bei read-only/abonnierten Kalendern |
| Formular (Felder + Validierung) | `src/features/event/components/EventForm.tsx` — Titel, Kalender-Chips (Default: Kalender mit Slug `personal`), All-Day-Toggle, Start/Ende, Ort, Beschreibung, Teilnehmer, Recurrence, Alert, Talk |
| Mutations-Logik | `src/features/event/hooks/useMutateEvent.ts` — optimistisch (lokale DB zuerst) mit Rollback aus Snapshot; ICS-Erzeugung in `src/utils/ics.ts` |
| Scope-Prompt | `src/features/event/recurrenceScope.ts` (Alert-Dialog) + `src/features/calendar/utils/moveEventScope.ts` (Entscheidungslogik) |

**Datum/Uhrzeit-Picker:** `@react-native-community/datetimepicker`, komplett in `EventForm.tsx`. iOS: inline "compact"-Picker (`datetime` bzw. `date` bei All-Day); Android: zweistufiger Modal-Flow (erst Datum, dann Zeit; All-Day überspringt die Zeit). Ende wird automatisch konsistent gehalten (Start + 1 h); Ende ≤ Start wird abgewiesen.

**Teilnehmer:** nur einfache E-Mail-Strings (Chip-Liste mit Entfernen-Button, Validierung = enthält `@`). **Nicht vorhanden:** Kontakt-Suche, Rollen, RSVP/PARTSTAT-Bearbeitung. Organizer ist nicht editierbar — abgeleitet in `src/features/event/utils/organizer.ts`, beim Update vom Server-Event übernommen.

**Wiederholungen — was tatsächlich unterstützt wird:**

- UI (`src/features/event/components/RecurrencePicker.tsx`): nur FREQ None/Daily/Weekly/Monthly/Yearly; BYDAY-Wochentage **nur** bei Weekly; Interval immer 1.
- Round-Trip beim Editieren (`src/features/calendar/utils/parseRrule.ts`): FREQ/INTERVAL/BYDAY/COUNT/UNTIL. Jede komplexere Server-RRULE (BYMONTHDAY, BYSETPOS, …) → Parser liefert `undefined`, die App bietet dann **nur** "dieser Termin" (Exception) an und der Editor zeigt keine Wiederholung an.
- Scopes vollständig implementiert in `useMutateEvent.ts`: `this` = EXDATE im Master + Exception-VEVENT (`{uid}-exc-<ts>.ics`); `thisAndFollowing` = RRULE-UNTIL-Truncation + neue Serie unter frischer UID; `all` = Master-Rewrite (mit SEQUENCE-Bump und Erhalt fremder Properties via `extractExtraVeventLines`).
- **Nicht vorhanden im UI:** Intervalle > 1, End-Bedingungen (COUNT/UNTIL), monatliche/jährliche BYDAY-Regeln, EXDATE-Verwaltung.

**Erinnerungen:** genau **ein** Alarm pro Event (`alarmMinutes`). Auswahl in `src/features/event/components/AlertPicker.tsx` mit festen Offsets aus `src/features/notifications/alerts.ts` (`TIMED_ALERTS` / `ALL_DAY_ALERTS`; All-Day feuert 09:00 lokal N Tage vorher). Umsetzung als rein lokale expo-notifications in `src/features/notifications/scheduleAlerts.ts` (max. 60 Alerts über 30 Tage; cancelt vorher **alle** geplanten Notifications der App). Grenzen: mehrere VALARMs vom Server kollabieren zu einem und gehen beim Editieren verloren; es gibt **kein** Notification-Tap-Handling (Tippen öffnet nur die App, nicht das Event) und **keinen** Push.

**Talk-Räume:** `src/features/event/components/TalkToggle.tsx` (nur sichtbar bei `capabilities.talkEnabled`) → `createTalkRoom` in `src/services/nextcloud/talk.ts`; Raum-URL landet in LOCATION + Beschreibung. Beim Editieren startet der Toggle immer aus — erneutes Aktivieren erzeugt einen zweiten Raum.

---

## 4. Nextcloud / CalDAV

### 4.1 Login & Accounts

- **Login-Screen:** `app/(auth)/setup.tsx` — manuelles Formular (Server-URL, Username, App-Passwort) plus QR-Scan (`src/features/account/components/QrLoginScanner.tsx`; Payload-Parser `src/features/account/utils/ncLoginUrl.ts` für `nc://login/…` und `nc://onetime-login/…`). One-Time-Token werden via `exchangeOneTimeToken` (`src/services/nextcloud/nextcloud.ts`) gegen ein permanentes App-Passwort getauscht. **Kein Login Flow v2** (kein `/login/v2`-Polling), kein OAuth.
- **Server-URL-Handling:** Normalisierung in `setup.tsx` `connectWith()` (trim, trailing slash entfernen, `https://` erzwingen); danach `validateCredentials` in `src/services/nextcloud/caldav.ts` — PROPFIND auf `/remote.php/dav/` → `current-user-principal` → `calendar-home-set` → `davUserId` (Fallback: Username).
- **Credential-Speicherung** (`src/services/nextcloud/auth.ts` + `src/storage/index.ts`):

| Was | Wo | Key |
|---|---|---|
| Account-JSON inkl. App-Passwort | expo-secure-store | `account_<uuid>` |
| Account-ID-Liste | MMKV (unverschlüsselt, Default-Instanz) | `account_ids` |
| Aktive Account-ID | MMKV **und** Zustand-Store | `active_account_id` + `account-store` |
| Avatar-Cache | MMKV | `avatar:<accountId>` |

  Die aktive ID ist **doppelt** persistiert — beide Schreibpfade (`setActiveAccountId` aus `auth.ts` + `useAccountStore.setActiveAccountId`) immer zusammen bedienen.
- **Reconnect bei 401/403:** `src/features/account/hooks/useAccountAuthStatus.ts` + `AccountReconnectForm.tsx` (neues App-Passwort, auch per QR). Account-Löschung ist der einzige "Logout" (`useDeleteAccount` in `src/features/account/hooks/useMutateAccount.ts`); das App-Passwort wird serverseitig **nicht** revoked.

### 4.2 CalDAV-Requests (Service-Schicht)

| Datei | Inhalt |
|---|---|
| `src/services/nextcloud/caldav.ts` | Alle CalDAV-Calls über raw `fetch` mit Basic Auth (`davFetch`, 20 s Timeout): PROPFIND (Kalenderliste), REPORT calendar-query/multiget/sync-collection (Events), PUT/MOVE/DELETE (Mutationen), `fetchEventIcs`. XML-Bodies als Template-Strings, 207-Antworten per **Regex** geparst (keine XML-Lib) |
| `src/services/nextcloud/nextcloud.ts` | OCS-API: `exchangeOneTimeToken`, `fetchUserInfo`, `fetchCapabilities` (Talk + Calendar-App) |
| `src/services/nextcloud/talk.ts` | `createTalkRoom` (spreed API v4) |
| `src/services/nextcloud/auth.ts` | Account-Persistenz (kein Netzwerk) |
| `src/services/shared/errors.ts` | `HttpError`, `describeMutationError` (Status → i18n-Fehlermeldung) |
| `src/services/shared/network.ts` | Online-Status via expo-network (`useIsOnline`) |
| `src/utils/caldav-parse.ts` | ICS → `CalendarEvent` via ical.js; RRULE-Expansion (max. `MAX_OCCURRENCES = 1000`), Occurrence-UIDs `uid_occ_<ts>`, VALARM → `alarmMinutes` |
| `src/utils/ics.ts` | Handgeschriebener ICS-Serializer: `buildIcs`, `buildAllDayIcs`, `buildExceptionIcs`, `injectExdate`, `truncateRruleUntil`, `shiftIcsDates` |

### 4.3 Synchronisation

Local-first: die UI liest ausschließlich reaktiv aus WatermelonDB (`src/database/useEvents.ts`, `useCalendars.ts`, `useEventByUid.ts`; Schema v3 in `src/database/schema.ts` + `migrations.ts`, zwei Tabellen `events`/`calendars`). Sync-Logik in `src/database/sync.ts`:

- `syncCalendars` — Kalenderliste per PROPFIND-Reconcile.
- `syncEvents` — Voll-Reconcile über ein 3-Monats-Fenster (`src/features/calendar/utils/range.ts`), Schlüssel `accountId|calendarId|uid`; Recurrences liegen vor-expandiert als eine Zeile pro Occurrence.
- `syncCalendarDelta` (RFC-6578-Sync-Token) ist vollständig implementiert, aber **toter Code** — wird nirgends aufgerufen.

**Sync-Trigger:**

| Trigger | Datei |
|---|---|
| App-Start | `src/hooks/useAppInitialization.ts` |
| 30-s-Poll der Kalenderliste | `src/hooks/useCalendars.ts` (`LIVE_POLL_MS = 30000`) |
| Monats-/Account-Wechsel (+ Prev/Next-Prefetch) | `src/features/calendar/hooks/useCalendarData.ts` |
| Background-Task ≥ 15 min (7-Tage-Fenster, aktualisiert auch Widgets + Alerts) | `src/features/widget/sync/backgroundSync.ts` (`widget-agenda-refresh`) |

Kein Pull-to-Refresh, kein Push, kein Etag-/Konfliktabgleich (last-writer-wins). Schutz lokaler Edits gegen laufende Pulls: `markLocalWrite`-Epoch-Guard in `sync.ts` — der frühe Abbruch dort ist tragend, nicht entfernen. Löschungen propagieren nur im aktiv betrachteten Monatsfenster (`deleteMissing=true`).

---

## 5. Neue Features hinzufügen

**Architektur-Muster des Repos:**

1. **Feature-Modul** unter `src/features/<name>/` mit `components/`, `hooks/`, `utils/` (Vorbilder: `src/features/event/`, `src/features/settings/`, `src/features/widget/`).
2. **Route** unter `app/` (expo-router, file-based). Settings-Unterseite: neue Datei in `app/(tabs)/settings/` mit `SettingsPage`-Wrapper (`src/features/settings/components/SettingsPage.tsx`) + `SettingsLink`-Eintrag im Hub `app/(tabs)/settings/index.tsx`. Vollbild-Screens (wie `app/event/*`) liegen außerhalb der Tabs auf dem Root-Stack.
3. **State:** Zustand-Store-Muster nach `src/stores/settingsStore.ts` — `create(persist(...))` mit `createJSONStorage`, Storage-Adapter `legacyBackedStorage`/`zustandStorage` (`src/stores/legacyStorage.ts`, `src/storage/index.ts`), `partialize` für persistierte Felder. **Wichtig:** neue Stores müssen in `src/hooks/useAppInitialization.ts` mit-rehydriert werden (`persist.rehydrate()`), sonst laufen sie beim Start mit Defaults.
4. **DB-Migration (WatermelonDB):** `src/database/schema.ts` (Version erhöhen) + Migrationsschritt in `src/database/migrations.ts` + `@field` im Model (`src/database/models/`) + Spalte in `src/database/observedColumns.ts` (sonst kein Re-Render bei Änderung!) + Mapping in `src/database/mappers/event.ts` sowie `writeEvent`/`eventUnchanged` in `src/database/sync.ts`.
5. **Service-Erweiterung:** neue Server-Calls in `src/services/nextcloud/` nach Vorbild von `caldav.ts`/`nextcloud.ts` (Basic Auth über den Account, Fehler durch `httpErrorFrom`/`describeMutationError`).
6. **i18n:** jeden neuen Key in **alle 8** Dateien `src/locales/{en,de,es,fr,it,nl,pt,ru}.json` eintragen — der Parity-Test `__tests__/i18n/parity.test.ts` schlägt sonst fehl. Sprachliste/Registrierung: `src/utils/i18n.ts`.
7. **UI-Bausteine:** vorhandene Primitives aus `src/ui/components/` (Typography, Stack, Button, Chip, Item, List, Sheet, Select, Toggle, TextField, DateField, …) statt eigener Basiskomponenten.
8. **Tests:** unter `__tests__/` nach Bereich (`api/`, `app/`, `components/`, `database/`, `features/`, `hooks/`, `i18n/`, `store/`, `utils/`); Mocks existieren bereits in `jest.setup.js` und `__mocks__/` (react-native-mmkv, expo-widgets). Ausführen: `yarn tsc --noEmit && yarn jest`.

**Beispiel-Skizze A — neues Settings-Toggle:**

1. Feld + Setter in `src/stores/settingsStore.ts` ergänzen und in `partialize` aufnehmen.
2. Toggle-Zeile auf einer bestehenden Settings-Seite einhängen (`app/(tabs)/settings/accessibility.tsx` als einfachste Vorlage; `Toggle`/`Item` aus `src/ui/components`) — oder eigene Seite nach Muster in Punkt 2 oben.
3. i18n-Keys in allen 8 Locales anlegen.
4. Konsumieren via `useSettingsStore((s) => s.meinFeld)` an der Zielstelle.
5. Store-Test unter `__tests__/store/`.

**Beispiel-Skizze B — neues Feld im Event-Editor (z. B. eine URL):**

1. Typen erweitern: `CalendarEvent` + `CreateEventInput` in `src/types/index.ts`.
2. DB: Schema-Version v4 + Migration + Feld im Event-Model + `observedColumns.ts` + Mapper (`src/database/mappers/event.ts`) + `writeEvent`/`eventUnchanged` in `sync.ts`.
3. ICS-Round-Trip: Property lesen in `src/utils/caldav-parse.ts` und serialisieren in `src/utils/ics.ts` — Achtung: `WRITER_MANAGED_PROPS` in `caldav-parse.ts` steuert, welche Properties beim Master-Rewrite erhalten bleiben; das neue Feld dort einordnen.
4. UI: Formularfeld in `src/features/event/components/EventForm.tsx` + Anzeige im Detail `app/event/[uid].tsx`.
5. Mutation: Feld durch `useMutateEvent.ts` durchreichen (`eventFromInput`, Build-Parameter).
6. i18n-Keys + Tests (`__tests__/features/`, `__tests__/utils/`).

---

## 6. Was man NICHT anfassen sollte

- **`android/` (generiert):** wird von `npx expo prebuild --clean` komplett aus `app.config.ts` + Config-Plugins erzeugt (inkl. `AndroidManifest.xml`, `build.gradle`, Widget-Receiver-Klassen, mipmaps). Änderungen gehören in die Config, nicht in `android/` — die Release-Workflows (`.github/workflows/expo.yml`) löschen `android/`/`ios/` vor jedem EAS-Build ohnehin (`rm -rf android ios`), manuelle Edits dort shippen also nie.
- **`patches/`** — fünf build-kritische patch-package-Patches (`@expo/ui` Swift-Fix, watermelondb-expo-plugin No-Op, watermelondb 16-KB-Page-Alignment, expo-modules-jsi Swift-6-Fixes, expo-widgets Live-Activity-URL), angewendet via `postinstall`. Nur über `npx patch-package <pkg>` regenerieren, nie manuell editieren oder löschen.
- **`yarn.lock`** — nie manuell; Yarn 4.5.3 ist via `packageManager` gepinnt (corepack).
- **In `package.json`:** `"main": "expo-router/entry"`, der Block `expo.autolinking.android.exclude: ['expo-widgets']` (expo-widgets ist hier iOS-only; Android-Widgets kommen von react-native-android-widget — Entfernen bricht den Android-Build), der eingebettete `jest`-Block und das `postinstall`-Script.
- **Config-Shims:** `metro.config.js` (`unstable_enablePackageExports = false`), `babel.config.js` (`hermes-v0`-Transform-Profil + worklets-Plugin), `react-native.config.js` (simdjson-iOS-Ausschluss) — Workarounds für konkrete Build-Probleme.
- **Tragende Code-Eigenheiten:** Epoch-Guard-Bail in `src/database/sync.ts` `syncEvents` (muss vor jedem `prepare*` bleiben, sonst crasht der Folge-Sync), rohe Date-Mathematik in `src/features/calendar/utils/grid.ts`, absichtlich unvollständige Effect-Deps in `TimeGridView.tsx`/`useCalendarData.ts`, Task-Definition auf Modulebene in `backgroundSync.ts` (Import-Kette über `src/features/widget/index.ts` nicht auflösen).
- **Identifier-Paare nur im Lockstep ändern:** `WIDGET_MMKV_ID` ↔ iOS App Group, `APP_SCHEME` ↔ `scheme` in `app.config.ts` ↔ Android-Manifest-Schemes (siehe Abschnitt 1.2).
- **`modules/live-updates/`** — lokales Kotlin-Expo-Modul mit neutralem Namespace `expo.modules.liveupdates`; beim Rebranding nicht umbenennen (unnötig und fehleranfällig).

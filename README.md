# Stufen – Mineraliensammlung

Eine schlichte iPhone-Web-App zum Katalogisieren einer Mineraliensammlung: Foto aufnehmen, Name, Art und Kaufdatum eintragen, Sammlung ansehen. Jedes Stück bekommt automatisch eine Inventarnummer (M0001, M0002, …).

## Deine Daten bleiben auf dem iPhone

Fotos und Angaben werden ausschließlich im Speicher der App auf dem jeweiligen Gerät abgelegt (IndexedDB im Browser). Es gibt keinen Server, kein Konto und keine Uploads. GitHub liefert nur den App-Code aus; deine Sammlung landet nie im Repository.

Wichtig:
- Die Daten gehören zum Gerät. Auf einem anderen iPhone ist die Sammlung leer.
- Wer die App vom Home-Bildschirm löscht oder in Safari die Website-Daten löscht, löscht auch die Sammlung.
- Fotos werden beim Speichern verkleinert (max. 1600 px), damit der Speicher nicht vollläuft.

## Auf dem iPhone installieren

1. In den Repository-Einstellungen unter **Settings → Pages** als Quelle **Deploy from a branch**, Branch **main**, Ordner **/ (root)** wählen und speichern.
2. Nach etwa einer Minute ist die App unter `https://th-spec-hh.github.io/Mineralien-App/` erreichbar.
3. Die Adresse in **Safari** öffnen, auf **Teilen** tippen und **Zum Home-Bildschirm** wählen.
4. Die App ab jetzt immer über das Symbol auf dem Home-Bildschirm starten. Sie läuft dann ohne Browserleiste und auch offline.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | Die drei Screens: Sammlung, Stück, Neues Stück |
| `styles.css` | Design (Farben, Schriften, Layout) |
| `app.js` | Bedienlogik, Fotoverarbeitung |
| `db.js` | Lokale Speicherung in IndexedDB |
| `sw.js` | Service Worker für den Offline-Betrieb (speichert nur App-Dateien) |
| `manifest.webmanifest`, `icons/` | Name und Symbol für den Home-Bildschirm |
| `fonts/` | Instrument Serif und JetBrains Mono (SIL Open Font License), lokal eingebunden |

Es gibt keinen Build-Schritt: Die Dateien werden so ausgeliefert, wie sie im Repository liegen.

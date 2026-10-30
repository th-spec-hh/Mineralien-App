# Stufen – Mineraliensammlung

Eine schlichte iPhone-Web-App zum Katalogisieren einer Mineraliensammlung: Foto aufnehmen, Name, Art und Kaufdatum eintragen, Sammlung ansehen. Jedes Stück bekommt automatisch eine Inventarnummer (M0001, M0002, …).

## Deine Daten bleiben auf dem iPhone

Fotos und Angaben werden ausschließlich im Speicher der App auf dem jeweiligen Gerät abgelegt (IndexedDB im Browser). Es gibt keinen Server, kein Konto und keine Uploads. GitHub liefert nur den App-Code aus; deine Sammlung landet nie im Repository.

Wichtig:
- Die Daten gehören zum Gerät. Auf einem anderen iPhone ist die Sammlung leer.
- Wer die App vom Home-Bildschirm löscht oder in Safari die Website-Daten löscht, löscht auch die Sammlung.
- Fotos werden beim Speichern verkleinert (max. 1600 px), damit der Speicher nicht vollläuft.

## Neutraler Hintergrund (KI)

Nach dem Fotografieren lässt sich mit **Hintergrund neutral** der Hintergrund des Fotos durch einen ruhigen Verlauf (Hell, Grau oder Dunkel) ersetzen. Das Freistellen übernimmt ein KI-Modell (ISNet über [@imgly/background-removal](https://github.com/imgly/background-removal-js)), das **direkt auf dem iPhone** im Browser läuft:

- Das Foto wird nirgends hochgeladen. Aus dem Netz kommt nur beim ersten Mal das KI-Modell (ca. 100 MB von staticimgly.com, am besten im WLAN). Danach liegt es im Cache und funktioniert auch offline.
- Das Originalfoto wird mitgesichert. Unter **Bearbeiten** lässt sich jederzeit ein anderer Hintergrund wählen oder mit **Original** zurückwechseln.
- Ein Bild braucht je nach iPhone einige Sekunden. Bei durchsichtigen oder stark spiegelnden Stufen kann der Rand ungenau werden.

`vendor/background-removal.mjs` ist die mit esbuild zu einer Datei gebündelte Bibliothek @imgly/background-removal 1.7.0 (AGPL-3.0, Lizenz in `vendor/LICENSE-background-removal.md`) samt onnxruntime-web 1.21.0 (MIT).

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
| `sw.js` | Service Worker für den Offline-Betrieb (speichert nur App-Dateien und das KI-Modell) |
| `vendor/` | Gebündelte Bibliothek für das Freistellen (siehe oben) |
| `manifest.webmanifest`, `icons/` | Name und Symbol für den Home-Bildschirm |
| `fonts/` | Instrument Serif und JetBrains Mono (SIL Open Font License), lokal eingebunden |

Es gibt keinen Build-Schritt: Die Dateien werden so ausgeliefert, wie sie im Repository liegen.

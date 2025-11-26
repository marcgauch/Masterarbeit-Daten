# Masterarbeit-Daten


## Mindmap
### Beötigt:
- Java
- nodejs
- plantuml (in Util abgelegt)

### Auführen
```bash
cd Masterarbeit-Daten/Mindmap
node converter.js
```

oder mit Parametern:
```bash
-keep-plantuml  # die plantuml Dateien werden nicht gelöscht. Hilfreich zum debuggen oder manuell anpassen
-generate-latex # Für alle Diagramme wird der zugehörige LaTeX-Code erstellt um die Bilder einzubetten. Die Ausgabe erfolgt über stdout.
-ignore-date    # Keine Elemente ausser Root werden eingefärbt
-debug          # Mehr Log. -keep-plantuml automatisch aktiviert
-help           # Listet alle Parameter auf. Es wird aber nichts generiert.
```
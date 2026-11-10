import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { kurzdatum } from "@/lib/format";
import type { GeneratedDocument } from "./typen";

/**
 * Der Weg vom freigegebenen Dokument zur PDF-Datei.
 *
 * Der Text wird hier **nicht** neu zusammengesetzt. Er kommt so aus der
 * Datenbank, wie ihn die Vorschau gezeigt hat, und wandert unverändert in die
 * Seite. Würde die App beim Export noch etwas ergänzen, hätte der Mandant
 * etwas anderes freigegeben als das, was er verschickt — und genau das ist der
 * Fehler, den die Freigabe verhindern soll.
 *
 * Deshalb liegt hier auch keine Vorlage im Sinne von „Briefkopf, Anrede,
 * Grußformel". Die Vorlage steht serverseitig und ist mit
 * `template_version` am Dokument vermerkt.
 */

/** Alles, was in HTML eine Bedeutung hätte, verliert sie hier. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Die Seite, die gedruckt wird.
 *
 * Bewusst nüchtern und ohne Bilder: das PDF geht möglicherweise an eine
 * Gegenseite oder an eine Kanzlei, und dort zählt Lesbarkeit, nicht die
 * Papieranmutung der App. Serifen, 10,5 pt, 2 cm Rand — ein Schriftstück.
 */
function seite(dokument: GeneratedDocument): string {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8" />
<style>
  @page { margin: 20mm; }
  body { font-family: Georgia, "Times New Roman", serif; font-size: 10.5pt; line-height: 1.45; color: #1c1a17; }
  pre { font-family: inherit; font-size: inherit; white-space: pre-wrap; word-wrap: break-word; margin: 0; }
  .fuss { margin-top: 6mm; padding-top: 4mm; border-top: 0.5pt solid #b9b2a5; break-inside: avoid;
          font-size: 8.5pt; color: #5f594e; }
</style></head>
<body>
<pre>${escapeHtml(dokument.body)}</pre>
<p class="fuss">Erstellt mit Recht &amp; Papier am ${kurzdatum(dokument.created_at)} ·
Vorlagenversion ${escapeHtml(dokument.template_version)} · Ersetzt keine Rechtsberatung.</p>
</body></html>`;
}

/**
 * Als PDF exportieren und dem System zum Weitergeben übergeben.
 *
 * Nur freigegebene Dokumente. Die Prüfung steht hier und nicht nur in der
 * Oberfläche, weil ein Entwurf, der einmal als Datei aus der App heraus ist,
 * nicht mehr zurückgeholt werden kann — und weil sonst jeder neue Aufrufpfad
 * die Regel erneut selbst kennen müsste.
 *
 * Ist auf dem Gerät nichts zum Teilen eingerichtet, wird das gesagt statt
 * still nichts zu tun.
 */
export async function alsPdfTeilen(dokument: GeneratedDocument): Promise<void> {
  if (!dokument.approved_at) {
    throw new Error("Bitte geben Sie das Dokument zuerst frei.");
  }

  const { uri } = await Print.printToFileAsync({ html: seite(dokument) });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Auf diesem Gerät lässt sich die Datei nicht weitergeben.");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: dokument.title,
  });
}

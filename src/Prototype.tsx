import { ArrowRightIcon, CheckCircledIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { Paperclip } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { BottomSheet, KeyboardTextarea, MobileScroll, useKeyboard, useKeyboardInsets } from "./mobile";

export default function Prototype() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [caseStarted, setCaseStarted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Radix moves focus into the sheet the moment it mounts, which would raise the
  // keyboard before the user asked for it. Armed on open, this swallows exactly
  // that one programmatic focus; a real tap disarms it in pointerdown first.
  const pendingAutoFocusRef = useRef(false);
  const keyboard = useKeyboard();
  const { keyboardDragging } = useKeyboardInsets();

  // The runtime lifts the sheet above the keyboard by setting `bottom`, which
  // lands in one frame while the keyboard itself glides in. `prototype.css`
  // eases the sheet to match, except during a dismiss drag, where it has to
  // track the finger instead.
  useEffect(() => {
    document.documentElement.dataset.keyboardDragging = keyboardDragging ? "true" : "false";
  }, [keyboardDragging]);

  const beginCase = () => {
    keyboard.hide();
    setCaseStarted(true);
    setSheetOpen(false);
  };

  // Dismiss the simulated keyboard on every sheet close path (overlay tap,
  // escape, drag-down) so the app viewport returns to full height and the
  // primary action settles back at the bottom safe area.
  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (nextOpen) pendingAutoFocusRef.current = true;
    else keyboard.hide();

    setSheetOpen(nextOpen);
  };

  return (
    <>
      <MobileScroll className="app-screen paper-screen">
        <main className="welcome-screen" aria-label="Recht und Papier Startseite">
          <header className="brand-line">
            <span className="brand-mark" aria-hidden="true">R&amp;P</span>
            <div>
              <strong>RECHT &amp; PAPIER</strong>
              <span>Digitale Rechtsassistenz</span>
            </div>
          </header>

          <section className="hero-art" aria-label="Eine Ballonzeichnung steht für Entlastung">
            <div className="hero-glow" />
            <img
              src="/assets/recht-und-papier/balloon-relief.png"
              alt="Handgezeichneter Heißluftballon, der einen Mann im Anzug vom Boden abhebt"
              draggable="false"
            />
            <span className="figure-caption">Ein wenig Last abgeben.</span>
          </section>

          <section className="welcome-copy">
            <p className="kicker">Ihr Anliegen. Klar geordnet.</p>
            <h1>Recht verstehen.<br />Leichter weitergehen.</h1>
            <p className="intro">
              Schildern Sie, was passiert ist. Wir ordnen Ihren Fall, prüfen Quellen und zeigen verständliche nächste Schritte.
            </p>
          </section>

          {caseStarted ? (
            <section className="case-created" aria-live="polite">
              <CheckCircledIcon width="20" height="20" />
              <div>
                <strong>Ihr Fall ist angelegt</strong>
                <span>{attachment?.name ?? description}</span>
              </div>
            </section>
          ) : null}

          <div className="welcome-actions">
            <button className="primary-action" type="button" onClick={() => handleSheetOpenChange(true)}>
              <span>{caseStarted ? "Fall ergänzen" : "Fall beginnen"}</span>
              <ArrowRightIcon width="19" height="19" />
            </button>

            <div className="privacy-note">
              <LockClosedIcon width="14" height="14" />
              <span>Vertraulich behandelt · Quellen werden sichtbar</span>
            </div>
          </div>
        </main>
      </MobileScroll>

      <BottomSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Worum geht es?"
        description="Beschreiben Sie kurz Ihren Fall und fügen Sie Ihr Anschreiben direkt hinzu."
        snap={0.88}
      >
        <div className="case-sheet-form">
          <label htmlFor="case-description">Was ist passiert?</label>
          <KeyboardTextarea
            id="case-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onPointerDown={() => {
              pendingAutoFocusRef.current = false;
            }}
            onFocus={(event) => {
              if (!pendingAutoFocusRef.current) return;

              pendingAutoFocusRef.current = false;
              event.currentTarget.blur();
              keyboard.hide();
            }}
            onBlur={(event) => {
              // Controls inside the form dismiss the keyboard in their own click
              // handler; hiding here would shift the sheet between pointerdown
              // and pointerup and swallow the tap.
              const nextTarget = event.relatedTarget as HTMLElement | null;
              if (nextTarget?.closest(".case-sheet-form")) return;
              keyboard.hide();
            }}
            placeholder="Zum Beispiel: Ich habe gestern eine Kündigung erhalten …"
            rows={5}
          />

          <input
            ref={fileInputRef}
            className="attachment-input"
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
          />
          <button
            className="attachment-button"
            type="button"
            onClick={() => {
              keyboard.hide();
              fileInputRef.current?.click();
            }}
          >
            <Paperclip size={18} weight="regular" />
            <span>{attachment?.name ?? "Anschreiben hinzufügen"}</span>
          </button>
          <p>PDF, DOCX oder Bild · vertraulich verarbeitet</p>
          <button
            className="sheet-action"
            type="button"
            disabled={description.trim().length < 8 || !attachment}
            onClick={beginCase}
          >
            Fall anlegen
            <ArrowRightIcon width="18" height="18" />
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

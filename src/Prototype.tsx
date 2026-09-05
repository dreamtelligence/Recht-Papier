import { ArrowRightIcon, CheckCircledIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { Paperclip } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useDrag } from "@use-gesture/react";
import { AnimatePresence, motion } from "motion/react";

// iOS does not resize the layout viewport when the system keyboard appears, it
// only shrinks the visual viewport. Publishing the difference as a CSS variable
// lets the sheet sit directly above the keyboard instead of behind it.
function useKeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const inset = window.innerHeight - viewport.height - viewport.offsetTop;
      document.documentElement.style.setProperty("--keyboard-inset", `${Math.max(0, Math.round(inset))}px`);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
}

export default function Prototype() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [caseStarted, setCaseStarted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useKeyboardInset();

  const closeSheet = () => {
    setDragY(0);
    setSheetOpen(false);
  };

  const beginCase = () => {
    setCaseStarted(true);
    closeSheet();
  };

  // Drag the grip down to dismiss, the way a native sheet behaves.
  const bindDrag = useDrag(
    (state) => {
      const [, movementY] = state.movement;
      const [, velocityY] = state.velocity;
      const [, directionY] = state.direction;
      const nextY = Math.max(0, movementY);

      if (!state.last) {
        setDragY(nextY);
        return;
      }

      if (nextY > 96 || (velocityY > 0.55 && directionY > 0)) {
        closeSheet();
        return;
      }

      setDragY(0);
    },
    { axis: "y", filterTaps: true },
  );

  return (
    <div className="paper-app">
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
          <button className="primary-action" type="button" onClick={() => setSheetOpen(true)}>
            <span>{caseStarted ? "Fall ergänzen" : "Fall beginnen"}</span>
            <ArrowRightIcon width="19" height="19" />
          </button>

          <div className="privacy-note">
            <LockClosedIcon width="14" height="14" />
            <span>Vertraulich behandelt · Quellen werden sichtbar</span>
          </div>
        </div>
      </main>

      <Dialog.Root open={sheetOpen} onOpenChange={(open) => (open ? setSheetOpen(true) : closeSheet())}>
        {/* Kept mounted past `open` so AnimatePresence can play the exit motion
            before Radix removes the sheet. */}
        <Dialog.Portal forceMount>
          <AnimatePresence>
            {sheetOpen ? (
              <>
                <Dialog.Overlay asChild forceMount>
                  <motion.div
                    className="case-sheet-overlay"
                    data-testid="sheet-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                  />
                </Dialog.Overlay>
                <Dialog.Content
                  asChild
                  forceMount
                  // Let the sheet arrive quietly. Without this Radix focuses the
                  // textarea on mount and the system keyboard shoots up with it.
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <motion.div
                    className="case-sheet"
                    data-testid="bottom-sheet"
                    initial={{ y: "100%" }}
                    animate={{ y: dragY }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 500, damping: 43, mass: 0.9 }}
                  >
                    <div className="sheet-grip" data-testid="sheet-handle" {...bindDrag()}>
                      <div className="sheet-grip-bar" />
                    </div>
                    <div className="sheet-heading">
                      <Dialog.Title className="sheet-title">Worum geht es?</Dialog.Title>
                      <Dialog.Description className="sheet-description">
                        Beschreiben Sie kurz Ihren Fall und fügen Sie Ihr Anschreiben direkt hinzu.
                      </Dialog.Description>
                    </div>

                    <div className="case-sheet-form">
                      <label htmlFor="case-description">Was ist passiert?</label>
                      <textarea
                        id="case-description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
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
                        onClick={() => fileInputRef.current?.click()}
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
                  </motion.div>
                </Dialog.Content>
              </>
            ) : null}
          </AnimatePresence>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

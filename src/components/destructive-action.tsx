"use client";

import { AlertTriangle, ArchiveRestore, RotateCcw, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function DestructiveActionDialog({
  open,
  title,
  description,
  impacts,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  impacts: string[];
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => cancelRef.current?.focus());
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open, pending]);

  if (!open) return null;

  return (
    <div className="modal-backdrop destructive-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !pending && onCancel()}>
      <section className="modal-sheet destructive-dialog" role="alertdialog" aria-modal="true" aria-labelledby="destructive-title" aria-describedby="destructive-description">
        <header>
          <span className="destructive-icon"><AlertTriangle size={20} /></span>
          <div>
            <p className="eyebrow">Confirm deletion</p>
            <h2 id="destructive-title">{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} disabled={pending} aria-label="Close deletion warning"><X size={18} /></button>
        </header>
        <div className="destructive-body">
          <p id="destructive-description" className="destructive-description">{description}</p>
          <div className="destructive-impact">
            <strong>What will happen</strong>
            <ul>{impacts.map((impact) => <li key={impact}>{impact}</li>)}</ul>
          </div>
          <div className="destructive-recovery">
            <ArchiveRestore size={17} />
            <div><strong>Recovery is available</strong><span>You can undo this action immediately after deletion.</span></div>
          </div>
        </div>
        <footer className="destructive-actions">
          <button ref={cancelRef} type="button" className="secondary-button" onClick={onCancel} disabled={pending}>Keep it</button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={pending}>{pending ? "Deleting..." : confirmLabel}</button>
        </footer>
      </section>
    </div>
  );
}

export function UndoToast({ message, onUndo }: { message: string; onUndo: () => void }) {
  return (
    <div className="toast undo-toast" role="status" aria-live="polite">
      <ArchiveRestore size={16} />
      <span>{message}</span>
      <button className="toast-action" type="button" onClick={onUndo}><RotateCcw size={13} />Undo</button>
    </div>
  );
}

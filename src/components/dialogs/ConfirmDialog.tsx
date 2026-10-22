import type { ReactNode } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export interface ConfirmOptions {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}

interface ConfirmDialogProps {
  options: ConfirmOptions;
  onResolve(value: boolean): void;
}

export function ConfirmDialog({ options, onResolve }: ConfirmDialogProps) {
  return (
    <Modal
      titleId="confirm-dialog-title"
      descriptionId="confirm-dialog-description"
      onClose={() => onResolve(false)}
    >
      <h2
        id="confirm-dialog-title"
        className="text-[21px] font-extrabold tracking-[-0.7px] text-ink"
      >
        {options.title}
      </h2>
      <div
        id="confirm-dialog-description"
        className="mt-2 text-[12px] leading-relaxed text-[#8f9f97]"
      >
        {options.description}
      </div>
      <div className="mt-[22px] flex justify-end gap-2.5">
        <Button onClick={() => onResolve(false)} data-autofocus>
          {options.cancelLabel ?? "Cancel"}
        </Button>
        <Button
          variant={options.tone === "danger" ? "danger" : "primary"}
          onClick={() => onResolve(true)}
        >
          {options.confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

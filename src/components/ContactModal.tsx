"use client";

import { useState, useEffect, useCallback } from "react";
import { useT } from "@/i18n";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  currentStdin: string;
}

type SendState = "idle" | "sending" | "success" | "error";

export function ContactModal({
  isOpen,
  onClose,
  currentCode,
  currentStdin,
}: ContactModalProps) {
  const t = useT();
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [includeCode, setIncludeCode] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleClose = useCallback(() => {
    if (sendState === "sending") return;
    onClose();
  }, [sendState, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  // 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setMessage("");
      setReplyEmail("");
      setIncludeCode(false);
      setSendState("idle");
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (message.trim().length === 0) return;
    setSendState("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          replyEmail: replyEmail.trim(),
          code: currentCode,
          stdin: currentStdin,
          includeCode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "전송에 실패했습니다.");
      }

      setSendState("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "전송에 실패했습니다.",
      );
      setSendState("error");
    }
  }, [message, replyEmail, currentCode, currentStdin, includeCode]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0d1117] border border-prova-line rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-prova-line">
          <span className="text-[14px] font-semibold text-[#e6edf3]">
            {t.contact_title}
          </span>
          <button
            className="w-6 h-6 flex items-center justify-center rounded text-prova-muted hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
            onClick={handleClose}
            aria-label={t.contact_close}
          >
            ✕
          </button>
        </div>

        {sendState === "success" ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-[14px] text-[#e6edf3] font-medium">
              {t.contact_successTitle}
            </p>
            <p className="text-[12px] text-prova-muted">
              {t.contact_successMessage}
              {replyEmail.trim().length > 0 && (
                <>
                  <br />
                  <span className="text-[#58a6ff]">
                    {t.contact_successReply(replyEmail.trim())}
                  </span>
                </>
              )}
            </p>
            <button
              className="mt-2 px-4 py-1.5 text-[12px] rounded-md bg-[#21262d] border border-prova-line text-[#c9d1d9] hover:bg-[#262c36] transition-colors"
              onClick={handleClose}
            >
              {t.contact_close}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-4">
            {/* Description */}
            <p className="text-[12px] text-prova-muted leading-relaxed">
              {t.contact_description}{" "}
              <span className="text-[#58a6ff]">{t.contact_descriptionHighlight}</span>{" "}
              {t.contact_descriptionSuffix}
            </p>

            {/* Message textarea */}
            <textarea
              className="w-full h-36 rounded-md border border-prova-line bg-[#161b22] text-[12px] font-mono text-[#c9d1d9] p-3 resize-none placeholder:text-prova-muted focus:outline-none focus:border-[#58a6ff]/60 transition-colors"
              placeholder={t.contact_messagePlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendState === "sending"}
              autoFocus
            />

            {/* Reply email (optional) */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-[#c9d1d9]">
                {t.contact_replyEmailLabel}{" "}
                <span className="text-prova-muted font-normal">
                  {t.contact_replyEmailOptional}
                </span>
              </label>
              <input
                type="email"
                className="w-full rounded-md border border-prova-line bg-[#161b22] text-[12px] text-[#c9d1d9] px-3 py-2 placeholder:text-prova-muted focus:outline-none focus:border-[#58a6ff]/60 transition-colors disabled:opacity-40"
                placeholder={t.contact_replyEmailPlaceholder}
                value={replyEmail}
                onChange={(e) => setReplyEmail(e.target.value)}
                disabled={sendState === "sending"}
              />
            </div>

            {/* Code include checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                className="mt-0.5 w-3.5 h-3.5 accent-[#58a6ff] cursor-pointer shrink-0"
                checked={includeCode}
                onChange={(e) => setIncludeCode(e.target.checked)}
                disabled={
                  sendState === "sending" || currentCode.trim().length === 0
                }
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] text-[#c9d1d9] group-hover:text-[#e6edf3] transition-colors">
                  {t.contact_includeCodeLabel}
                </span>
                <span className="text-[11px] text-prova-muted">
                  {t.contact_includeCodeHint}
                  {currentCode.trim().length === 0 && (
                    <span className="ml-1 text-[#f85149]">
                      {t.contact_includeCodeEmpty}
                    </span>
                  )}
                </span>
              </div>
            </label>

            {/* Error */}
            {sendState === "error" && errorMessage && (
              <p className="text-[12px] text-[#f85149]">{errorMessage}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                className="px-4 py-1.5 text-[12px] rounded-md border border-prova-line text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                onClick={handleClose}
                disabled={sendState === "sending"}
              >
                {t.contact_cancel}
              </button>
              <button
                className={`px-4 py-1.5 text-[12px] rounded-md font-medium transition-colors ${
                  message.trim().length === 0 || sendState === "sending"
                    ? "bg-[#21262d] border border-prova-line text-prova-muted cursor-not-allowed"
                    : "bg-[#238636] text-white hover:bg-[#2ea043]"
                }`}
                onClick={handleSubmit}
                disabled={
                  message.trim().length === 0 || sendState === "sending"
                }
              >
                {sendState === "sending" ? t.contact_submitting : t.contact_submit}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

// In-app replacements for window.alert / confirm / prompt.
//   const { notify, confirm, prompt } = useDialogs();
//   notify({ tone: 'success', message: 'Saved' });
//   if (await confirm({ title: 'Delete?', tone: 'danger' })) ...
//   const name = await prompt({ title: 'Rename', defaultValue: 'Old' });

type Tone = 'success' | 'error' | 'info';

interface NotifyOptions {
  message: string;
  title?: string;
  tone?: Tone;
  duration?: number; // ms; 0 keeps it until dismissed
}

interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface PromptOptions {
  title: string;
  message?: React.ReactNode;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
}

interface DialogApi {
  notify: (options: NotifyOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type ModalState =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

interface Toast extends NotifyOptions {
  id: number;
  leaving?: boolean;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialogs must be used inside <DialogProvider>');
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), 200);
  }, []);

  const notify = useCallback(
    (options: NotifyOptions) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-3), { tone: 'info', ...options, id }]);
      const duration = options.duration ?? (options.tone === 'error' ? 7000 : 4000);
      if (duration > 0) setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast]
  );

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setModal({ kind: 'confirm', options, resolve })),
    []
  );

  const prompt = useCallback(
    (options: PromptOptions) => new Promise<string | null>((resolve) => setModal({ kind: 'prompt', options, resolve })),
    []
  );

  const close = (value: boolean | string | null) => {
    if (!modal) return;
    if (modal.kind === 'confirm') modal.resolve(value === true);
    else modal.resolve(typeof value === 'string' ? value : null);
    setModal(null);
  };

  return (
    <DialogContext.Provider value={{ notify, confirm, prompt }}>
      {children}
      {modal && <Modal state={modal} onClose={close} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </DialogContext.Provider>
  );
}

// ---------- modal ----------

function Modal({ state, onClose }: { state: ModalState; onClose: (value: boolean | string | null) => void }) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(state.kind === 'prompt' ? state.options.defaultValue ?? '' : '');
  const [visible, setVisible] = useState(false);

  const isPrompt = state.kind === 'prompt';
  const danger = state.kind === 'confirm' && state.options.tone === 'danger';
  const { title, message } = state.options;
  const confirmLabel = state.options.confirmLabel ?? (isPrompt ? 'Save' : 'Confirm');
  const cancelLabel = state.options.cancelLabel ?? 'Cancel';
  const canSubmit = !isPrompt || value.trim().length > 0;

  const cancel = () => onClose(isPrompt ? null : false);
  const submit = () => {
    if (!canSubmit) return;
    onClose(isPrompt ? value.trim() : true);
  };

  // Enter animation, initial focus, and focus restore on close
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => setVisible(true));
    if (isPrompt) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      confirmRef.current?.focus();
    }
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [isPrompt]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cancel();
    }
    // Keep Tab inside the dialog
    if (e.key === 'Tab' && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-colors duration-200 ${visible ? 'bg-gray-900/50' : 'bg-gray-900/0'}`}
      onMouseDown={(e) => e.target === e.currentTarget && cancel()}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role={danger ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descId : undefined}
        className={`w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-200 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex gap-4 p-6">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
              }`}
              aria-hidden="true"
            >
              {danger ? <WarningIcon /> : isPrompt ? <PencilIcon /> : <QuestionIcon />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold text-gray-900">
                {title}
              </h2>
              {message && (
                <div id={descId} className="mt-2 text-sm leading-relaxed text-gray-600">
                  {message}
                </div>
              )}
              {isPrompt && (
                <div className="mt-4">
                  {state.options.label && (
                    <label htmlFor={`${titleId}-input`} className="mb-1.5 block text-xs font-medium text-gray-700">
                      {state.options.label}
                    </label>
                  )}
                  <input
                    id={`${titleId}-input`}
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={state.options.placeholder}
                    maxLength={state.options.maxLength ?? 60}
                    aria-label={state.options.label ? undefined : title}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="submit"
              disabled={!canSubmit}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
                danger
                  ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                  : 'bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-500'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- toasts ----------

const TOAST_STYLES: Record<Tone, { ring: string; icon: React.ReactNode; iconColor: string }> = {
  success: { ring: 'ring-green-100', icon: <CheckIcon />, iconColor: 'text-green-600 bg-green-50' },
  error: { ring: 'ring-red-100', icon: <WarningIcon />, iconColor: 'text-red-600 bg-red-50' },
  info: { ring: 'ring-brand-100', icon: <InfoIcon />, iconColor: 'text-brand-600 bg-brand-50' },
};

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[110] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:bottom-6">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [entered, setEntered] = useState(false);
  const style = TOAST_STYLES[toast.tone ?? 'info'];

  useEffect(() => {
    requestAnimationFrame(() => setEntered(true));
  }, []);

  const shown = entered && !toast.leaving;

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ${style.ring} transition-all duration-200 ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconColor}`} aria-hidden="true">
        {style.icon}
      </div>
      <div className="min-w-0 flex-1 pt-1">
        {toast.title && <p className="text-sm font-semibold text-gray-900">{toast.title}</p>}
        <p className={`text-sm text-gray-600 ${toast.title ? 'mt-0.5' : ''}`}>{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Dismiss notification"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}

// ---------- icons ----------

function WarningIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

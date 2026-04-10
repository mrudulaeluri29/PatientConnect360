import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import "./Feedback.css";

type ToastItem = { id: number; message: string; variant: "success" | "error" | "info" };

type FeedbackContextValue = {
  showToast: (message: string, variant?: ToastItem["variant"]) => void;
  confirmDialog: (
    title: string,
    body: string,
    options?: { danger?: boolean; confirmLabel?: string }
  ) => Promise<boolean>;
  /** Single-action informational modal (replaces window.alert for important UX copy). */
  infoDialog: (
    title: string,
    body: string,
    options?: { confirmLabel?: string; wide?: boolean }
  ) => Promise<void>;
  promptDialog: (title: string, options?: { placeholder?: string; confirmLabel?: string }) => Promise<string | null>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    body: string;
    danger?: boolean;
    confirmLabel?: string;
    resolve: (v: boolean) => void;
  } | null>(null);
  const [promptState, setPromptState] = useState<{
    title: string;
    placeholder: string;
    confirmLabel: string;
    resolve: (v: string | null) => void;
  } | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [infoState, setInfoState] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    wide: boolean;
    resolve: () => void;
  } | null>(null);

  const showToast = useCallback((message: string, variant: ToastItem["variant"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const confirmDialog = useCallback(
    (
      title: string,
      body: string,
      options?: { danger?: boolean; confirmLabel?: string }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmState({
          title,
          body,
          danger: options?.danger,
          confirmLabel: options?.confirmLabel,
          resolve,
        });
      });
    },
    []
  );

  const promptDialog = useCallback(
    (
      title: string,
      options?: { placeholder?: string; confirmLabel?: string }
    ): Promise<string | null> => {
      return new Promise((resolve) => {
        setPromptValue("");
        setPromptState({
          title,
          placeholder: options?.placeholder ?? "",
          confirmLabel: options?.confirmLabel ?? "Submit",
          resolve,
        });
      });
    },
    []
  );

  const infoDialog = useCallback(
    (
      title: string,
      body: string,
      options?: { confirmLabel?: string; wide?: boolean }
    ): Promise<void> => {
      return new Promise((resolve) => {
        setInfoState({
          title,
          body,
          confirmLabel: options?.confirmLabel ?? "OK",
          wide: options?.wide ?? false,
          resolve,
        });
      });
    },
    []
  );

  const value = useMemo(
    () => ({ showToast, confirmDialog, infoDialog, promptDialog }),
    [showToast, confirmDialog, infoDialog, promptDialog]
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="pc-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pc-toast pc-toast--${t.variant}`}>
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div
          className="pc-feedback-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pc-confirm-title"
        >
          <div className="pc-feedback-modal">
            <h3 id="pc-confirm-title" className="pc-feedback-modal__title">
              {confirmState.title}
            </h3>
            <p className="pc-feedback-modal__body">{confirmState.body}</p>
            <div className="pc-feedback-modal__actions">
              <button
                type="button"
                className="pc-feedback-btn pc-feedback-btn--secondary"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  confirmState.danger
                    ? "pc-feedback-btn pc-feedback-btn--danger"
                    : "pc-feedback-btn pc-feedback-btn--primary"
                }
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
              >
                {confirmState.confirmLabel ??
                  (confirmState.danger ? "Remove" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {infoState && (
        <div
          className="pc-feedback-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pc-info-title"
        >
          <div
            className={`pc-feedback-modal${infoState.wide ? " pc-feedback-modal--wide" : ""}`}
          >
            <h3 id="pc-info-title" className="pc-feedback-modal__title">
              {infoState.title}
            </h3>
            <p className="pc-feedback-modal__body pc-feedback-modal__body--preline">{infoState.body}</p>
            <div className="pc-feedback-modal__actions">
              <button
                type="button"
                className="pc-feedback-btn pc-feedback-btn--primary"
                onClick={() => {
                  infoState.resolve();
                  setInfoState(null);
                }}
              >
                {infoState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptState && (
        <div
          className="pc-feedback-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pc-prompt-title"
        >
          <div className="pc-feedback-modal">
            <h3 id="pc-prompt-title" className="pc-feedback-modal__title">
              {promptState.title}
            </h3>
            <textarea
              className="pc-feedback-modal__textarea"
              placeholder={promptState.placeholder}
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="pc-feedback-modal__actions">
              <button
                type="button"
                className="pc-feedback-btn pc-feedback-btn--secondary"
                onClick={() => {
                  promptState.resolve(null);
                  setPromptState(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pc-feedback-btn pc-feedback-btn--primary"
                onClick={() => {
                  promptState.resolve(promptValue.trim() || null);
                  setPromptState(null);
                }}
              >
                {promptState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

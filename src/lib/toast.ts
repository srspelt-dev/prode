// Mini sistema de toasts vía evento del window (sin librerías).

export type ToastType = "success" | "error";

export function toast(message: string, type: ToastType = "success") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("app-toast", { detail: { message, type } })
    );
  }
}

"use client";

export type SupportConfig = {
  enabled: boolean;
  widgetEnabled?: boolean;
  title: string;
  subtitle?: string;
  greeting?: string;
  offlineMessage?: string;
  allowCustomerReopen?: boolean;
  businessHoursEnabled?: boolean;
  withinBusinessHours?: boolean;
  soundEnabled?: boolean;
  enterToSend?: boolean;
  pollIntervalMs?: number;
  cannedReplies?: Array<{ id: string; title: string; body: string }>;
  email?: string;
  phone?: string;
};

export type SupportAttachment = {
  url: string;
  name: string | null;
  mime: string | null;
  size: number | null;
};

export type SupportMessage = {
  id: number;
  body: string;
  senderRole: string;
  senderUserId: number;
  isSystem?: boolean;
  attachment?: SupportAttachment | null;
  readAt?: string | null;
  createdAt: string | null;
};

export function isImageAttachment(att: SupportAttachment | null | undefined): boolean {
  if (!att) return false;
  const mime = (att.mime || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const name = (att.name || att.url || "").toLowerCase();
  return /\.(jpe?g|png|gif|webp|svg)$/i.test(name);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type SupportConversation = {
  id: number;
  status: string;
  subject?: string | null;
  unreadCustomer: number;
  unreadAdmin: number;
  lastMessageAt: string | null;
  lastMessagePreview?: string | null;
  lastMessageRole?: string | null;
  assignedAdminId?: number | null;
  assignedAdminName?: string | null;
  customer?: {
    id: number;
    name: string | null;
    phone: string | null;
    email?: string | null;
  };
};

let audioCtx: AudioContext | null = null;

export function playSupportChime(enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    osc.stop(audioCtx.currentTime + 0.26);
  } catch {
    // ignore autoplay restrictions
  }
}

export async function notifySupportBrowser(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted" && document.visibilityState === "hidden") {
      new Notification(title, { body, tag: "nextgen-support" });
    }
  } catch {
    // ignore
  }
}

export function formatChatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

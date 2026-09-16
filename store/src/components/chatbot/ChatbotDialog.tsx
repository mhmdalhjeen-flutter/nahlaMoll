'use client';

import { ChatbotPanel } from './ChatbotPanel';

interface ChatbotDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Shared Nahla Mall assistant shell — used by FAB and Help Center. */
export function ChatbotDialog({ open, onClose }: ChatbotDialogProps) {
  return <ChatbotPanel open={open} onClose={onClose} />;
}

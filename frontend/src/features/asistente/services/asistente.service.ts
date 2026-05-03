import { apiFetch } from '@/shared/lib/api';
import type { ChatMessage, ChatResponse } from '../types/chat.types';

export function chatWithAsistente(messages: Pick<ChatMessage, 'role' | 'content'>[]): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/asistente/chat', {
    method: 'POST',
    body: { messages },
  });
}

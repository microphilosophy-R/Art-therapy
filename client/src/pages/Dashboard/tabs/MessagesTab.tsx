import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import {
  getMyMessages,
  markMessageAsRead,
  markAllMessagesAsRead,
  sendManualMessage,
} from '../../../api/messages';
import { MessageItem } from '../../../components/messages/MessageItem';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Spinner } from '../../../components/ui/Spinner';
import { useAuthStore } from '../../../store/authStore';

export const MessagesTab = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSent, setComposeSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['messages', page],
    queryFn: () => getMyMessages(page),
  });

  const markReadMutation = useMutation({
    mutationFn: markMessageAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllMessagesAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ recipientId, body }: { recipientId: string; body: string }) =>
      sendManualMessage(recipientId, body),
    onSuccess: () => {
      setComposeSent(true);
      setComposeRecipient('');
      setComposeBody('');
      setTimeout(() => { setShowCompose(false); setComposeSent(false); }, 2000);
    },
    onError: (err: any) => {
      setComposeError(err?.response?.data?.message ?? t('messages.sendError'));
    },
  });

  const handleSend = () => {
    if (!composeRecipient.trim()) {
      setComposeError(t('common.errors.required'));
      return;
    }
    if (!composeBody.trim()) {
      setComposeError(t('common.errors.required'));
      return;
    }
    setComposeError(null);
    sendMutation.mutate({ recipientId: composeRecipient.trim(), body: composeBody });
  };

  const messages = data?.data ?? [];
  const hasUnread = messages.some((m) => !m.isRead);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">{t('messages.inbox')}</h2>
        <div className="flex items-center gap-2">
          {hasUnread && (
            <Button
              size="sm"
              variant="outline"
              loading={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              {t('messages.markAllRead')}
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => { setShowCompose((v) => !v); setComposeSent(false); setComposeError(null); }}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              {t('messages.compose')}
            </Button>
          )}
        </div>
      </div>

      {/* Compose form (Admin only) */}
      {isAdmin && showCompose && (
        <div className="mb-4 bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-stone-700">{t('messages.composeTitle')}</h3>
          {composeSent ? (
            <p className="text-sm text-teal-600">{t('messages.sendSuccess')}</p>
          ) : (
            <>
              <Input
                label={t('messages.recipient')}
                placeholder="User ID (cuid)"
                value={composeRecipient}
                onChange={(e) => { setComposeRecipient(e.target.value); setComposeError(null); }}
              />
              <Textarea
                label={t('messages.body')}
                placeholder={t('messages.bodyPlaceholder')}
                rows={3}
                maxLength={2000}
                value={composeBody}
                onChange={(e) => { setComposeBody(e.target.value); setComposeError(null); }}
              />
              {composeError && <p className="text-xs text-rose-500">{composeError}</p>}
              <Button
                size="sm"
                loading={sendMutation.isPending}
                onClick={handleSend}
              >
                {t('messages.send')}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Messages list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p>{t('messages.noMessages')}</p>
          <p className="text-sm mt-1">{t('messages.noMessagesHint')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onRead={(id) => markReadMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>←</Button>
          <span className="text-sm text-stone-500">{page} / {data.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>→</Button>
        </div>
      )}
    </div>
  );
};

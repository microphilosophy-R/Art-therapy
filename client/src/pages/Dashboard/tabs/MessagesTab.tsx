import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  getMyMessages,
  markMessageAsRead,
  markAllMessagesAsRead,
  sendManualMessage,
  getConversations,
  getConversationMessages,
  sendChatMessage,
} from '../../../api/messages';
import { MessageItem } from '../../../components/messages/MessageItem';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Spinner } from '../../../components/ui/Spinner';
import { Avatar } from '../../../components/ui/Avatar';
import { useAuthStore } from '../../../store/authStore';
import { connectSocket, disconnectSocket } from '../../../lib/socket';
import type { Message } from '../../../types';

type Kind = 'all' | 'system' | 'chat';

const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export const MessagesTab = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthStore();
  const [searchParams] = useSearchParams();
  const isAdmin = user?.role === 'ADMIN';

  const [kind, setKind] = useState<Kind>('all');
  const [page, setPage] = useState(1);
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [chatBody, setChatBody] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [pendingRecipientId, setPendingRecipientId] = useState<string | null>(null);

  const conversationParam = searchParams.get('conversation');

  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', kind, page],
    queryFn: () => getMyMessages(page, 20, kind),
    enabled: kind !== 'chat',
  });

  const { data: conversationsData, isLoading: loadingConversations } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: () => getConversations(1, 50),
  });

  const conversations = conversationsData?.data ?? [];

  useEffect(() => {
    if (!conversationParam) return;
    const existing = conversations.find((c) => c.id === conversationParam);
    if (existing) {
      setKind('chat');
      setSelectedConversationId(existing.id);
      setPendingRecipientId(null);
      return;
    }
    // If no existing conversation matches, treat it as recipient userId.
    setKind('chat');
    setSelectedConversationId(null);
    setPendingRecipientId(conversationParam);
  }, [conversationParam, conversations]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const { data: threadData, isLoading: loadingThread } = useQuery({
    queryKey: ['chat-thread', selectedConversationId],
    queryFn: () => getConversationMessages(selectedConversationId!),
    enabled: !!selectedConversationId,
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

  const sendManualMutation = useMutation({
    mutationFn: ({ recipientId, body }: { recipientId: string; body: string }) =>
      sendManualMessage(recipientId, body),
    onSuccess: () => {
      setComposeRecipient('');
      setComposeBody('');
      setShowCompose(false);
      setComposeError(null);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err: any) => {
      setComposeError(err?.response?.data?.message ?? t('messages.sendError'));
    },
  });

  const sendChatMutation = useMutation({
    mutationFn: ({ recipientId, body }: { recipientId: string; body: string }) =>
      sendChatMessage(recipientId, body),
    onSuccess: (message) => {
      setChatBody('');
      setChatError(null);
      if (message.conversationId) {
        setSelectedConversationId(message.conversationId);
        setPendingRecipientId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-thread'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: (err: any) => {
      setChatError(err?.response?.data?.message ?? t('messages.sendError'));
    },
  });

  useEffect(() => {
    if (!accessToken) return;
    const socket = connectSocket(accessToken);

    const onChatMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['chat-thread'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    };

    const onConversationUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    };

    socket.on('chat:new_message', onChatMessage);
    socket.on('chat:conversation_updated', onConversationUpdated);

    return () => {
      socket.off('chat:new_message', onChatMessage);
      socket.off('chat:conversation_updated', onConversationUpdated);
      disconnectSocket();
    };
  }, [accessToken, queryClient]);

  const handleSendAdmin = () => {
    if (!composeRecipient.trim() || !composeBody.trim()) {
      setComposeError(t('common.errors.required'));
      return;
    }
    sendManualMutation.mutate({ recipientId: composeRecipient.trim(), body: composeBody.trim() });
  };

  const handleSendChat = () => {
    const recipientId = selectedConversation?.peer.id ?? pendingRecipientId;
    if (!recipientId || !chatBody.trim()) {
      setChatError(t('common.errors.required'));
      return;
    }
    sendChatMutation.mutate({ recipientId, body: chatBody.trim() });
  };

  if (kind === 'chat') {
    const threadMessages = threadData?.data ?? [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">{t('messages.inbox')}</h2>
          <div className="flex gap-2">
            {(['all', 'system', 'chat'] as Kind[]).map((k) => (
              <Button key={k} size="sm" variant={kind === k ? 'primary' : 'outline'} onClick={() => setKind(k)}>
                {k === 'all' ? 'All' : k === 'system' ? 'System' : 'Chat'}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 border border-stone-200 rounded-lg max-h-[520px] overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 flex justify-center"><Spinner /></div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-stone-400">{t('messages.noMessages')}</p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`w-full text-left px-3 py-2 border-b border-stone-100 hover:bg-stone-50 ${selectedConversationId === conversation.id ? 'bg-teal-50' : ''}`}
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    setPendingRecipientId(null);
                    setChatError(null);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      firstName={conversation.peer.firstName}
                      lastName={conversation.peer.lastName}
                      src={conversation.peer.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{conversation.peer.firstName} {conversation.peer.lastName}</p>
                      <p className="text-xs text-stone-500 truncate">{conversation.lastMessage?.body ?? ''}</p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="ml-auto text-xs bg-rose-500 text-white rounded-full px-2 py-0.5">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="md:col-span-2 border border-stone-200 rounded-lg p-3 min-h-[420px] flex flex-col">
            {!selectedConversationId && !pendingRecipientId ? (
              <p className="text-sm text-stone-400">Select a conversation.</p>
            ) : (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px]">
                  {loadingThread ? (
                    <div className="flex justify-center py-8"><Spinner /></div>
                  ) : threadMessages.length === 0 ? (
                    <p className="text-sm text-stone-400">No messages yet.</p>
                  ) : (
                    threadMessages.map((message: Message) => {
                      const isMine = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${isMine ? 'ml-auto bg-teal-600 text-white' : 'bg-stone-100 text-stone-800'}`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-teal-100' : 'text-stone-400'}`}>
                            {formatRelativeTime(message.createdAt)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-3 border-t border-stone-100 pt-3">
                  <Textarea
                    rows={3}
                    maxLength={2000}
                    value={chatBody}
                    onChange={(e) => {
                      setChatBody(e.target.value);
                      setChatError(null);
                    }}
                    placeholder="Type your message..."
                  />
                  {chatError && <p className="text-xs text-rose-500 mt-1">{chatError}</p>}
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" onClick={handleSendChat} loading={sendChatMutation.isPending}>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      {t('messages.send')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const messages = messagesData?.data ?? [];
  const hasUnread = messages.some((m) => !m.isRead);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">{t('messages.inbox')}</h2>
        <div className="flex items-center gap-2">
          {(['all', 'system', 'chat'] as Kind[]).map((k) => (
            <Button key={k} size="sm" variant={kind === k ? 'primary' : 'outline'} onClick={() => setKind(k)}>
              {k === 'all' ? 'All' : k === 'system' ? 'System' : 'Chat'}
            </Button>
          ))}
          {hasUnread && (
            <Button size="sm" variant="outline" loading={markAllMutation.isPending} onClick={() => markAllMutation.mutate()}>
              {t('messages.markAllRead')}
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" onClick={() => { setShowCompose((v) => !v); setComposeError(null); }}>
              <Send className="h-3.5 w-3.5 mr-1" />
              {t('messages.compose')}
            </Button>
          )}
        </div>
      </div>

      {isAdmin && showCompose && (
        <div className="mb-4 bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
          <Input
            label={t('messages.recipient')}
            placeholder="User ID (cuid)"
            value={composeRecipient}
            onChange={(e) => setComposeRecipient(e.target.value)}
          />
          <Textarea
            label={t('messages.body')}
            rows={3}
            maxLength={2000}
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
          />
          {composeError && <p className="text-xs text-rose-500">{composeError}</p>}
          <Button size="sm" loading={sendManualMutation.isPending} onClick={handleSendAdmin}>
            {t('messages.send')}
          </Button>
        </div>
      )}

      {loadingMessages ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p>{t('messages.noMessages')}</p>
          <p className="text-sm mt-1">{t('messages.noMessagesHint')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} onRead={(messageId) => markReadMutation.mutate(messageId)} />
          ))}
        </div>
      )}

      {messagesData && messagesData.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Prev</Button>
          <span className="text-sm text-stone-500">{page} / {messagesData.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= messagesData.totalPages}>Next</Button>
        </div>
      )}
    </div>
  );
};


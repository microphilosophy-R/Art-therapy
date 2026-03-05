import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  getConversations,
  getConversationMessages,
  sendChatMessage,
} from '../../../api/messages';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Textarea';
import { Spinner } from '../../../components/ui/Spinner';
import { Avatar } from '../../../components/ui/Avatar';
import { useAuthStore } from '../../../store/authStore';
import { connectSocket, disconnectSocket } from '../../../lib/socket';
import type { Message } from '../../../types';

const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
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

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [pendingRecipientId, setPendingRecipientId] = useState<string | null>(null);
  const [chatBody, setChatBody] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const conversationParam = searchParams.get('conversation');

  const { data: conversationsData, isLoading: loadingConversations } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: () => getConversations(1, 50),
  });

  const conversations = conversationsData?.data ?? [];

  useEffect(() => {
    if (!conversationParam) return;
    const existing = conversations.find((c) => c.id === conversationParam);
    if (existing) {
      setSelectedConversationId(existing.id);
      setPendingRecipientId(null);
      return;
    }
    setSelectedConversationId(null);
    setPendingRecipientId(conversationParam);
  }, [conversationParam, conversations]);

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0 && !pendingRecipientId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId, pendingRecipientId]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const { data: threadData, isLoading: loadingThread } = useQuery({
    queryKey: ['chat-thread', selectedConversationId],
    queryFn: () => getConversationMessages(selectedConversationId!),
    enabled: !!selectedConversationId,
  });

  const threadMessages = threadData?.data ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

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

  const handleSendChat = () => {
    const recipientId = selectedConversation?.peer.id ?? pendingRecipientId;
    if (!recipientId || !chatBody.trim()) {
      setChatError(t('common.errors.required'));
      return;
    }
    sendChatMutation.mutate({ recipientId, body: chatBody.trim() });
  };

  const chatTitle = selectedConversation
    ? `${selectedConversation.peer.firstName} ${selectedConversation.peer.lastName}`
    : pendingRecipientId
      ? pendingRecipientId
      : t('messages.selectConversation', 'Select a conversation');

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-800">{t('messages.chatWindow', 'Chat')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 border border-stone-200 rounded-lg max-h-[560px] overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 flex justify-center">
              <Spinner />
            </div>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-stone-400">{t('messages.noMessages')}</p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`w-full text-left px-3 py-2 border-b border-stone-100 hover:bg-stone-50 ${
                  selectedConversationId === conversation.id ? 'bg-teal-50' : ''
                }`}
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
                    <p className="text-sm font-medium truncate">
                      {conversation.peer.firstName} {conversation.peer.lastName}
                    </p>
                    <p className="text-xs text-stone-500 truncate">
                      {conversation.lastMessage?.body ?? ''}
                    </p>
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

        <div className="md:col-span-2 border border-stone-200 rounded-lg p-3 min-h-[520px] flex flex-col">
          <div className="pb-3 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-800 truncate">{chatTitle}</h3>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {!selectedConversationId && !pendingRecipientId ? (
              <p className="text-sm text-stone-400">{t('messages.selectConversation', 'Select a conversation')}</p>
            ) : loadingThread ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : threadMessages.length === 0 ? (
              <p className="text-sm text-stone-400">{t('messages.startConversation', 'No messages yet. Start the conversation.')}</p>
            ) : (
              threadMessages.map((message: Message) => {
                const isMine = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isMine ? 'ml-auto bg-teal-600 text-white' : 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-teal-100' : 'text-stone-400'}`}>
                      {formatRelativeTime(message.createdAt)}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <div className="pt-3 border-t border-stone-100">
            <Textarea
              rows={3}
              maxLength={2000}
              value={chatBody}
              onChange={(e) => {
                setChatBody(e.target.value);
                setChatError(null);
              }}
              placeholder={t('messages.typeMessage', 'Type your message...')}
            />
            {chatError && <p className="text-xs text-rose-500 mt-1">{chatError}</p>}
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={handleSendChat}
                loading={sendChatMutation.isPending}
                disabled={!selectedConversationId && !pendingRecipientId}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {t('messages.send')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

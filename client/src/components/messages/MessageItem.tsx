import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  onRead: (id: string) => void;
}

const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export const MessageItem = ({ message, onRead }: MessageItemProps) => {
  const { t } = useTranslation();

  const handleClick = () => {
    if (!message.isRead) onRead(message.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={`flex gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors border-l-4 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
        message.isRead
          ? 'border-transparent bg-white hover:bg-stone-50'
          : 'border-teal-500 bg-teal-50 hover:bg-teal-100/60'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm break-words ${message.isRead ? 'text-stone-600 font-normal' : 'text-stone-800 font-medium'}`}>
          {message.body}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-stone-400">{formatRelativeTime(message.createdAt)}</span>
          {message.plan && (
            <Link
              to={`/therapy-plans/${message.plan.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-teal-600 hover:text-teal-800 hover:underline"
            >
              {t('messages.planLink')} →
            </Link>
          )}
        </div>
      </div>
      {!message.isRead && (
        <div className="flex-shrink-0 mt-1">
          <span className="h-2 w-2 rounded-full bg-teal-500 block" />
        </div>
      )}
    </div>
  );
};

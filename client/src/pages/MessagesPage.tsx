import React from 'react';
import { MessagesTab } from './Dashboard/tabs/MessagesTab';

export const MessagesPage = () => {
  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MessagesTab />
      </div>
    </div>
  );
};

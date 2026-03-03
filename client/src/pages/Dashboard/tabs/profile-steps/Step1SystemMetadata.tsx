import React from 'react';

export const Step1SystemMetadata = ({ profile }: any) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">System Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">ID</label>
          <input type="text" value={profile?.id || ''} disabled className="mt-1 block w-full rounded-lg border-stone-300 bg-stone-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Email</label>
          <input type="text" value={profile?.user?.email || ''} disabled className="mt-1 block w-full rounded-lg border-stone-300 bg-stone-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">First Name</label>
          <input type="text" value={profile?.user?.firstName || ''} disabled className="mt-1 block w-full rounded-lg border-stone-300 bg-stone-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Last Name</label>
          <input type="text" value={profile?.user?.lastName || ''} disabled className="mt-1 block w-full rounded-lg border-stone-300 bg-stone-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Nickname</label>
          <input type="text" value={profile?.user?.nickname || ''} disabled className="mt-1 block w-full rounded-lg border-stone-300 bg-stone-50" />
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitProfile } from '../../../../api/userProfile';
import { Button } from '../../../../components/ui/Button';

export const Step6PreviewSubmit = ({ profile }: any) => {
  const qc = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: submitProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userProfile', 'me'] });
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Preview & Submit</h3>
      <div className="p-6 bg-stone-50 rounded-lg space-y-4">
        <div>
          <p className="text-sm font-medium text-stone-700">Status</p>
          <p className="text-sm text-stone-600">{profile?.profileStatus || 'DRAFT'}</p>
        </div>
        {profile?.featuredImageUrl && (
          <img src={profile.featuredImageUrl} alt="Portrait" className="w-32 h-40 object-cover rounded" />
        )}
        <div>
          <p className="text-sm font-medium text-stone-700">Bio</p>
          <p className="text-sm text-stone-600">{profile?.bio || 'No bio'}</p>
        </div>
      </div>
      <Button onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
        Submit for Review
      </Button>
    </div>
  );
};

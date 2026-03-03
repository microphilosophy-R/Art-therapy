import React, { useState } from 'react';
import { uploadFile } from '../../../../api/upload';

export const Step3PublicProfile = ({ profile, onSave }: any) => {
  const [formData, setFormData] = useState({
    featuredImageUrl: profile?.featuredImageUrl || '',
    bio: profile?.bio || '',
    socialMediaLink: profile?.socialMediaLink || '',
    qrCodeUrl: profile?.qrCodeUrl || '',
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await uploadFile(file, 'therapist-portrait');
    const updated = { ...formData, featuredImageUrl: url };
    setFormData(updated);
    onSave(updated);
  };

  const handleChange = (field: string, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Public Profile</h3>
      <div>
        <label className="block text-sm font-medium">Portrait (4:5 ratio)</label>
        <input type="file" accept="image/*" onChange={handleImageUpload} className="mt-1" />
        {formData.featuredImageUrl && <img src={formData.featuredImageUrl} alt="Portrait" className="mt-2 w-32 h-40 object-cover rounded" />}
      </div>
      <div>
        <label className="block text-sm font-medium">Bio</label>
        <textarea value={formData.bio} onChange={(e) => handleChange('bio', e.target.value)} rows={4} className="mt-1 block w-full rounded-lg border-stone-300" />
      </div>
      <div>
        <label className="block text-sm font-medium">Social Media Link</label>
        <input type="url" value={formData.socialMediaLink} onChange={(e) => handleChange('socialMediaLink', e.target.value)} className="mt-1 block w-full rounded-lg border-stone-300" />
      </div>
    </div>
  );
};

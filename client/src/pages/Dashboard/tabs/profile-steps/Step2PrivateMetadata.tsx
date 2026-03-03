import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const Step2PrivateMetadata = ({ profile, onSave }: any) => {
  const [formData, setFormData] = useState({
    telephone: profile?.telephone || '',
    birthday: profile?.birthday || '',
    region: profile?.region || '',
    religion: profile?.religion || '',
    privateFields: profile?.privateFields || {},
  });

  const togglePrivacy = (field: string) => {
    const updated = {
      ...formData,
      privateFields: { ...formData.privateFields, [field]: !formData.privateFields[field] },
    };
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
      <h3 className="text-lg font-semibold">Private Metadata</h3>
      {['telephone', 'birthday', 'region', 'religion'].map(field => (
        <div key={field} className="flex items-center gap-2">
          <input
            type={field === 'birthday' ? 'date' : 'text'}
            value={formData[field as keyof typeof formData] as string}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            className="flex-1 rounded-lg border-stone-300"
          />
          <button type="button" onClick={() => togglePrivacy(field)} className="p-2 hover:bg-stone-100 rounded">
            {formData.privateFields[field] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      ))}
    </div>
  );
};

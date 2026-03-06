import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  createMemberAddress,
  deleteMemberAddress,
  getMemberAddresses,
  setDefaultMemberAddress,
  updateMemberAddress,
  type AddressTag,
  type MemberAddress,
} from '../../api/profile';
import { Button } from '../ui/Button';

type AddressFormState = {
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  district: string;
  addressDetail: string;
  postalCode: string;
  tag: AddressTag;
  isDefault: boolean;
};

const MAX_ADDRESSES = 6;

const emptyForm: AddressFormState = {
  recipientName: '',
  mobile: '',
  province: '',
  city: '',
  district: '',
  addressDetail: '',
  postalCode: '',
  tag: 'HOME',
  isDefault: false,
};

const mobileRegex = /^1\d{10}$/;

interface AddressBookPanelProps {
  selectable?: boolean;
  selectedAddressId?: string | null;
  onSelectAddress?: (addressId: string) => void;
  title?: string;
  subtitle?: string;
}

export const AddressBookPanel = ({
  selectable = false,
  selectedAddressId,
  onSelectAddress,
  title,
  subtitle,
}: AddressBookPanelProps) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['member-addresses'],
    queryFn: getMemberAddresses,
  });

  const createMutation = useMutation({
    mutationFn: createMemberAddress,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['member-addresses'] });
      if (selectable && onSelectAddress) onSelectAddress(created.id);
      setForm(emptyForm);
      setEditingAddressId(null);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? t('common.errors.tryAgain'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateMemberAddress(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['member-addresses'] });
      if (selectable && onSelectAddress) onSelectAddress(updated.id);
      setForm(emptyForm);
      setEditingAddressId(null);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? t('common.errors.tryAgain'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMemberAddress,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-addresses'] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? t('common.errors.tryAgain'));
    },
  });

  const defaultMutation = useMutation({
    mutationFn: setDefaultMemberAddress,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['member-addresses'] });
      if (selectable && onSelectAddress) onSelectAddress(updated.id);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? t('common.errors.tryAgain'));
    },
  });

  const canCreate = useMemo(
    () => addresses.length < MAX_ADDRESSES || editingAddressId !== null,
    [addresses.length, editingAddressId],
  );

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    defaultMutation.isPending;

  const tagLabels = useMemo<Record<AddressTag, string>>(
    () => ({
      HOME: t('shop.checkout.addressTags.HOME', 'Home'),
      COMPANY: t('shop.checkout.addressTags.COMPANY', 'Company'),
      SCHOOL: t('shop.checkout.addressTags.SCHOOL', 'School'),
      PARENTS: t('shop.checkout.addressTags.PARENTS', 'Parents'),
      OTHER: t('shop.checkout.addressTags.OTHER', 'Other'),
    }),
    [t],
  );

  const loadToForm = (address: MemberAddress) => {
    setEditingAddressId(address.id);
    setForm({
      recipientName: address.recipientName,
      mobile: address.mobile,
      province: address.province,
      city: address.city,
      district: address.district,
      addressDetail: address.addressDetail,
      postalCode: address.postalCode ?? '',
      tag: address.tag,
      isDefault: address.isDefault,
    });
    setError(null);
  };

  const resetForm = () => {
    setEditingAddressId(null);
    setForm(emptyForm);
    setError(null);
  };

  const validate = () => {
    if (!form.recipientName.trim()) return t('shop.checkout.validation.recipientRequired', 'Recipient name is required');
    if (!mobileRegex.test(form.mobile.trim())) return t('shop.checkout.validation.mobileInvalid', 'China mobile must be 11 digits');
    if (!form.province.trim() || !form.city.trim() || !form.district.trim()) {
      return t('shop.checkout.validation.regionRequired', 'Province / city / district are required');
    }
    if (form.addressDetail.trim().length < 5) {
      return t('shop.checkout.validation.addressDetailMin', 'Detailed address must be at least 5 characters');
    }
    if (form.postalCode.trim() && !/^\d{6}$/.test(form.postalCode.trim())) {
      return t('shop.checkout.validation.postalCodeInvalid', 'Postal code must be 6 digits');
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      recipientName: form.recipientName.trim(),
      mobile: form.mobile.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      addressDetail: form.addressDetail.trim(),
      postalCode: form.postalCode.trim() || null,
      tag: form.tag,
      isDefault: form.isDefault,
    };

    if (editingAddressId) {
      updateMutation.mutate({ id: editingAddressId, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  if (isLoading) return <p className="text-sm text-stone-500">{t('common.loading')}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-stone-900">
          {title ?? t('shop.checkout.addressBookTitle', 'Address Book')}
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          {subtitle ?? t('shop.checkout.addressBookHint', 'You can store up to 6 delivery addresses.')}
          {' '}({addresses.length}/{MAX_ADDRESSES})
        </p>
      </div>

      {addresses.length > 0 && (
        <div className="space-y-2">
          {addresses.map((address) => {
            const selected = selectedAddressId === address.id;
            return (
              <div
                key={address.id}
                className={`rounded-lg border p-3 ${selected ? 'border-teal-500 bg-teal-50' : 'border-stone-200 bg-white'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {selectable && onSelectAddress && (
                    <input
                      type="radio"
                      checked={selected}
                      onChange={() => onSelectAddress(address.id)}
                      className="h-4 w-4"
                    />
                  )}
                  <span className="text-sm font-medium text-stone-900">{address.recipientName}</span>
                  <span className="text-xs text-stone-500">{address.mobile}</span>
                  <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                    {tagLabels[address.tag]}
                  </span>
                  {address.isDefault && (
                    <span className="inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700">
                      {t('shop.checkout.defaultAddress', 'Default')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-700 mt-1">
                  {address.province} {address.city} {address.district} {address.addressDetail}
                  {address.postalCode ? ` (${address.postalCode})` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!address.isDefault && (
                    <Button size="sm" variant="outline" onClick={() => defaultMutation.mutate(address.id)} disabled={isBusy}>
                      {t('shop.checkout.setDefault', 'Set default')}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => loadToForm(address)} disabled={isBusy}>
                    {t('common.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm(t('common.confirmDelete'))) deleteMutation.mutate(address.id);
                    }}
                    disabled={isBusy}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canCreate ? (
        <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-stone-900">
            {editingAddressId
              ? t('shop.checkout.editAddress', 'Edit Address')
              : t('shop.checkout.addAddress', 'Add Address')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.recipientName}
              onChange={(e) => setForm((prev) => ({ ...prev, recipientName: e.target.value }))}
              placeholder={t('shop.checkout.recipientName')}
              className="h-10 rounded-lg border border-stone-300 px-3 text-sm"
            />
            <input
              value={form.mobile}
              onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
              placeholder={t('shop.checkout.phoneNumber')}
              className="h-10 rounded-lg border border-stone-300 px-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={form.province}
              onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
              placeholder={t('shop.checkout.province')}
              className="h-10 rounded-lg border border-stone-300 px-3 text-sm"
            />
            <input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder={t('shop.checkout.city')}
              className="h-10 rounded-lg border border-stone-300 px-3 text-sm"
            />
            <input
              value={form.district}
              onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))}
              placeholder={t('shop.checkout.district')}
              className="h-10 rounded-lg border border-stone-300 px-3 text-sm"
            />
          </div>

          <input
            value={form.addressDetail}
            onChange={(e) => setForm((prev) => ({ ...prev, addressDetail: e.target.value }))}
            placeholder={t('shop.checkout.addressPlaceholder')}
            className="h-10 w-full rounded-lg border border-stone-300 px-3 text-sm"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <input
              value={form.postalCode}
              onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
              placeholder={t('shop.checkout.postalCode', 'Postal Code (optional)')}
              className="h-10 rounded-lg border border-stone-300 px-3 text-sm"
            />
            <select
              value={form.tag}
              onChange={(e) => setForm((prev) => ({ ...prev, tag: e.target.value as AddressTag }))}
              className="h-10 rounded-lg border border-stone-300 px-3 text-sm bg-white"
            >
              {(Object.keys(tagLabels) as AddressTag[]).map((tag) => (
                <option key={tag} value={tag}>{tagLabels[tag]}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
              />
              {t('shop.checkout.setAsDefault', 'Set as default')}
            </label>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={createMutation.isPending || updateMutation.isPending}>
              {editingAddressId ? t('common.save') : t('shop.checkout.addAddress', 'Add Address')}
            </Button>
            {editingAddressId && (
              <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </form>
      ) : (
        <p className="text-xs text-amber-700">{t('shop.checkout.maxAddressReached', 'Maximum 6 addresses reached')}</p>
      )}
    </div>
  );
};

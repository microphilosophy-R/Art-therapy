import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, ShoppingBag } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import api from '../../../api/axios';
import { getPosterUrl } from '../../../utils/therapyPlanUtils';
import { getProductCoverUrl } from '../../../utils/productMedia';

interface ShowcaseItem {
  id: string;
  type: 'plan' | 'product';
  visible: boolean;
  order: number;
  data?: any;
}

const SortableItem = ({ item, onToggleVisibility, t }: { item: ShowcaseItem; onToggleVisibility: (id: string) => void; t: any }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-3">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-600">
        <GripVertical className="h-5 w-5" />
      </button>

      {item.type === 'product' && (
        getProductCoverUrl(item.data) ? (
          <img src={getProductCoverUrl(item.data)!} alt="" className="w-16 h-16 object-cover rounded" />
        ) : (
          <div className="w-16 h-16 rounded bg-stone-100 flex items-center justify-center text-stone-300">
            <ShoppingBag className="h-4 w-4" />
          </div>
        )
      )}
      {item.type === 'plan' && item.data && (
        <img src={getPosterUrl(item.data)} alt="" className="w-16 h-16 object-cover rounded" />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-stone-900 truncate">{item.data?.title || t('dashboard.showcase.untitled')}</p>
        <p className="text-xs text-stone-500">{t(`dashboard.showcase.itemTypes.${item.type}`)}</p>
      </div>

      <button
        onClick={() => onToggleVisibility(item.id)}
        className={`p-2 rounded ${item.visible ? 'text-teal-600 hover:bg-teal-50' : 'text-stone-400 hover:bg-stone-50'}`}
      >
        {item.visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
      </button>
    </div>
  );
};

export const ShowcaseTabEnhanced = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ShowcaseItem[]>([]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await api.get('/profile/me');
      return res.data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['my-products'],
    queryFn: async () => {
      const res = await api.get('/shop/products?sellerId=' + profile?.id + '&status=PUBLISHED');
      return res.data.data;
    },
    enabled: !!profile?.id,
  });

  const { data: plansData } = useQuery({
    queryKey: ['my-plans'],
    queryFn: async () => {
      const res = await api.get('/therapy-plans?role=creator&status=PUBLISHED');
      return res.data.data;
    },
  });

  React.useEffect(() => {
    if (profile?.showcaseOrder) {
      const order = JSON.parse(profile.showcaseOrder);
      const mapped = order.map((o: any) => {
        const data = o.type === 'product'
          ? products?.find((p: any) => p.id === o.id)
          : plansData?.find((p: any) => p.id === o.id);
        return { ...o, data };
      });
      setItems(mapped);
    } else if (products || plansData) {
      const newItems: ShowcaseItem[] = [];
      products?.forEach((p: any, i: number) => newItems.push({ id: p.id, type: 'product', visible: true, order: i, data: p }));
      plansData?.forEach((p: any, i: number) => newItems.push({ id: p.id, type: 'plan', visible: true, order: products?.length + i, data: p }));
      setItems(newItems);
    }
  }, [profile, products, plansData]);

  const updateMutation = useMutation({
    mutationFn: async (items: ShowcaseItem[]) => {
      const order = items.map(({ id, type, visible, order }) => ({ id, type, visible, order }));
      await api.patch('/profile/showcase', { items: order });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex).map((item, i) => ({ ...item, order: i }));
        updateMutation.mutate(newItems);
        return newItems;
      });
    }
  };

  const handleToggleVisibility = (id: string) => {
    const newItems = items.map((item) => item.id === id ? { ...item, visible: !item.visible } : item);
    setItems(newItems);
    updateMutation.mutate(newItems);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">{t('dashboard.showcase.title')}</h2>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p>{t('dashboard.showcase.emptyMessage')}</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableItem key={item.id} item={item} onToggleVisibility={handleToggleVisibility} t={t} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

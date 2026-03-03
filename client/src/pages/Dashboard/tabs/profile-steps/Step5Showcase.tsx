import React, { useState } from 'react';

export const Step5Showcase = ({ profile, onSave }: any) => {
  const [showcaseConfig, setShowcaseConfig] = useState(profile?.showcaseConfig || { products: [], plans: [] });

  const toggleVisibility = (type: 'products' | 'plans', id: string) => {
    const items = showcaseConfig[type];
    const updated = items.map((item: any) =>
      item.id === id ? { ...item, visible: !item.visible } : item
    );
    const newConfig = { ...showcaseConfig, [type]: updated };
    setShowcaseConfig(newConfig);
    onSave({ showcaseConfig: newConfig });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Showcase</h3>
      <div>
        <h4 className="font-medium mb-2">Products</h4>
        {showcaseConfig.products?.length === 0 && <p className="text-sm text-stone-500">No products to showcase</p>}
      </div>
      <div>
        <h4 className="font-medium mb-2">Therapy Plans</h4>
        {showcaseConfig.plans?.length === 0 && <p className="text-sm text-stone-500">No plans to showcase</p>}
      </div>
    </div>
  );
};

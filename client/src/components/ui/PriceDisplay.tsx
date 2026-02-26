import React from 'react';
import { useTranslation } from 'react-i18next';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { formatCNY, formatUSD } from '../../utils/formatters';

interface PriceDisplayProps {
  /** Session price in CNY yuan (as stored in DB) */
  cnyAmount: number;
  /** Extra CSS classes for the primary price */
  className?: string;
  /** Show the USD conversion line (default: true for non-zh languages) */
  showConversion?: boolean;
}

/**
 * Displays a price in CNY as primary currency.
 * When language is not Chinese, also shows a live USD conversion via cn.apihz.cn.
 */
export const PriceDisplay = ({ cnyAmount, className, showConversion }: PriceDisplayProps) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  // Only fetch rate for non-Chinese users (or when caller explicitly wants it)
  const shouldConvert = showConversion !== undefined ? showConversion : !isZh;
  const { rate, isLoading } = useExchangeRate(shouldConvert ? 'CNY' : '', shouldConvert ? 'USD' : '');

  const usdAmount = rate !== null ? cnyAmount * rate : null;

  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span className={className}>{formatCNY(cnyAmount)}</span>
      {shouldConvert && (
        <span className="text-xs text-stone-400 font-normal">
          {isLoading || usdAmount === null
            ? '≈ … USD'
            : `≈ ${formatUSD(usdAmount)}`}
        </span>
      )}
    </span>
  );
};

import { useState } from 'react';
import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/formatters';

interface AvatarProps {
  src?: string;
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

export const Avatar = ({ src, firstName, lastName, size = 'md', className }: AvatarProps) => {
  const initials = getInitials(firstName, lastName);
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full',
        'bg-teal-100 text-teal-700 font-semibold overflow-hidden',
        sizeMap[size],
        className
      )}
    >
      {src && !imgFailed ? (
        <img
          src={src}
          alt={`${firstName} ${lastName}`}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
};

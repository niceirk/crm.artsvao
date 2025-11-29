'use client';

import { Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitiateCall } from '@/hooks/use-novofon';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/utils/phone';

interface CallButtonProps {
  /** Номер телефона для звонка */
  phoneNumber: string;
  /** ID клиента (для привязки к истории) */
  clientId?: string;
  /** Вариант кнопки */
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  /** Размер кнопки */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Показывать текст "Позвонить" */
  showLabel?: boolean;
  /** Дополнительные классы */
  className?: string;
}

export function CallButton({
  phoneNumber,
  clientId,
  variant = 'ghost',
  size = 'icon',
  showLabel = false,
  className,
}: CallButtonProps) {
  const { mutate: initiateCall, isPending } = useInitiateCall();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!phoneNumber) return;

    initiateCall({
      toNumber: phoneNumber,
      clientId,
    });
  };

  if (!phoneNumber) return null;

  const formattedNumber = formatPhoneNumber(phoneNumber);

  const button = (
    <Button
      variant={variant}
      size={showLabel ? size : 'icon'}
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'text-green-600 hover:text-green-700 hover:bg-green-50',
        showLabel && 'gap-2',
        className
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Phone className="h-4 w-4" />
      )}
      {showLabel && (isPending ? 'Звоним...' : 'Позвонить')}
    </Button>
  );

  if (showLabel) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>Позвонить {formattedNumber || phoneNumber}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

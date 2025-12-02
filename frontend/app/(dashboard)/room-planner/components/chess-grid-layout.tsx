'use client';

import { useMemo, ReactNode, useRef, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CHESS_GRID, TOTAL_ROWS, generateTimeSlots, formatTimeLabel } from '@/lib/utils/chess-grid';

// Константы layout
export const CHESS_LAYOUT = {
  TIME_COLUMN_WIDTH: 60,
  MIN_COLUMN_WIDTH: 150,
  ROW_HEIGHT: 48,
  HEADER_HEIGHT: 40,
} as const;

export interface ChessColumn {
  id: string;
  name: string;
  subtext?: string;
  isHighlighted?: boolean;
}

interface ChessGridLayoutProps {
  columns: ChessColumn[];
  containerHeight?: string;
  scale?: number;
  onCellMouseDown?: (columnId: string, slotIndex: number, e: React.MouseEvent) => void;
  onCellMouseEnter?: (columnId: string, slotIndex: number) => void;
  onCellMouseUp?: () => void;
  isCellSelected?: (columnId: string, slotIndex: number) => boolean;
  renderColumnHeader?: (column: ChessColumn) => ReactNode;
  renderColumnContent?: (column: ChessColumn, columnIndex: number) => ReactNode;
  currentTimePosition?: number | null;
}

/**
 * Универсальный компонент шахматки с CSS Grid и sticky позиционированием
 *
 * Структура:
 * - Единый скролл-контейнер с overflow: auto
 * - CSS Grid: первая колонка (время) = sticky left, первая строка (заголовки) = sticky top
 * - Каждая колонка данных - это один высокий div с фоновыми полосами
 * - Карточки рендерятся через renderColumnContent с абсолютным позиционированием
 */
export function ChessGridLayout({
  columns,
  containerHeight = 'calc(100vh - 70px)',
  scale = 1.0,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  isCellSelected,
  renderColumnHeader,
  renderColumnContent,
  currentTimePosition,
}: ChessGridLayoutProps) {
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Масштабированные размеры
  const scaledColumnWidth = Math.round(CHESS_LAYOUT.MIN_COLUMN_WIDTH * scale);
  const scaledTimeColumnWidth = Math.round(CHESS_LAYOUT.TIME_COLUMN_WIDTH * scale);

  return (
    <div
      className="border rounded-lg bg-background overflow-x-auto overflow-y-hidden"
      style={{ height: containerHeight }}
      onMouseUp={onCellMouseUp}
    >
      {/* CSS Grid: время слева (sticky), заголовки сверху (sticky), данные справа */}
      <div
        className="grid h-full"
        style={{
          display: 'grid',
          gridTemplateColumns: `${scaledTimeColumnWidth}px repeat(${columns.length}, minmax(${scaledColumnWidth}px, 1fr))`,
          gridTemplateRows: `${CHESS_LAYOUT.HEADER_HEIGHT}px 1fr`,
          minWidth: scaledTimeColumnWidth + columns.length * scaledColumnWidth,
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            СТРОКА 1: Заголовки (sticky top)
            ═══════════════════════════════════════════════════════════════════ */}

        {/* Угловая ячейка - sticky top + left */}
        <div
          className="sticky left-0 top-0 z-30 bg-muted/30 border-b border-r"
          style={{ gridColumn: 1, gridRow: 1 }}
        />

        {/* Заголовки колонок - sticky top */}
        {columns.map((column, colIndex) => (
          <Tooltip key={`header-${column.id}`}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'sticky top-0 z-20 border-b border-r px-2 flex items-center bg-muted/30 cursor-default',
                  column.isHighlighted && 'bg-primary/10'
                )}
                style={{ gridColumn: colIndex + 2, gridRow: 1 }}
              >
                {renderColumnHeader ? (
                  renderColumnHeader(column)
                ) : (
                  <div className="font-semibold text-xs truncate">
                    {column.name}
                    {column.subtext && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        ({column.subtext})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="font-medium">
                {column.name}
                {column.subtext && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({column.subtext})
                  </span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* ═══════════════════════════════════════════════════════════════════
            СТРОКА 2: Данные (время + колонки)
            ═══════════════════════════════════════════════════════════════════ */}

        {/* Колонка времени - sticky left */}
        <div
          className="sticky left-0 z-10 bg-background border-r flex flex-col"
          style={{ gridColumn: 1, gridRow: 2 }}
        >
          {timeSlots.map((time, rowIndex) => (
            <div
              key={`time-${rowIndex}`}
              className={cn(
                'flex-1 flex items-start justify-end pr-2 text-xs text-muted-foreground border-b min-h-0',
                rowIndex % 2 === 0 ? 'font-medium' : 'text-[10px] opacity-60'
              )}
            >
              <span className="-mt-1.5">
                {rowIndex % 2 === 0 ? formatTimeLabel(time) : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Колонки данных */}
        {columns.map((column, colIndex) => (
          <div
            key={`data-${column.id}`}
            className="relative border-r select-none flex flex-col"
            style={{ gridColumn: colIndex + 2, gridRow: 2 }}
          >
            {/* Фоновые ячейки (полосы) */}
            {timeSlots.map((_, rowIndex) => {
              const isSelected = isCellSelected?.(column.id, rowIndex) ?? false;

              return (
                <div
                  key={`bg-${rowIndex}`}
                  className={cn(
                    'flex-1 border-b cursor-pointer transition-colors min-h-0',
                    rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                    column.isHighlighted && (rowIndex % 2 === 0 ? 'bg-primary/5' : 'bg-primary/10'),
                    isSelected && 'bg-primary/20',
                    !isSelected && 'hover:bg-muted/50'
                  )}
                  onMouseDown={(e) => onCellMouseDown?.(column.id, rowIndex, e)}
                  onMouseEnter={() => onCellMouseEnter?.(column.id, rowIndex)}
                />
              );
            })}

            {/* Контент колонки (карточки с абсолютным позиционированием) */}
            {renderColumnContent?.(column, colIndex)}

            {/* Линия текущего времени (для каждой колонки) */}
            {currentTimePosition !== null && (
              <div
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{ top: `${currentTimePosition}%` }}
              >
                <div className="w-full h-0.5 bg-red-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Хелпер: расчет позиции карточки в процентах от высоты колонки
 */
export function getActivityPositionPercent(
  startTime: string,
  endTime: string
): { top: number; height: number } {
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const gridStartMinutes = CHESS_GRID.START_HOUR * 60;
  const gridEndMinutes = CHESS_GRID.END_HOUR * 60;
  const totalMinutes = gridEndMinutes - gridStartMinutes;

  const effectiveStart = Math.max(startMinutes, gridStartMinutes);
  const effectiveEnd = Math.min(endMinutes, gridEndMinutes);

  const top = ((effectiveStart - gridStartMinutes) / totalMinutes) * 100;
  const height = ((effectiveEnd - effectiveStart) / totalMinutes) * 100;

  return { top, height };
}

/**
 * Хелпер: получить стили для карточки с учетом пересечений (для недельного вида)
 */
export function getOverlappingCardStyle(
  topPercent: number,
  heightPercent: number,
  column: number = 0,
  totalColumns: number = 1
): CSSProperties {
  const width = 100 / totalColumns;
  const left = column * width;

  return {
    position: 'absolute',
    top: `${topPercent}%`,
    height: `${heightPercent}%`,
    left: `calc(${left}% + 2px)`,
    width: `calc(${width}% - 4px)`,
  };
}

/**
 * Хелпер: получить стили для обычной карточки (для дневного вида)
 */
export function getSimpleCardStyle(
  topPercent: number,
  heightPercent: number
): CSSProperties {
  return {
    position: 'absolute',
    top: `${topPercent}%`,
    height: `${heightPercent}%`,
    left: '4px',
    right: '4px',
  };
}

-- Добавляем extension для exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Создаем функцию для преобразования time в timerange
CREATE OR REPLACE FUNCTION time_range(start_time time, end_time time)
RETURNS tsrange AS $$
BEGIN
  -- Преобразуем time в timestamp для создания range
  -- Используем фиксированную дату 1970-01-01
  RETURN tsrange(
    '1970-01-01'::date + start_time,
    '1970-01-01'::date + end_time,
    '[)'  -- левая граница включена, правая исключена
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Добавляем exclusion constraint для предотвращения пересечения расписаний
-- Проверяет, что в одной комнате в один день не может быть пересекающихся по времени занятий
-- Исключаем отмененные занятия (status = 'CANCELLED')
ALTER TABLE schedules
ADD CONSTRAINT no_overlapping_schedules
EXCLUDE USING gist (
  room_id WITH =,
  date WITH =,
  time_range(start_time, end_time) WITH &&
)
WHERE (status != 'CANCELLED');

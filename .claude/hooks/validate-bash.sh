#!/bin/bash
# Hook для валидации bash команд перед выполнением
# Блокирует опасные команды

input=$(cat)

# Извлекаем команду из JSON без jq (простой grep/sed)
command=$(echo "$input" | grep -oP '"command"\s*:\s*"\K[^"]+' | head -1)

# Если не смогли извлечь команду, пропускаем
if [[ -z "$command" ]]; then
  exit 0
fi

# Блокировать удаление корневых директорий
if [[ "$command" =~ rm[[:space:]]+-rf[[:space:]]+/ ]] || \
   [[ "$command" =~ rm[[:space:]]+-rf[[:space:]]+\* ]]; then
  echo '{"decision": "block", "reason": "Blocked: Dangerous recursive delete command"}'
  exit 0
fi

# Блокировать force push на main/master
if [[ "$command" =~ git[[:space:]]+push[[:space:]]+.*--force.*(main|master) ]] || \
   [[ "$command" =~ git[[:space:]]+push[[:space:]]+-f.*(main|master) ]]; then
  echo '{"decision": "block", "reason": "Blocked: Force push to main/master not allowed"}'
  exit 0
fi

# Разрешить все остальные команды
exit 0

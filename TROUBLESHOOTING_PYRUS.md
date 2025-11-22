# Решение проблемы с переменными окружения Pyrus

## Описание проблемы

На облачном сервере на странице интеграции с Pyrus отображалась ошибка:
```
Ошибка подключения
Не настроены учетные данные Pyrus. Проверьте PYRUS_LOGIN и PYRUS_SECURITY_KEY в .env
```

Хотя переменные были добавлены в `.env.production` на сервере, они не попадали в Docker контейнер.

## Причины проблемы

### 1. Отсутствие переменных в `.env.production`
Переменные `PYRUS_LOGIN`, `PYRUS_SECURITY_KEY` и `PYRUS_FORM_ID` не были добавлены в файл `.env.production` на сервере при его создании.

### 2. Неправильная конфигурация Docker Compose
В файле `docker-compose.prod.yml` переменные были объявлены в секции `environment`:
```yaml
environment:
  PYRUS_LOGIN: ${PYRUS_LOGIN}
  PYRUS_SECURITY_KEY: ${PYRUS_SECURITY_KEY}
  PYRUS_FORM_ID: ${PYRUS_FORM_ID}
```

**Проблема**: Docker Compose искал эти переменные в **окружении хост-системы**, а не в файле `.env.production`.

### 3. Конфликт между `env_file` и `environment`
Даже после добавления директивы `env_file: .env.production`, переменные в секции `environment` **переопределяли** значения из файла пустыми значениями из окружения хоста.

### 4. Пробел в скрипте проверки
Скрипт `scripts/check-docker-compose.sh` проверял наличие переменных в `.env.production`, но **не проверял**, что Docker Compose сможет их увидеть.

## Решение

### 1. Добавлены переменные в `.env.production`
```bash
# Pyrus CRM Integration
PYRUS_LOGIN=nikita@artsvao.ru
PYRUS_SECURITY_KEY=NmmxZO2GPI2AkwQSEhJMsOju2r4yqBYTdnajDhYur8lpnC4EkBhrhTEQ~pF6HhcmijTElPwygvWAejTUOdx7C~4yFjvNNve3
PYRUS_FORM_ID=1022196
```

### 2. Исправлен `docker-compose.prod.yml`
Добавлена директива `env_file` и **удалены** дублирующие переменные из секции `environment`:

```yaml
backend:
  env_file:
    - .env.production
  environment:
    NODE_ENV: production
    PORT: 3000
```

**Важно**: Переменные из `env_file` автоматически становятся доступны в контейнере. Их **не нужно** дублировать в `environment`.

### 3. Улучшен скрипт проверки
В `scripts/check-docker-compose.sh` добавлена проверка наличия `env_file` директивы:

```bash
if grep -q "env_file:" docker-compose.prod.yml; then
    echo -e "${GREEN}✓${NC} Директива env_file найдена"

    # Проверка существования файлов
    ENV_FILES=$(grep -A 5 "env_file:" docker-compose.prod.yml | grep -E '^\s+-\s+' | sed 's/^\s*-\s*//' | tr -d '"')

    while IFS= read -r env_file; do
        if [ -f "$env_file" ]; then
            echo -e "${GREEN}✓${NC} Файл $env_file существует"
        else
            echo -e "${RED}✗${NC} Файл $env_file не найден!"
            ((ERRORS++))
        fi
    done <<< "$ENV_FILES"
fi
```

## Предотвращение подобных проблем

### 1. При добавлении новых переменных окружения:
- ✅ Добавьте переменную в `.env.production.example` с описанием
- ✅ Добавьте переменную в `.env.production` на сервере
- ✅ Если переменная опциональная, пометьте её как `false` в `scripts/check-env.sh`
- ✅ Убедитесь, что в `docker-compose.prod.yml` используется `env_file: .env.production`
- ✅ НЕ дублируйте переменные в секции `environment`, если они загружаются из `env_file`

### 2. Перед деплоем:
```bash
# Запустите скрипт проверки
bash pre-deploy-check.sh

# Или отдельные проверки
bash scripts/check-env.sh
bash scripts/check-docker-compose.sh
```

### 3. Docker Compose: `env_file` vs `environment`

**Используйте `env_file`** для:
- Переменных, специфичных для окружения (production/development)
- Конфиденциальных данных (пароли, API ключи)
- Большого количества переменных

**Используйте `environment`** для:
- Переопределения значений из `env_file`
- Статических значений (NODE_ENV=production)
- Переменных, одинаковых для всех окружений

**НЕ смешивайте**: Если переменная в `env_file`, не используйте `VARIABLE: ${VARIABLE}` в `environment`!

## Проверка работы

После применения исправлений:

```bash
# На сервере проверьте переменные в контейнере
docker compose -f docker-compose.prod.yml exec backend printenv | grep PYRUS

# Должны отобразиться:
# PYRUS_LOGIN=nikita@artsvao.ru
# PYRUS_SECURITY_KEY=NmmxZO2GPI2AkwQSEhJMsOju2r4yqBYTdnajDhYur8lpnC4EkBhrhTEQ~pF6HhcmijTElPwygvWAejTUOdx7C~4yFjvNNve3
# PYRUS_FORM_ID=1022196
```

## Связанные файлы
- `docker-compose.prod.yml:31-35` - Конфигурация env_file
- `scripts/check-docker-compose.sh:28-51` - Проверка env_file
- `scripts/check-env.sh:114-116` - Проверка переменных PYRUS
- `.env.production.example:32-35` - Шаблон переменных PYRUS

# Публикация ГЕОСВОИ на сервере

Один Node.js-процесс обслуживает production-файлы, API и WebSocket `/ws`. Не нужен отдельный frontend-хостинг или второй порт для multiplayer.

## Требования

- Node.js **20.19+**, рекомендуется 22 LTS;
- npm 10+;
- публичный HTTP/HTTPS-домен для игры с друзьями через интернет;
- необязательный браузерный ключ Maps JavaScript API.

## Обычный production-запуск

```bash
npm ci
npm run test:content
VITE_GOOGLE_MAPS_API_KEY=ваш_ключ npm run build
npm start
```

Если Google не нужен, соберите без переменной — останутся резервные панорамы.

Сервер по умолчанию слушает `0.0.0.0:3000`:

```bash
PORT=8080 npm start
```

Проверка:

```bash
curl http://127.0.0.1:3000/api/health
```

Ожидаемый ответ содержит `ok: true`, число комнат и серверное время.

Для минимального production-окружения после сборки можно удалить dev-зависимости:

```bash
npm prune --omit=dev
npm start
```

`tsx` и `cross-env` находятся в runtime-зависимостях и останутся доступны.

## Docker Compose

Самый простой вариант:

```bash
docker compose up --build -d
docker compose ps
```

Откройте `http://SERVER_IP:3000`. Остановка:

```bash
docker compose down
```

Другой внешний порт:

```bash
APP_PORT=8080 docker compose up --build -d
```

С Google Maps:

```bash
VITE_GOOGLE_MAPS_API_KEY=ваш_ключ docker compose up --build -d
```

Compose передаёт ключ как **build argument**: клиентский bundle должен быть собран с ним. При смене ключа повторите `up --build`.

Образ запускается от пользователя `node`, имеет healthcheck и не требует volume. Комнаты находятся в памяти, поэтому пересоздание контейнера удаляет активные матчи.

## Docker без Compose

```bash
docker build \
  --build-arg VITE_GOOGLE_MAPS_API_KEY=ваш_ключ \
  -t geosvoi:1.0.0 .

docker run -d \
  --name geosvoi \
  --restart unless-stopped \
  -p 3000:3000 \
  geosvoi:1.0.0
```

Без Google-ключа опустите `--build-arg`.

## Nginx reverse proxy

WebSocket должен работать на **том же домене**, что и сайт. Браузерный клиент автоматически использует `ws://` для HTTP и `wss://` для HTTPS.

Пример `/etc/nginx/sites-available/geosvoi`:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name geo.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
    }
}
```

После настройки включите HTTPS через Certbot или ваш ingress. Не перенаправляйте `/ws` на другой домен: browser preview и production рассчитаны на same-origin соединение.

## PM2

```bash
npm install -g pm2
npm run build
pm2 start npm --name geosvoi -- start
pm2 save
pm2 startup
```

Полезные команды:

```bash
pm2 logs geosvoi
pm2 restart geosvoi
pm2 monit
```

## Обновление

```bash
git pull origin main
npm ci
npm run test:content
npm run build
pm2 restart geosvoi       # или: docker compose up --build -d
```

Предупредите игроков: restart удаляет активные комнаты и текущие матчи.

## Что сохраняется после перезапуска

| Данные | Где хранятся | После перезапуска |
|---|---|---|
| Комнаты, ответы, таймеры | Память Node.js | Удаляются |
| Монеты и рюкзак | `localStorage` браузера | Сохраняются |
| Настройки матча | `localStorage` браузера | Сохраняются |
| Google API key | Client bundle | Сохраняется до новой сборки |

## Ограничения текущей версии

- Запускайте **один процесс/контейнер** для всех участников одной комнаты. Без Redis комнаты не синхронизируются между репликами.
- Нет серверных аккаунтов: профиль нельзя перенести между браузерами автоматически.
- Нет административного восстановления матча после перезапуска.
- Для публичного высоконагруженного сервиса добавьте Redis/БД, авторизацию, rate limits, мониторинг и очистку неактивных комнат по более строгим правилам.

## Checklist перед открытием ссылки друзьям

- [ ] `npm run test:content` проходит.
- [ ] `npm run build` проходит.
- [ ] `/api/health` отвечает с production-домена.
- [ ] Главная страница открывается по HTTPS.
- [ ] Второй браузер может создать/принять приглашение.
- [ ] Статус готовности и чат синхронизируются.
- [ ] При использовании Google домен добавлен в restrictions ключа.
- [ ] Открыт только нужный порт; `.env` не опубликован.

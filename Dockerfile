FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend ./frontend

RUN npm ci
RUN npm run build

FROM php:8.2-cli

WORKDIR /app

COPY . /app
COPY --from=frontend-build /app/app /app/app

RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT} router.php"]

FROM node:22.17.1-alpine3.22 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_CMS_URL=https://cms.luxudong.me
ARG VITE_AI_ASSISTANT_ENABLED=false
ARG VITE_AI_API_URL=
ARG VITE_TURNSTILE_SITE_KEY=
ENV VITE_CMS_URL=$VITE_CMS_URL
ENV VITE_AI_ASSISTANT_ENABLED=$VITE_AI_ASSISTANT_ENABLED
ENV VITE_AI_API_URL=$VITE_AI_API_URL
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
RUN npm run build

FROM nginx:1.29.0-alpine3.22
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

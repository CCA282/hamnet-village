FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_ACCOUNTS_URL
ENV VITE_ACCOUNTS_URL=$VITE_ACCOUNTS_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

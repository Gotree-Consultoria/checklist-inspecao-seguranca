# Estágio 1: Build do Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Estágio 2: Servidor Nginx
FROM nginx:alpine
# Remove a página "Welcome to nginx"
RUN rm -rf /usr/share/nginx/html/*

# Copia o build para uma pasta temporária para encontrar o index.html
COPY --from=build /app/dist /tmp/dist

# Script inteligente: Encontra onde está o index.html e move para o Nginx
RUN DIR=$(find /tmp/dist -name index.html -exec dirname {} \; | head -n 1) && \
    if [ -z "$DIR" ]; then \
        echo "ERRO: Build falhou! index.html não encontrado."; \
        ls -R /tmp/dist; \
        exit 1; \
    else \
        echo "Site encontrado em: $DIR"; \
        cp -r $DIR/* /usr/share/nginx/html/; \
    fi

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
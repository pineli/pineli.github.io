FROM nginx:alpine

# Copy site files
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/
COPY fs/ /usr/share/nginx/html/fs/

# Nginx config to serve hidden files (dotfiles like .bashrc)
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    add_header Cache-Control "no-store, no-cache, must-revalidate"; \
    location / { \
    try_files $uri $uri/ /index.html; \
    } \
    location ~ /\. { \
    allow all; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

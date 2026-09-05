FROM nginx:1.29-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Basic non-root user (nginx official image supports this)
RUN chown -R nginx:nginx /var/cache/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

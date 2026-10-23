FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend-build /frontend/dist/ /frontend/dist/
COPY database/ /database/
COPY data/staging/dataset.json /data/staging/dataset.json
COPY data/staging/media.tar.gz /tmp/tcv-media.tar.gz
RUN mkdir -p /opt/tcv-media && tar -xzf /tmp/tcv-media.tar.gz -C /opt/tcv-media && chmod -R a-w /opt/tcv-media
ENV NODE_ENV=production MEDIA_ROOT=/opt/tcv-media STAGING_DEMO_MODE=frozen-20261023
EXPOSE 3000
USER node
CMD ["node", "scripts/staging-start.js"]

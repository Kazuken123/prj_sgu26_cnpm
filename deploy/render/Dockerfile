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
COPY data/demo/locations/positions-v1.json /data/demo/locations/positions-v1.json
COPY data/demo/locations/positions-v2.json /data/demo/locations/positions-v2.json
COPY data/staging/media.tar.gz /tmp/tcv-media.tar.gz
COPY data/demo/fifteen/audio-manifest.json /data/demo/fifteen/audio-manifest.json
COPY data/demo/fifteen/extension.json /data/demo/fifteen/extension.json
COPY data/demo/fifteen/media.tar.gz /tmp/tcv-extra-media.tar.gz
COPY data/demo/additional-pois-translations.cjs /data/demo/additional-pois-translations.cjs
COPY data/demo/additional/audio-manifest.json /data/demo/additional/audio-manifest.json
COPY data/demo/additional/media.tar.gz /tmp/tcv-additional-media.tar.gz
RUN mkdir -p /opt/tcv-media && tar -xzf /tmp/tcv-media.tar.gz -C /opt/tcv-media \
    && tar -xzf /tmp/tcv-extra-media.tar.gz -C /opt/tcv-media \
    && tar -xzf /tmp/tcv-additional-media.tar.gz -C /opt/tcv-media \
    && rm /tmp/tcv-media.tar.gz /tmp/tcv-extra-media.tar.gz /tmp/tcv-additional-media.tar.gz \
    && chmod -R a-w /opt/tcv-media \
    && node -e "require('./config/packaged-assets').verify(new(require('./adapters/local-media'))({root:'/opt/tcv-media'})).then(x=>console.log('Verified packaged WAV files:',x.files.length)).catch(()=>process.exit(1))"
ENV NODE_ENV=production MEDIA_ROOT=/opt/tcv-media STAGING_DEMO_MODE=frozen-20261023 STAGING_DEMO_EXTRA_LANGUAGES=true STAGING_DEMO_ADDITIONAL_POIS=true
EXPOSE 3000
USER node
CMD ["node", "scripts/staging-start.js"]

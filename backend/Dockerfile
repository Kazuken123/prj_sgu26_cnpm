FROM node:20-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY frontend/ /frontend/
COPY database/migrations/ /database/migrations/

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
HEALTHCHECK --interval=10s --timeout=4s --start-period=15s --retries=5 CMD node -e "const http=require('node:http');const req=http.get('http://127.0.0.1:3000/health/ready',res=>{res.resume();process.exitCode=res.statusCode===200?0:1});req.setTimeout(3000,()=>req.destroy());req.on('error',()=>{process.exitCode=1})"
CMD ["node", "server.js"]

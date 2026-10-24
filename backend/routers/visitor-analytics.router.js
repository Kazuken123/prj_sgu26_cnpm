const express = require('express');
const { createAuthMiddleware, requireRole } = require('../middlewares/auth.middleware');
const serviceDefault = require('../services/visitor-analytics.service');
function createVisitorAnalyticsRouter(service=serviceDefault) {
  const router=express.Router(), attempts=new Map();
  router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.use((req,res,next)=>{
    const now=Date.now(), key=req.ip; let entry=attempts.get(key);
    if (!entry || now-entry.at>=60000) { if(attempts.size>=5000) {for(const [ip,value] of attempts) if(now-value.at>=60000) attempts.delete(ip); if(attempts.size>=5000) return res.status(429).json({code:'RATE_LIMITED',error:'Vui lòng thử lại sau.'});} entry={at:now,count:0,creates:0};attempts.set(key,entry); }
    entry.count++; if(req.path==='/sessions') entry.creates++;
    if(entry.count>600 || entry.creates>20) return res.set('Retry-After','60').status(429).json({code:'RATE_LIMITED',error:'Vui lòng thử lại sau.'});
    next();
  });
  router.post('/sessions',async(req,res,next)=>{try{res.status(201).json({data:await service.create()});}catch(e){next(e);}});
  router.post('/heartbeat',async(req,res,next)=>{try{res.json({data:await service.touch(req.get('Authorization')?.replace(/^Bearer /,''),req.body)});}catch(e){next(e);}});
  return router;
}
function createVisitorReportRouter(authService,service=serviceDefault) {
  const router=express.Router();
  router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.use(createAuthMiddleware(authService).verifyToken,requireRole('STAFF','ADMIN'));
  router.get('/',async(req,res,next)=>{try{res.json({data:await service.report(req.user,req.query)});}catch(e){next(e);}});
  return router;
}
module.exports={createVisitorAnalyticsRouter,createVisitorReportRouter};

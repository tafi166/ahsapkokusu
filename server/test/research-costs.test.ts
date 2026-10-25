import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { calculateCost, costInput } from '../src/research/costs';
import { createUser, login, ORIGIN, startApp, testPrisma } from './helpers';
export const scenario = { currency:'TRY' as const,quantity:'10',materialCost:'1000',wastePercent:'10',laborMinutes:'120',laborHourlyRate:'300',machineMinutes:'60',machineHourlyRate:'200',finishingCost:'100',overheadCost:'0',packagingPerUnit:'10',shippingPerUnit:'20',salePrice:'500',feePercent:'10',fixedFee:'5',targetMargin:'30' };
describe('cost calculations',()=>{
  it('allocates batch costs, applies waste once and calculates contribution and target price',()=>{
    expect(calculateCost(scenario)).toEqual({formulaVersion:'1',currency:'TRY',batchCost:'2300.00',unitCost:'230.00',contribution:'215.00',marginPercent:'43.00',breakEvenPrice:'261.12',targetPrice:'391.67'});
  });
  it('reports negative contribution and undefined margin for zero revenue',()=>{
    const result=calculateCost({...scenario,salePrice:'0'});expect(result.contribution).toBe('-235.00');expect(result.marginPercent).toBeNull();
  });
  it('preserves decimal precision and currency without automatic conversion',()=>{
    const result=calculateCost({...scenario,currency:'USD',quantity:'3',materialCost:'0.10',wastePercent:'0',laborMinutes:'0',machineMinutes:'0',finishingCost:'0',packagingPerUnit:'0',shippingPerUnit:'0',fixedFee:'0',feePercent:'0',targetMargin:'0'});
    expect(result.unitCost).toBe('0.03');expect(result.breakEvenPrice).toBe('0.04');expect(result.currency).toBe('USD');
  });
  it.each([{quantity:'0'},{materialCost:'-1'},{feePercent:'100'},{feePercent:'abc'},{targetMargin:'NaN'},{feePercent:'70',targetMargin:'30'},{salePrice:'Infinity'},{salePrice:'0.001'}])('rejects invalid assumptions without throwing during validation: %j',(patch)=>{expect(costInput.safeParse({...scenario,...patch}).success).toBe(false);});
});
describe('private saved cost scenarios',()=>{
  let app:INestApplication;const db=testPrisma();
  beforeAll(async()=>{app=await startApp({RESEARCH_ENABLED:'true'});});
  afterAll(async()=>{await app?.close();await db.$disconnect();});
  it('persists server-computed results, enforces versions, audits, and keeps results private',async()=>{
    await createUser(db,'cost-admin@example.test');const a=await login(app,'cost-admin@example.test');
    const row=(await a.agent.post('/api/admin/research/costs').set('Origin',ORIGIN).set('X-CSRF-Token',a.csrf).send({name:'Ceviz panel',input:scenario}).expect(201)).body;
    expect(row.result.unitCost).toBe('230.00');
    const b=await login(app,'cost-admin@example.test');const list=await b.agent.get('/api/admin/research/costs').expect(200);
    expect(list.headers['cache-control']).toBe('no-store');expect(list.body.some((r:{id:string})=>r.id===row.id)).toBe(true);
    const url=`/api/admin/research/costs/${row.id}`;
    await a.agent.put(url).set('Origin',ORIGIN).set('X-CSRF-Token',a.csrf).send({name:'Yeni',input:scenario,version:1}).expect(200);
    await a.agent.put(url).set('Origin',ORIGIN).set('X-CSRF-Token',a.csrf).send({name:'Eski',input:scenario,version:1}).expect(409);
    await a.agent.post('/api/admin/research/costs').set('Origin',ORIGIN).set('X-CSRF-Token',a.csrf).send({name:'Tampered',input:scenario,result:{unitCost:'0'}}).expect(400);
    await a.agent.post('/api/admin/research/costs/calculate').set('Origin',ORIGIN).send(scenario).expect(403);
    await createUser(db,'cost-editor@example.test','EDITOR');const e=await login(app,'cost-editor@example.test');
    await e.agent.get('/api/admin/research/costs').expect(403);
    await e.agent.post('/api/admin/research/costs/calculate').set('Origin',ORIGIN).set('X-CSRF-Token',e.csrf).send(scenario).expect(403);
    expect(await db.auditLog.count({where:{entityId:row.id}})).toBe(2);
    expect((await a.agent.get('/api/site')).text).not.toContain(row.id);
  });
});

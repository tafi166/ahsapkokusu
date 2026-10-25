import { useEffect, useState } from 'react';
import { request, errorMessage } from '@/lib/adminApi';
import { Field, TextInput } from '../controls';
import type { CostInput, CostEstimate, CostResult } from './costTypes';

const defaults: CostInput = { currency:'TRY', quantity:'1', materialCost:'0', wastePercent:'0', laborMinutes:'0', laborHourlyRate:'0', machineMinutes:'0', machineHourlyRate:'0', finishingCost:'0', overheadCost:'0', packagingPerUnit:'0', shippingPerUnit:'0', salePrice:'0', feePercent:'0', fixedFee:'0', targetMargin:'20' };
const fields: [Exclude<keyof CostInput,'currency'>,string][] = [
  ['quantity','Üretim adedi'],['materialCost','Parti malzeme maliyeti'],['wastePercent','Malzeme fire ek payı (%)'],
  ['laborMinutes','Parti işçilik süresi (dakika)'],['laborHourlyRate','Saatlik işçilik bedeli'],
  ['machineMinutes','Parti CNC/lazer süresi (dakika)'],['machineHourlyRate','Saatlik makine bedeli'],
  ['finishingCost','Parti yüzey işlemi ve sarf'],['overheadCost','Parti genel gider payı'],
  ['packagingPerUnit','Birim paketleme'],['shippingPerUnit','Birim kargo katkısı'],['salePrice','Birim satış fiyatı'],
  ['feePercent','Satış komisyonu (%)'],['fixedFee','Birim sabit işlem ücreti'],['targetMargin','Hedef katkı marjı (%)'],
];
const button='min-h-11 rounded-md border border-divider bg-paper px-4 py-2 text-sm text-ink hover:bg-warm-soft disabled:opacity-50';
export function CostCalculator() {
  const [form,setForm]=useState<CostInput>(defaults);
  const [name,setName]=useState('');
  const [editing,setEditing]=useState<CostEstimate>();
  const [result,setResult]=useState<CostResult>();
  const [list,setList]=useState<CostEstimate[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  useEffect(()=>{let active=true;void request<CostEstimate[]>('GET','/api/admin/research/costs').then((rows)=>{if(active)setList(rows);}).catch((e)=>{if(active)setError(errorMessage(e));});return()=>{active=false;};},[]);
  async function run(save:boolean){
    setBusy(true);setError('');setMessage('');setResult(undefined);
    try {
      if(save){
        const row=await request<CostEstimate>(editing?'PUT':'POST',`/api/admin/research/costs${editing?`/${editing.id}`:''}`,{name,input:form,...(editing?{version:editing.version}:{})});
        setResult(row.result);setEditing(row);setList((old)=>[row,...old.filter((x)=>x.id!==row.id)].slice(0,100));setMessage('Maliyet senaryosu kaydedildi.');
      }else setResult(await request<CostResult>('POST','/api/admin/research/costs/calculate',form));
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  return <div className="space-y-4">
    <h3 className="text-xl">Maliyet & Kârlılık</h3>
    <p className="text-sm">Tüm tutarlar aynı para biriminde ve vergi hariçtir. Bir siparişte bir ürün varsayılır. Parti giderleri üretim adedine bölünür; fire yüzdesi yalnızca malzemeye eklenir. Komisyonlar üretim maliyetine dahil değildir. Sonuç şirket net kârı değildir.</p>
    {error&&<p role="alert" className="text-danger">{error} Form korunur; çakışma varsa kaydı yeniden açın.</p>}
    {message&&<p role="status" className="text-success">{message}</p>}
    <form className="space-y-4 rounded-lg bg-paper p-4" onSubmit={(e)=>{e.preventDefault();void run(false);}}>
      <Field label="Senaryo adı"><TextInput value={name} maxLength={120} disabled={busy} onChange={(e)=>setName(e.target.value)}/></Field>
      <Field label="Para birimi"><select value={form.currency} disabled={busy} className="min-h-11 rounded border border-divider px-3" onChange={(e)=>{setForm({...form,currency:e.target.value as CostInput['currency']});setResult(undefined);}}><option value="TRY">TRY</option><option value="USD">USD</option></select></Field>
      <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key,label])=><Field key={key} label={label}><TextInput required type="text" inputMode={key==='quantity'?'numeric':'decimal'} pattern={key==='quantity'?'[1-9][0-9]{0,4}':'(0|[1-9][0-9]{0,8})([.][0-9]{1,2})?'} value={form[key]} disabled={busy} onChange={(e)=>{setForm({...form,[key]:e.target.value.replace(',','.')});setResult(undefined);setMessage('');}}/></Field>)}</div>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={busy}>Hesapla</button><button type="button" className={button} disabled={busy||!name.trim()} onClick={()=>void run(true)}>Senaryoyu kaydet</button><button type="button" className={button} disabled={busy} onClick={()=>{setForm(defaults);setEditing(undefined);setName('');setResult(undefined);setError('');setMessage('');}}>Yeni senaryo</button></div>
    </form>
    {result&&<div role="status" className="rounded-lg border border-line bg-warm p-4"><h4 className="text-lg">Hesap sonucu · {result.currency}</h4><dl className="mt-3 grid gap-3 sm:grid-cols-2">{([['Parti üretim + paketleme/kargo maliyeti',result.batchCost],['Birim maliyet',result.unitCost],['Birim katkı',result.contribution],['Katkı marjı (%)',result.marginPercent??'Satış fiyatı sıfır'],['Başabaş satış fiyatı',result.breakEvenPrice],['Hedef marj için satış fiyatı',result.targetPrice]]).map(([label,value])=><div key={label}><dt className="text-xs">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl><p className="mt-3 text-xs">Formül v{result.formulaVersion}. Başabaş ve hedef fiyat iki ondalığa yukarı yuvarlanır. Kur dönüşümü yapılmaz; para birimi seçimi tutarları dönüştürmez.</p></div>}
    <h4 className="text-lg">Kaydedilen senaryolar (son 100)</h4>
    <ul className="space-y-2">{list.map((row)=><li key={row.id}><button className={`${button} w-full text-left`} disabled={busy} onClick={()=>{setEditing(row);setForm(row.input);setName(row.name);setResult(row.result);setError('');setMessage('');}}>{row.name} · {row.result.unitCost} {row.input.currency} / birim</button></li>)}</ul>
    {!list.length&&<p className="text-sm">Henüz kaydedilmiş senaryo yok.</p>}
  </div>;
}

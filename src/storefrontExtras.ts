import { supabase } from './supabase';

export type StoreSettings={instagram_url:string;tiktok_url:string;facebook_url:string};
export type AnalyticsSummary={product_view:number;add_to_cart:number;checkout_start:number;whatsapp_order:number};

function sessionId(){
  const key='mateos-session-id';
  let id=localStorage.getItem(key);
  if(!id){id=crypto.randomUUID();localStorage.setItem(key,id)}
  return id;
}

export async function trackEvent(event_type:string,product_id?:string|null,metadata:Record<string,unknown>={}){
  if(!supabase)return;
  try{await supabase.from('analytics_events').insert({event_type,product_id:product_id||null,session_id:sessionId(),metadata})}catch{}
}

export async function loadStoreSettings():Promise<StoreSettings>{
  const empty={instagram_url:'',tiktok_url:'',facebook_url:''};
  if(!supabase)return empty;
  const{data,error}=await supabase.from('store_settings').select('key,value').in('key',Object.keys(empty));
  if(error)return empty;
  const result={...empty};
  for(const row of data||[]){if(row.key in result)(result as any)[row.key]=row.value||''}
  return result;
}

export async function saveStoreSettings(settings:StoreSettings){
  if(!supabase)throw new Error('Supabase no configurado.');
  const rows=Object.entries(settings).map(([key,value])=>({key,value,updated_at:new Date().toISOString()}));
  const{error}=await supabase.from('store_settings').upsert(rows,{onConflict:'key'});
  if(error)throw error;
}

export async function loadAnalyticsSummary():Promise<AnalyticsSummary>{
  const result:AnalyticsSummary={product_view:0,add_to_cart:0,checkout_start:0,whatsapp_order:0};
  if(!supabase)return result;
  const since=new Date(Date.now()-30*24*60*60*1000).toISOString();
  const{data,error}=await supabase.from('analytics_events').select('event_type').gte('created_at',since);
  if(error)throw error;
  for(const row of data||[]){if(row.event_type in result)(result as any)[row.event_type]++}
  return result;
}

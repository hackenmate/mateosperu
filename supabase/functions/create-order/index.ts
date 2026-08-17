import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'Método no permitido.'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')!;
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin=createClient(url,service,{auth:{persistSession:false}});
    const authHeader=req.headers.get('Authorization')||'';
    let userId:string|null=null;
    if(authHeader.startsWith('Bearer ')){
      const client=createClient(url,anon,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
      const {data}=await client.auth.getUser();
      userId=data.user?.id||null;
    }
    const {customer,items,coupon}=await req.json();
    if(!customer?.name||!customer?.phone||!customer?.department||!customer?.province||!customer?.district||!Array.isArray(items)||items.length===0)return json({error:'Datos de compra incompletos.'},400);
    if(items.length>50)return json({error:'Demasiados productos en el pedido.'},400);
    const ids=[...new Set(items.map((i:any)=>String(i.product_id)))];
    const {data:products,error:pError}=await admin.from('products').select('id,sku,name,price,stock,active,sizes,colors').in('id',ids);
    if(pError)throw pError;
    const map=new Map((products||[]).map((p:any)=>[String(p.id),p]));
    let subtotal=0;
    const normalized=[] as any[];
    for(const raw of items){
      const p:any=map.get(String(raw.product_id));
      const quantity=Math.max(1,Math.min(20,Number(raw.quantity)||1));
      if(!p||!p.active) return json({error:'Uno de los productos ya no está disponible.'},409);
      if(Number(p.stock)<quantity)return json({error:`Stock insuficiente para ${p.name}.`},409);
      const size=String(raw.size||'Única'); const color=String(raw.color||'Único');
      if(Array.isArray(p.sizes)&&p.sizes.length&&!p.sizes.includes(size))return json({error:`Talla inválida para ${p.name}.`},400);
      if(Array.isArray(p.colors)&&p.colors.length&&!p.colors.includes(color))return json({error:`Color inválido para ${p.name}.`},400);
      const unit=Number(p.price); const line=unit*quantity; subtotal+=line;
      normalized.push({product_id:p.id,product_name:p.name,sku:p.sku,size,color,quantity,unit_price:unit,line_total:line});
    }
    let discount=0; let couponId:string|null=null;
    if(coupon){
      const now=new Date().toISOString();
      const {data:c}=await admin.from('coupons').select('*').eq('code',String(coupon).trim().toUpperCase()).eq('active',true).lte('starts_at',now).gte('ends_at',now).maybeSingle();
      if(c && subtotal>=Number(c.min_purchase||0) && (!c.usage_limit || Number(c.used_count)<Number(c.usage_limit))){
        couponId=c.id;
        discount=c.discount_type==='percent'?subtotal*(Number(c.discount_value)/100):Number(c.discount_value);
        if(c.max_discount)discount=Math.min(discount,Number(c.max_discount));
        discount=Math.max(0,Math.min(discount,subtotal));
      }
    }
    const total=Math.round((subtotal-discount)*100)/100;
    const id=crypto.randomUUID();
    const code=`MAT-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
    const checkoutToken=crypto.randomUUID();
    const destination=`${customer.department}, ${customer.province}, ${customer.district}`;
    const {error:oError}=await admin.from('orders').insert({id,code,user_id:userId,customer_name:String(customer.name).trim().slice(0,120),email:customer.email?String(customer.email).trim().slice(0,180):null,phone:String(customer.phone).trim().slice(0,30),destination,department:String(customer.department).slice(0,80),province:String(customer.province).slice(0,80),district:String(customer.district).slice(0,80),shipping_method:String(customer.shipping||'Agencia de envío').slice(0,80),agency:customer.agency?String(customer.agency).slice(0,120):null,notes:customer.notes?String(customer.notes).slice(0,800):null,subtotal,discount,total,coupon_id:couponId,status:'Nuevo',payment_status:'Pendiente',checkout_token:checkoutToken});
    if(oError)throw oError;
    const {error:iError}=await admin.from('order_items').insert(normalized.map(x=>({...x,order_id:id})));
    if(iError){await admin.from('orders').delete().eq('id',id);throw iError;}
    if(couponId)await admin.from('coupons').update({used_count:(await admin.from('coupons').select('used_count').eq('id',couponId).single()).data?.used_count+1||1}).eq('id',couponId);
    return json({id,code,checkout_token:checkoutToken,subtotal,discount,total});
  }catch(e){console.error(e);return json({error:'No se pudo crear el pedido.'},500);}
});

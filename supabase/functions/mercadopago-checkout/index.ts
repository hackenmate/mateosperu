import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'Método no permitido.'},405);
  try{
    const accessToken=Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if(!accessToken)return json({error:'Mercado Pago todavía no tiene credenciales configuradas.'},503);
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {orderId,checkoutToken,email}=await req.json();
    const {data:order,error}=await supabase.from('orders').select('id,code,total,customer_name,email,payment_status,checkout_token').eq('id',orderId).eq('checkout_token',checkoutToken).maybeSingle();
    if(error||!order)return json({error:'Pedido inválido.'},404);
    if(order.payment_status==='Pagado')return json({error:'Este pedido ya fue pagado.'},409);
    const siteUrl=Deno.env.get('SITE_URL')||'https://hackenmate.github.io/mateosperu/';
    const payload={
      items:[{title:`Pedido Mateo’s ${order.code}`,quantity:1,currency_id:'PEN',unit_price:Number(order.total)}],
      payer:{name:order.customer_name,email:email||order.email||undefined},
      external_reference:order.code,
      back_urls:{success:`${siteUrl}?payment=success&order=${encodeURIComponent(order.code)}`,pending:`${siteUrl}?payment=pending&order=${encodeURIComponent(order.code)}`,failure:`${siteUrl}?payment=failure&order=${encodeURIComponent(order.code)}`},
      auto_return:'approved',
      notification_url:`${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      metadata:{order_id:order.id,order_code:order.code},
    };
    const mp=await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json','X-Idempotency-Key':order.id},body:JSON.stringify(payload)});
    const data=await mp.json();
    if(!mp.ok){console.error(data);return json({error:'No se pudo iniciar Mercado Pago.'},502);}
    await supabase.from('orders').update({payment_method:'Online',payment_provider:'Mercado Pago',payment_id:data.id}).eq('id',order.id);
    return json({url:data.init_point||data.sandbox_init_point,preference_id:data.id});
  }catch(e){console.error(e);return json({error:'No se pudo iniciar el pago.'},500);}
});

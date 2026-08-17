import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

Deno.serve(async(req)=>{
  try{
    const token=Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if(!token)return new Response('ok');
    const url=new URL(req.url);
    const body=await req.json().catch(()=>({}));
    const paymentId=body?.data?.id||url.searchParams.get('data.id')||url.searchParams.get('id');
    const type=body?.type||url.searchParams.get('type')||url.searchParams.get('topic');
    if(!paymentId||String(type)!=='payment')return new Response('ok');

    const res=await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`,{headers:{Authorization:`Bearer ${token}`}});
    if(!res.ok)return new Response('ok');
    const payment=await res.json();
    const orderId=payment?.metadata?.order_id;
    if(!orderId)return new Response('ok');

    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data:order}=await supabase.from('orders').select('id,total,payment_status').eq('id',orderId).maybeSingle();
    if(!order)return new Response('ok');

    const expected=Math.round(Number(order.total)*100);
    const paid=Math.round(Number(payment.transaction_amount||0)*100);
    const currency=String(payment.currency_id||'');
    const amountValid=expected===paid&&currency==='PEN';
    const status=payment.status==='approved'&&amountValid?'Pagado':payment.status==='rejected'?'Rechazado':payment.status==='cancelled'?'Cancelado':'Pendiente';
    const update:any={payment_status:status,payment_provider:'Mercado Pago',payment_id:String(payment.id),updated_at:new Date().toISOString()};
    if(status==='Pagado')update.status='Confirmado';
    await supabase.from('orders').update(update).eq('id',orderId);

    if(status==='Pagado'){
      const {error:stockError}=await supabase.rpc('commit_paid_order_stock',{p_order_id:orderId});
      if(stockError)console.error('stock commit',stockError);
    }
    return new Response('ok');
  }catch(e){console.error(e);return new Response('ok');}
});

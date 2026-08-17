import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

Deno.serve(async(req)=>{
  try{
    const token=Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if(!token)return new Response('ok');
    const url=new URL(req.url);
    const body=await req.json().catch(()=>({}));
    const paymentId=body?.data?.id||url.searchParams.get('data.id')||url.searchParams.get('id');
    const type=body?.type||url.searchParams.get('type')||url.searchParams.get('topic');
    if(!paymentId||!['payment','merchant_order'].includes(String(type)))return new Response('ok');
    if(String(type)!=='payment')return new Response('ok');
    const res=await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`,{headers:{Authorization:`Bearer ${token}`}});
    if(!res.ok)return new Response('ok');
    const payment=await res.json();
    const orderId=payment?.metadata?.order_id;
    if(!orderId)return new Response('ok');
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const status=payment.status==='approved'?'Pagado':payment.status==='rejected'?'Rechazado':payment.status==='cancelled'?'Cancelado':'Pendiente';
    const orderStatus=status==='Pagado'?'Confirmado':undefined;
    const update:any={payment_status:status,payment_provider:'Mercado Pago',payment_id:String(payment.id)};
    if(orderStatus)update.status=orderStatus;
    await supabase.from('orders').update(update).eq('id',orderId);
    if(status==='Pagado'){
      const {data:items}=await supabase.from('order_items').select('product_id,quantity').eq('order_id',orderId);
      for(const item of items||[]){
        const {data:p}=await supabase.from('products').select('stock').eq('id',item.product_id).single();
        if(p)await supabase.from('products').update({stock:Math.max(0,Number(p.stock)-Number(item.quantity))}).eq('id',item.product_id);
      }
    }
    return new Response('ok');
  }catch(e){console.error(e);return new Response('ok');}
});

import { supabase } from './supabase';

export type AdminRequest={
  id:string;
  user_id:string;
  status:'pending'|'approved'|'rejected';
  message:string;
  created_at:string;
  updated_at:string;
};

export async function getMyAdminState(){
  if(!supabase)return{isAdmin:false,isOwner:false,request:null as AdminRequest|null};
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return{isAdmin:false,isOwner:false,request:null as AdminRequest|null};
  const[{data:admin},{data:request}]=await Promise.all([
    supabase.from('store_admins').select('user_id,role').eq('user_id',user.id).maybeSingle(),
    supabase.from('admin_requests').select('id,user_id,status,message,created_at,updated_at').eq('user_id',user.id).maybeSingle()
  ]);
  return{isAdmin:Boolean(admin),isOwner:admin?.role==='owner',request:(request||null) as AdminRequest|null};
}

export async function requestAdminAccess(message=''){
  if(!supabase)throw new Error('Supabase no configurado.');
  const{data,error}=await supabase.rpc('request_admin_access',{p_message:message});
  if(error)throw error;
  return String(data);
}

export async function loadPendingAdminRequests():Promise<AdminRequest[]>{
  if(!supabase)return[];
  const{data,error}=await supabase.from('admin_requests').select('id,user_id,status,message,created_at,updated_at').eq('status','pending').order('created_at',{ascending:true});
  if(error)throw error;
  return(data||[]) as AdminRequest[];
}

export async function reviewAdminRequest(id:string,approve:boolean){
  if(!supabase)throw new Error('Supabase no configurado.');
  const{error}=await supabase.rpc('owner_review_admin_request',{p_request_id:id,p_approve:approve});
  if(error)throw error;
}

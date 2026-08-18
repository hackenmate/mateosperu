import { supabase } from './supabase';

export type AdminRequest={
  id:string;
  user_id:string;
  email?:string;
  status?:'pending'|'approved'|'rejected';
  message:string;
  created_at:string;
};

export async function getMyAdminState(){
  if(!supabase)return{isAdmin:false,isOwner:false,requestStatus:null as string|null};
  const{data,error}=await supabase.rpc('get_my_admin_access_state');
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  return{
    isAdmin:Boolean(row?.is_admin),
    isOwner:Boolean(row?.is_owner),
    requestStatus:row?.request_status?String(row.request_status):null
  };
}

export async function requestAdminAccess(message=''){
  if(!supabase)throw new Error('Supabase no configurado.');
  const{data,error}=await supabase.rpc('request_admin_access',{p_message:message});
  if(error)throw error;
  return String(data);
}

export async function loadPendingAdminRequests():Promise<AdminRequest[]>{
  if(!supabase)return[];
  const{data,error}=await supabase.rpc('owner_list_pending_admin_requests');
  if(error)throw error;
  return(data||[]) as AdminRequest[];
}

export async function reviewAdminRequest(id:string,approve:boolean){
  if(!supabase)throw new Error('Supabase no configurado.');
  const{error}=await supabase.rpc('owner_review_admin_request',{p_request_id:id,p_approve:approve});
  if(error)throw error;
}

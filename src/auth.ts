import { supabase } from './supabase';

const siteUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

function friendlyAuthError(message:string){
  const m=message.toLowerCase();
  if(m.includes('email not confirmed')) return 'Tu correo todavía no está confirmado.';
  if(m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if(m.includes('user already registered')) return 'Este correo ya tiene una cuenta.';
  if(m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  return message;
}

export async function signUpCustomer(email:string,password:string,fullName:string,phone:string){
  if(!supabase) throw new Error('Supabase todavía no está configurado.');
  const redirectTo=siteUrl();
  const {data,error}=await supabase.auth.signUp({
    email:email.trim(),
    password,
    options:{
      emailRedirectTo:redirectTo,
      data:{full_name:fullName.trim(),phone:phone.trim()}
    }
  });
  if(error) throw new Error(friendlyAuthError(error.message));
  return data;
}

export async function signInCustomer(email:string,password:string){
  if(!supabase) throw new Error('Supabase todavía no está configurado.');
  const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
  if(error) throw new Error(friendlyAuthError(error.message));
  return data;
}

export async function resendSignupConfirmation(email:string){
  if(!supabase) throw new Error('Supabase todavía no está configurado.');
  if(!email.trim()) throw new Error('Escribe tu correo primero.');
  const {error}=await supabase.auth.resend({
    type:'signup',
    email:email.trim(),
    options:{emailRedirectTo:siteUrl()}
  });
  if(error) throw new Error(friendlyAuthError(error.message));
}

export async function sendPasswordReset(email:string){
  if(!supabase) throw new Error('Supabase todavía no está configurado.');
  if(!email.trim()) throw new Error('Escribe tu correo primero.');
  const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:siteUrl()});
  if(error) throw new Error(friendlyAuthError(error.message));
}

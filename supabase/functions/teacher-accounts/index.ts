import { createClient } from 'npm:@supabase/supabase-js@2';

// JWT validation is repeated here; never trust a user ID or role from the body.
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:cors});
  if(request.method!=='POST')return reply({error:'POST required.'},405);
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return reply({error:'Sign in first.'},401);
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user)return reply({error:'Sign in first.'},401);
  const caller=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const body=await request.json();
    if(body.action==='create'){
      const {data:allowed,error}=await caller.rpc('current_user_can_manage_school',{requested_school:body.schoolId});
      if(error||allowed!==true)return reply({error:'School administrator access required.'},403);
      if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)return reply({error:'Use a temporary password of 12–128 characters.'},400);
      if(!['subject_teacher','class_teacher'].includes(body.role)||typeof body.email!=='string'||typeof body.name!=='string'||!body.name.trim())return reply({error:'Enter the teacher details and assignment.'},400);
      const {data:created,error:createError}=await admin.auth.admin.createUser({email:body.email.trim(),password:body.password,email_confirm:true,user_metadata:{display_name:body.name.trim()}});
      if(createError||!created.user)return reply({error:'Could not create this account. Check the email and password requirements; existing accounts must be assigned separately.'},400);
      const {error:provisionError}=await admin.rpc('provision_teacher_account',{requested_school:body.schoolId,requested_user:created.user.id,display_name:body.name.trim(),teacher_role:body.role,requested_class:body.classId,requested_subject:body.role==='subject_teacher'?body.subjectId:null});
      if(provisionError){await admin.auth.admin.deleteUser(created.user.id);return reply({error:'Assignment failed. Check the selected school, class and subject.'},400);}
      return reply({created:true});
    }
    if(body.action==='change-password'){
      const {data:required,error}=await caller.rpc('current_user_requires_password_change');
      if(error||required!==true)return reply({error:'No temporary password change is pending.'},403);
      if(typeof body.newPassword!=='string'||body.newPassword.length<12||body.newPassword.length>128||body.newPassword!==body.confirmPassword||body.newPassword===body.defaultPassword)return reply({error:'Use a different password of 12–128 characters and enter it twice.'},400);
      const verifier=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data:verified,error:verifyError}=await verifier.auth.signInWithPassword({email:user.email!,password:body.defaultPassword});
      if(verifyError||verified.user?.id!==user.id)return reply({error:'The default password is incorrect.'},400);
      await verifier.auth.signOut();
      const {error:updateError}=await admin.auth.admin.updateUserById(user.id,{password:body.newPassword});
      if(updateError)return reply({error:'Password could not be changed. Check the password requirements.'},400);
      const {error:completeError}=await admin.rpc('complete_teacher_password_change',{requested_user:user.id});
      if(completeError)return reply({error:'Password changed, but access could not be enabled. Contact your administrator.'},500);
      return reply({changed:true});
    }
    return reply({error:'Unknown action.'},400);
  }catch{return reply({error:'Request could not be completed.'},400);}
});

-- Catalogue update only; preserve existing plan IDs and billing snapshots.
begin;
update public.subscription_plans set unit_price=0 where code='starter';
update public.subscription_plans set unit_price=100,recommended=true where code='standard';
update public.subscription_plans set code='enterprise',name='Enterprise' where code='professional';
with catalogue(code,name,starter,standard,enterprise,position,planned) as (values
 ('students','Students','10','Unlimited*','Custom',1,false),
 ('teachers','Teachers','1','Unlimited','Unlimited',2,false),
 ('admins','Admins','1','Multiple','Unlimited',3,false),
 ('subjects','Subjects','Basic','Unlimited','Unlimited',4,false),
 ('result_management','Result Processing','Yes','Yes','Yes',5,false),
 ('result_pin','Result PIN','Limited','Unlimited','Unlimited',6,true),
 ('broadsheet','Broadsheet','Basic','Yes','Yes',7,true),
 ('result_cumulative','Result Cumulative','Yes','Yes','Yes',8,true),
 ('class_migration','Class Migration','Basic','Yes','Yes',9,true),
 ('subject_teachers','Subject Teachers','No','Yes','Yes',10,false),
 ('attendance','Attendance','No','Yes','Yes',11,true),
 ('affective_psychomotor','Affective/Psychomotor','No','Yes','Yes',12,true),
 ('analytics','Analytics','Basic','Advanced','Advanced',13,true),
 ('bulk_download','Bulk Download','No','Yes','Yes',14,true),
 ('advanced_templates','Result Templates','Basic','Configurable','Custom',15,true),
 ('qr_verification','Result Verification','No','Yes','Yes',16,true),
 ('student_import','Student Import','Basic','Yes','Yes',17,true),
 ('website_builder','Website Builder','No','Yes','Yes',18,true),
 ('custom_domain','Custom Domain','No','Yes','Yes',19,true),
 ('daily_backups','Daily Backups','No','Yes','Yes',20,true),
 ('multiple_campuses','Multi-School/Campus','No','No','Yes',21,true),
 ('api_integrations','API/Integrations','No','No','Yes',22,true),
 ('priority_support','Dedicated Support','No','No','Yes',23,true)
), definitions as (
 insert into public.feature_definitions(code,name) select code,name from catalogue
 on conflict(code) do update set name=excluded.name returning code
)
insert into public.plan_features(plan_id,feature_code,value)
select p.id,c.code,jsonb_build_object('display',v.label,'enabled',v.label<>'No','displayOrder',c.position,
 'availability',case when c.planned then 'planned' else 'available' end,
 'limit',case when v.label ~ '^[0-9]+$' then v.label::integer else null end)
from catalogue c join definitions d on d.code=c.code cross join public.subscription_plans p
cross join lateral (select case p.code when 'starter' then c.starter when 'standard' then c.standard else c.enterprise end as label) v
where p.code in ('starter','standard','enterprise')
on conflict(plan_id,feature_code) do update set value=excluded.value;
notify pgrst,'reload schema';
commit;

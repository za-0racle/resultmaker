import assert from 'node:assert/strict';
import { foundation, expansion, migration, scalar } from './helpers/database.js';
import { renderPlans } from '../src/components/PricingPlans.js';
import { createSubscriptionService } from '../src/services/subscriptionService.js';
const db=await foundation();
try {
 for(const file of expansion)await migration(db,file);
 const original=await scalar(db,"select id from public.subscription_plans where code='professional'");
 await migration(db,'20261007260000_revised_plan_catalog.sql');
 assert.equal(await scalar(db,"select id from public.subscription_plans where code='enterprise'"),original);
 assert.equal(Number(await scalar(db,"select unit_price from public.subscription_plans where code='starter'")),0);
 assert.equal(await scalar(db,"select count(*)::integer from public.plan_features where value ? 'display'"),69);
 assert.equal(await scalar(db,"select value->>'display' from public.plan_features f join public.subscription_plans p on p.id=f.plan_id where p.code='starter' and feature_code='students'"),'10');
 const html=renderPlans([{name:'Starter',unitPrice:0,currency:'NGN',pricingType:'per_student_per_term',planFeatures:[{featureCode:'students',featureDefinitions:{name:'Students'},value:{display:'10',displayOrder:1}}]}]);
 assert.match(html,/Free/);assert.match(html,/10 students/);assert.doesNotMatch(html,/<table|Planned|plan-disclosure/);
 const response={data:[{name:'Starter',plan_features:[{feature_code:'students',feature_definitions:{name:'Students'},value:{display:'10',displayOrder:1}}]}],error:null};
 const request={select(){return this;},eq(){return this;},order(){return Promise.resolve(response);}};
 const plans=await createSubscriptionService({from(){return request;}}).plans();
 assert.equal(plans[0].planFeatures[0].featureDefinitions.name,'Students');
 console.log('PASS revised plans: preserved IDs, free Starter, 69 feature values and card highlights');
}finally{await db.close();}

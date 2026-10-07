import {createSubscriptionService} from '../services/subscriptionService.js';
import {escapeHtml as e} from '../utils/helpers.js';
export function PricingPlans(){return '<div data-pricing-plans role="status">Loading plans...</div>';}
const highlightOrder=['students','teachers','admins','result_management','subject_teachers','subjects'];
const features=p=>highlightOrder.map(code=>(p.planFeatures||[]).find(f=>f.featureCode===code)).filter(f=>f?.value?.display && f.value.display!=='No');
const price=p=>p.pricingType==='custom'?'Custom':Number(p.unitPrice)===0?'Free':new Intl.NumberFormat('en-NG',{style:'currency',currency:p.currency,maximumFractionDigits:0}).format(p.unitPrice);
function highlight(f){
 const name=f.featureDefinitions?.name||f.featureCode;
 const display=f.value.display.replace(/\*$/,'');
 if(display==='Yes')return e(name);
 if(display==='Unlimited')return `Unlimited ${e(name.toLowerCase())}`;
 if(display==='Custom')return `Custom ${e(name.toLowerCase())}`;
 if(display==='Multiple')return `Multiple ${e(name.toLowerCase())}`;
 if(display==='Basic')return `Basic ${e(name.toLowerCase())}`;
 return `${e(display)} ${e(display==='1'?name.toLowerCase().replace(/s$/,''):name.toLowerCase())}`;
}
export function renderPlans(plans){
 const sorted=[...plans].sort((a,b)=>Number(a.pricingType==='custom')-Number(b.pricingType==='custom')||Number(a.unitPrice)-Number(b.unitPrice));
 return `<div class="pricing-grid">${sorted.map(p=>`<article class="card plan-card ${p.recommended?'recommended':''}">${p.recommended?'<span class="plan-badge">Recommended</span>':''}<h3>${e(p.name)}</h3><p class="plan-price">${e(price(p))}</p><p>${p.pricingType==='custom'?'Tailored to your school.':Number(p.unitPrice)===0?'Start with a small school workspace.':'per student, per term'}</p><ul class="plan-highlights">${features(p).map(f=>`<li>${highlight(f)}</li>`).join('')}</ul><button class="button ${p.recommended?'primary':'secondary'}" data-action="signup-modal">Register school</button></article>`).join('')}</div>`;
}
export async function bindPricingPlans(root=document){const target=root.querySelector('[data-pricing-plans]');if(!target)return;try{const plans=await createSubscriptionService().plans();if(target.isConnected)target.innerHTML=plans.length?renderPlans(plans):'<p>Plans are being updated. Contact us for pricing.</p>';}catch{if(target.isConnected)target.innerHTML='<p>Plans could not load. <button class="button secondary" data-pricing-retry>Try again</button></p>';target.querySelector('[data-pricing-retry]')?.addEventListener('click',()=>bindPricingPlans(root));}}

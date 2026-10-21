import {plan,addMonths} from './planner.mjs';
const $=id=>document.getElementById(id), fields=['monthly','renewal','coupon','threshold','expires','maxCash','maxMonths'];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const shiftDays=(date,days)=>{const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const money=n=>`¥${(n/100).toFixed(2)}`;
let result, config;
function example(){ $('monthly').value=32;$('coupon').value=100;$('threshold').value=0;$('maxCash').value=10;$('maxMonths').value=12;$('renewal').value=addMonths(today(),1);$('expires').value=shiftDays(today(),90);calculate(); }
function read(){return {monthly:Math.round(Number($('monthly').value)*100),coupon:Math.round(Number($('coupon').value)*100),threshold:Math.round(Number($('threshold').value)*100),maxCash:Math.round(Number($('maxCash').value)*100),maxMonths:Number($('maxMonths').value),expires:$('expires').value,today:today()};}
function cell(row,text){const td=document.createElement('td');td.textContent=text;row.append(td);return td;}
function calculate(){
  if(!$('settings').checkValidity()){ $('settings').reportValidity();return false; }
  config=read();result=plan(config);$('form-error').textContent='';
  const r=result.recommended,percent=r?Math.round(r.used/config.coupon*100):0;
  $('ticket-value').textContent=(config.coupon/100).toLocaleString('zh-CN',{maximumFractionDigits:2});
  $('recommend-title').textContent=r?`推荐续费 ${r.months} 个月`:'当前条件下暂无推荐';
  $('recommend-badge').textContent=result.expired?'代金券已失效':r?'预算内推荐':'请调整条件';
  $('recommend-copy').textContent=result.expired?'失效日早于今天，已按不可用处理。':r?'在补差预算内，尽量用足券额；实际抵扣以官方结算页为准。':'没有同时满足门槛与补差预算的方案，可调整时长、门槛或补差预算。';
  $('cash').textContent=r?money(r.cash):'—';$('end-date').textContent=r?addMonths($('renewal').value,r.months):'—';
  $('utilization').textContent=`${percent}%`;$('progress').style.width=`${percent}%`;
  $('coupon-detail').textContent=r?`预计抵扣 ${money(r.used)} · 未抵扣 ${money(r.left)}`:'每个方案按当前日期使用一张券进行估算';
  const body=$('rows');body.replaceChildren();
  result.rows.forEach(item=>{const tr=document.createElement('tr');if(r?.months===item.months)tr.className='recommended';else if(!item.eligible)tr.className='ineligible';const td=cell(tr,`${item.months} 个月`);if(r?.months===item.months){const b=document.createElement('span');b.className='row-badge';b.textContent='推荐';td.append(b);}cell(tr,money(item.total));cell(tr,item.eligible?money(item.used):result.expired?'已失效':'未达门槛');cell(tr,money(item.cash));cell(tr,`${Math.round(item.used/config.coupon*100)}%`);body.append(tr);});
  return true;
}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3500);}
$('settings').addEventListener('submit',event=>{event.preventDefault();calculate();});
$('settings').addEventListener('change',()=>{if($('settings').checkValidity())calculate();});
$('example').addEventListener('click',example);
$('save').addEventListener('click',()=>{if(!calculate())return;try{localStorage.setItem('cloud-coupon-plan-v1',JSON.stringify(Object.fromEntries(fields.map(id=>[id,$(id).value]))));$('storage-message').textContent='已保存到本浏览器，不会上传到服务器。';}catch{$('storage-message').textContent='浏览器未允许本机存储，仍可正常计算与导出。';}});
$('restore').addEventListener('click',()=>{try{const v=JSON.parse(localStorage.getItem('cloud-coupon-plan-v1')||'null');if(!v){toast('还没有保存的方案');return;}for(const id of fields)if(typeof v[id]==='string')$(id).value=v[id];if(calculate())toast('已恢复本机保存的方案');}catch{toast('暂时无法读取本机方案');}});
$('csv').addEventListener('click',()=>{if(!calculate())return;const rows=[['续费月数','订单金额（元）','券抵扣（元）','现金补差（元）','未抵扣券额（元）','是否达门槛且未过期','预算内推荐'],...result.rows.map(r=>[r.months,(r.total/100).toFixed(2),(r.used/100).toFixed(2),(r.cash/100).toFixed(2),(r.left/100).toFixed(2),r.eligible?'是':'否',result.recommended?.months===r.months?'是':'否'])];download('云券-续费方案.csv','\uFEFF'+rows.map(r=>r.join(',')).join('\r\n'),'text/csv;charset=utf-8');toast('已导出费用比较表');});
$('calendar').addEventListener('click',()=>{if(!calculate())return;const entries=[];if(!result.expired)entries.push({date:shiftDays(config.expires,-7),title:'云券提醒：代金券将在7天后失效',description:`代金券失效日：${config.expires}。请核对实际有效期和使用限制。`});if(result.recommended){const end=addMonths($('renewal').value,result.recommended.months);entries.push({date:shiftDays(end,-7),title:'云券提醒：预计续费到期前7天',description:`按推荐方案测算到期日为${end}。这只是估算，尚未执行续费，请以控制台真实到期日为准。`});}const valid=entries.filter(e=>e.date>=today());if(!valid.length){toast('没有未来的提醒日期，请调整日期或预算');return;}const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const esc=s=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CloudCouponPlanner//ZH','CALSCALE:GREGORIAN',...valid.flatMap((e,i)=>['BEGIN:VEVENT',`UID:${stamp}-${i}@cloud-coupon-planner.local`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${e.date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${shiftDays(e.date,1).replaceAll('-','')}`,`SUMMARY:${esc(e.title)}`,`DESCRIPTION:${esc(e.description)}`,'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${esc(e.title)}`,'TRIGGER:PT9H','END:VALARM','END:VEVENT']),'END:VCALENDAR'];const folded=lines.map(line=>{let out='',part='',n=0;for(const ch of line){const size=new TextEncoder().encode(ch).length;if(n+size>73){out+=part+'\r\n ';part='';n=1;}part+=ch;n+=size;}return out+part;});download('云券-到期提醒.ics',folded.join('\r\n')+'\r\n','text/calendar;charset=utf-8');toast('已导出日历；导入日历应用后生效');});
example();

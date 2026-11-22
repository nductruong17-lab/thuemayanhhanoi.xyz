const photoMetadata = [
 ['m10','Canon M10','Canon'], ['m3','Canon M3','Canon'],
 ['m100','Canon M100','Canon'], ['m50','Canon M50','Canon'],
 ['r50','Canon R50','Canon'], ['g7x','Canon G7 X Mark II','Canon'],
 ['ixy','Canon IXY 180','Canon'], ['eos','Canon EOS 55','Canon'],
 ['xa3','Fujifilm X-A3','Fujifilm'], ['xa5','Fujifilm X-A5','Fujifilm'],
 ['xt20','Fujifilm X-T20','Fujifilm'], ['xt30','Fujifilm X-T30','Fujifilm'],
 ['xs10','Fujifilm X-S10','Fujifilm'], ['x100v','Fujifilm X100V','Fujifilm'],
 ['a73','Sony A7 III','Sony'], ['pocket','DJI Pocket 3','DJI'],
 ['lens50','Lens 50mm f/1.4','Ống kính'], ['lens22','Lens 22mm f/2','Ống kính'],
 ['v56','Viltrox 56mm f/1.4','Ống kính']
];
const $ = selector => document.querySelector(selector);
const form = $('#request');
const {model, plan, start, end, hour, delivery, battery, reflector, tripod} = form.elements;
const total = $('#total');
const message = $('#send textarea');
const filters = $('#filters');
const managerModels = {
 m10:'M10',m3:'M3',m100:'M100',m50:'M50',r50:'R50',g7x:'G7X II',ixy:'IXY 180',eos:'EOS 55',
 xa3:'XA3',xa5:'XA5',xt20:'XT20',xt30:'XT30',xs10:'XS10',x100v:'X100V',a73:'A73',pocket:'Pocket 3',
 lens50:'Lens 50',lens22:'Lens 22 F2',v56:'Viltrox 56'
};
const availabilityStatus = $('#availability-status');
const checkAvailability = $('#check-availability');
const stockDialog = $('#stock-dialog');
const onlyAvailable = $('#only-available');
const catalogAvailability = $('#catalog-availability');
const requestFeedback = $('#request-feedback');
const submitRequest = $('#submit-request');
const managerApi = 'https://cami-manager.cami-manager.workers.dev/api/public';
const hotIds=['r50','xt20','xt30','xs10','m50','m10'];
const hotRank=id=>hotIds.includes(id)?hotIds.indexOf(id):hotIds.length;
const byPriority=(a,b)=>hotRank(a[0])-hotRank(b[0]);
const groupName=brand=>['Canon','Fujifilm'].includes(brand)?brand:'Khác';
const escapeText=value=>String(value).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let catalog=[];
let accessoryRates;
let availabilityCounts;
let sending=false;
let lastSubmission;
let sentCode;
let stickyTotal='';
let datePicked=false; // chỉ hiện còn/hết máy trên thẻ sau khi khách tự chọn ngày

let currentRange = '';
let availabilityRequest;
let availabilityResults;

const dong = amount => amount.toLocaleString('vi-VN') + 'đ';
const currency = amount => dong(amount * 1000);
const dateText = date => date.split('-').reverse().join('/');
const dayMs = 86400000;
const groups = ['Tất cả','Canon','Fujifilm','Khác'];
let group = 'Tất cả';

const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
start.min = end.min = today;
start.value = end.value = today;
const normalize = text => text.toLowerCase().replace(/[^a-z0-9]/g,'');
function availableForPlan(id,sixRate){
 return availabilityResults?.[managerModels[id]]===true&&(plan.value!=='six'||sixRate>0);
}
function availableModels(){
 return catalog.filter(([id,,,rate])=>availableForPlan(id,rate));
}
const occasionPicks={
 graduation:{
  copy:'Chụp nhóm bạn, áo cử nhân và những khoảnh khắc nhận bằng.',
  models:[['r50','Dễ lấy nét khi chụp nhóm bạn và bắt khoảnh khắc.'],['xt30','Hợp chụp chân dung và ảnh kỷ yếu tông film.']]
 },
 cafe:{
  copy:'Chụp outfit, góc quán và những buổi hẹn cuối tuần.',
  models:[['m10','Gọn nhẹ, dễ làm quen và tiết kiệm cho buổi đi chơi.'],['xt20','Hợp với ảnh màu film và góc quán có ánh sáng tự nhiên.']]
 },
 travel:{
  copy:'Chọn một chiếc máy dễ mang theo cho chuyến đi.',
  models:[['g7x','Máy nhỏ gọn, hợp chụp phố xá và ghi lại chuyến đi.'],['m50','Linh hoạt khi chụp từ cảnh đường phố tới chân dung.']]
 }
};
let occasion='graduation';
function renderRecommendations(){
 const picks=occasionPicks[occasion];
 $('#occasion-copy').textContent=picks.copy;
 const cards=picks.models.flatMap(([id,reason])=>{
  const item=catalog.find(row=>row[0]===id);
  if(!item)return [];
  const [,name,,six,day,,,photo]=item;
  const status=plan.value==='six'&&!six?'Chỉ thuê theo ngày':!availabilityResults||!datePicked?'':availableForPlan(id,six)?'Còn máy':'Hết trong khung đã chọn';
  const short=plan.value==='six'&&six;
  return `<article class="occasion-card">
   <img src="img/${photo}.webp" width="144" height="112" alt="" loading="lazy" decoding="async">
   <div><h3>${escapeText(name)}</h3><p>${reason}</p>
   <span class="occasion-rate">${currency(short?six:day)} / ${short?'6 giờ':'ngày'}</span>
   ${status?`<small>${status}</small>`:''}
   <a data-model="${id}" href="#dat-lich" aria-label="Xem lịch thuê ${escapeText(name)}">Xem lịch thuê</a></div>
  </article>`;
 });
 $('#occasion-models').innerHTML=cards.join('')||(catalog.length?'<p>Mở danh sách máy để xem các mẫu đang cho thuê.</p>':'<p>Đang tải gợi ý máy…</p>');
}
for(const button of document.querySelectorAll('[data-occasion]')){
 button.addEventListener('click',()=>{
  occasion=button.dataset.occasion;
  for(const option of button.parentElement.children)option.setAttribute('aria-pressed',String(option===button));
  renderRecommendations();
 });
}
function rangeDays(){
 if(plan.value==='six'||!start.value||!end.value||end.value<start.value)return 1;
 return 1+(Date.parse(end.value)-Date.parse(start.value))/dayMs;
}
function renderCard([id,name,brand,six,day,third,fifth,photo,deposit]){
 const days=rangeDays();
 const totalLine=days>1?`<span class="range-total">${days} ngày · <b>${currency(dayPrice(days,day,third,fifth))}</b></span>`:'';
 const state=plan.value==='six'&&!six?'unsupported':!availabilityResults||!datePicked?'unknown':availableForPlan(id,six)?'free':'busy';
 const count=availabilityCounts?.[managerModels[id]];
 const label={unsupported:'Chỉ thuê theo ngày',unknown:'',free:'Còn máy',busy:'Hết máy trong ngày đã chọn'}[state];
 const hot=hotIds.includes(id);
 const picture=photo?`<img src="img/${photo}.webp" alt="${escapeText(name)}" width="720" height="540" loading="lazy" decoding="async">`:'<span class="no-photo">Chưa có ảnh</span>';
 return `<article class="card${model.value===id?' is-selected':''}" data-state="${state}">
 <a class="product-image" data-model="${id}" href="#dat-lich" aria-label="Chọn ${escapeText(name)}">${picture}</a>
 <div class="card-body">
 <div class="card-tags">${hot?'<span class="bestseller"><span aria-hidden="true">★</span> Best Seller</span>':''}${label?`<span class="stock-tag" data-state="${state}">${label}</span>`:''}</div>
 <h3>${escapeText(name)}</h3><div class="rates"><span><b>${currency(day)}</b> / ngày</span>${six?'<span>'+currency(six)+' / 6 giờ</span>':'<span>Gói theo ngày</span>'}${totalLine}</div>
 <button type="button" class="deposit-link" data-deposit-model="${id}">${deposit>0?'Cọc '+dong(deposit)+' + CCCD':'Xem cách cọc'}</button>
 <details class="rate-details"><summary>Giá dài ngày</summary><div>Ngày 3–4 · ${currency(third)}/ngày<br>Từ ngày 5 · ${currency(fifth)}/ngày</div></details>
 <a class="button" data-model="${id}" href="#dat-lich" aria-label="${state==='busy'?'Xem mẫu còn thay cho':'Xem lịch trống cho'} ${escapeText(name)}">${state==='busy'?'Xem mẫu còn':'Chọn máy'}</a></div></article>`;
}

function renderCatalog(){
 if(!catalog.length)return;
 renderRecommendations();
 const term=normalize($('#search').value);
 const only=onlyAvailable.checked&&availabilityResults;
 const match=([id,name,brand,six])=>(group==='Tất cả'||groupName(brand)===group)&&normalize(name).includes(term)&&(!only||availableForPlan(id,six));
 const items=catalog.filter(match);
 const sort=$('#sort').value;
 items.sort((a,b)=>sort==='default'?byPriority(a,b):(sort==='low'?1:-1)*(a[4]-b[4])||byPriority(a,b));
 $('#results-count').textContent=items.length+' mẫu';
 const tracks=[...document.querySelectorAll('[data-carousel]')];
 const positions=new Map(tracks.map(track=>[track.dataset.carousel,track.scrollLeft]));
 const hot=catalog.filter(([id,,,six])=>hotIds.includes(id)&&(!only||availableForPlan(id,six))).sort(byPriority);
 $('#hot-cameras').hidden=!hot.length;
 $('#hot-track').innerHTML=hot.map(renderCard).join('');
 $('#catalog').innerHTML=groups.slice(1).map(brand=>{
  const matches=items.filter(item=>groupName(item[2])===brand);
  return matches.length?`<section class="camera-group"><h3>${brand}</h3><div class="camera-rail" data-carousel="${brand}" tabindex="0" aria-label="Máy ${brand}">${matches.map(renderCard).join('')}</div></section>`:'';
 }).join('');
 for(const track of document.querySelectorAll('[data-carousel]'))track.scrollLeft=positions.get(track.dataset.carousel)||0;
 $('#empty').hidden=items.length>0;
 $('#empty').textContent=only?'Không có mẫu còn máy với bộ lọc này. Thử đổi khung thuê hoặc hãng.':'Không tìm thấy mẫu phù hợp.';
}

let modelPicked=false; // khách đã tự chọn máy chưa
// Máy chọn sẵn đã hết trong khung giờ → chuyển sang máy hot còn trống (chỉ khi khách chưa tự chọn)
function autoPickAvailable(){
 if(modelPicked||sending||!availabilityResults)return;
 const cur=catalog.find(item=>item[0]===model.value);
 if(cur&&availableForPlan(cur[0],cur[3]))return;
 const choices=availableModels();
 const next=choices.filter(([id])=>hotIds.includes(id)).sort(byPriority)[0]||choices[0];
 if(next){model.value=next[0];requestEdited()}
}
function chooseModel(id){
 if(!id||sending)return;
 modelPicked=true;
 model.value=id;
 requestEdited();
 renderCatalog();
 const box=$('#booking-selection');
 box.classList.remove('flash');void box.offsetWidth;box.classList.add('flash');
 if(!rentalWindow())return;
 if(availabilityResults?.[managerModels[id]]===false)$('#availability-list').open=true;
}
for(const name of groups){
 const button = document.createElement('button');
 button.type = 'button';
 button.textContent = name;
 button.setAttribute('aria-pressed', String(name === group));
 button.addEventListener('click', () => {
  group = name;
  for(const sibling of filters.children) sibling.setAttribute('aria-pressed', String(sibling === button));
  renderCatalog();
 });
 filters.append(button);
}
$('#search').addEventListener('input', renderCatalog);
$('#sort').addEventListener('change', renderCatalog);
onlyAvailable.addEventListener('change',renderCatalog);
const depositDialog=$('#deposit-dialog');
function showDeposit(id){
 const selected=catalog.find(item=>item[0]===id);
 if(!selected)return;
 const deposit=selected[8];
 $('#deposit-title').textContent=selected[1];
 $('#cash-deposit-amount').textContent=deposit>0?dong(deposit)+' tiền cọc và CCCD.':deposit===0?'Mẫu này có mức cọc tiền tiêu chuẩn 0đ. Hỏi Cami về giấy tờ khi nhận.':'Hỏi Cami mức cọc tiền cho máy này.';
 depositDialog.showModal();
}
$('#booking-deposit-options').addEventListener('click',()=>showDeposit(model.value));
for(const section of [$('#catalog'),$('#hot-track'),$('#occasion-models')])section.addEventListener('click',event=>{
 const deposit=event.target.closest('[data-deposit-model]');
 if(deposit){showDeposit(deposit.dataset.depositModel);return}
 const link=event.target.closest('[data-model]');
 if(link)chooseModel(link.dataset.model);
});
function dayPrice(days, day, third, fifth){
 return Math.min(days,2)*day + Math.min(Math.max(days-2,0),2)*third + Math.max(days-4,0)*fifth;
}
function rentalWindow(){
 if(!start.value || start.value < today) return null;
 if(plan.value === 'six'){
  const weekday = new Date(start.value+'T00:00:00Z').getUTCDay();
  if(weekday === 0 || weekday === 6 || !hour.value || hour.value < '07:00' || hour.value > '16:30') return null;
  const finish = String(Number(hour.value.slice(0,2))+6).padStart(2,'0')+hour.value.slice(2);
  return [start.value+'T'+hour.value,start.value+'T'+finish];
 }
 if(!end.value || end.value < start.value) return null;
 return [start.value+'T07:00',end.value+'T22:30'];
}
function showAvailability(){
 const list = $('#availability-list');
 list.hidden = !availabilityResults;
 if(!availabilityResults) return;
 const selected = catalog.find(item=>item[0]===model.value);
 if(!selected)return;
 const six = plan.value==='six';
 const available = id=>availabilityResults[managerModels[id]];
 availabilityStatus.dataset.state = six&&!selected[3] ? 'unknown' : available(model.value) ? 'free' : 'busy';
 availabilityStatus.textContent = six&&!selected[3] ? 'Mẫu này chỉ có gói theo ngày.'
  : available(model.value) ? 'Còn máy'+' · '+selected[1] : 'Hết máy · '+selected[1];
 const choices = availableModels();
 list.querySelector('summary').textContent = choices.length+' mẫu còn trong khung này';
 $('#available-models').replaceChildren(...choices.map(([id,name])=>{
  const button=document.createElement('button');
  button.type='button';button.textContent=name;
  button.addEventListener('click',()=>{chooseModel(id);model.focus()});
  return button;
 }));
}
async function loadAvailability(){
 if(!catalog.length)return;
 const range=rentalWindow();
 availabilityRequest?.abort();
 availabilityResults=undefined;
 availabilityCounts=undefined;
 onlyAvailable.disabled=true;
 renderCatalog();
 showAvailability();
 updateSendButton();
 availabilityStatus.dataset.state='unknown';
 if(!range){
  checkAvailability.disabled=true;
  catalogAvailability.textContent=availabilityStatus.textContent='Chọn ngày và giờ thuê hợp lệ để kiểm tra.';
  return;
 }
 const request = new AbortController();
 availabilityRequest=request;
 checkAvailability.disabled=true;
 catalogAvailability.textContent=availabilityStatus.textContent='Đang kiểm tra lịch Cami…';
 try{
  const url=new URL(managerApi+'/availability');
  url.search = new URLSearchParams({start:range[0],end:range[1]}).toString();
  const response=await fetch(url,{signal:request.signal,credentials:'omit',cache:'no-store'});
  if(!response.ok)throw Error('Không tải được lịch');
  const data=await response.json();
  if(request.signal.aborted)return;
  if(!catalog.every(([id])=>typeof data.models?.[managerModels[id]]==='boolean'))throw Error('Lịch chưa đủ dữ liệu');
  availabilityResults=data.models;
  availabilityCounts=data.counts;
  autoPickAvailable();
  onlyAvailable.disabled=false;
  const availableCount=availableModels().length;
  catalogAvailability.textContent=availableCount?availableCount+' mẫu còn trong khung này.':'Đã hết máy trong khung này. Thử chọn ngày khác.';
  renderCatalog();
  showAvailability();
  updateSendButton();
 }catch(error){
  if(!request.signal.aborted)catalogAvailability.textContent=availabilityStatus.textContent='Chưa kiểm tra được lịch. Thử lại hoặc nhắn Cami.';
 }finally{
  if(!request.signal.aborted)checkAvailability.disabled=false;
 }
}
async function openStockList(){
 const range=rentalWindow();
 if(!range)return;
 const [from,to]=range;
 const singleDay=from.slice(0,10)===to.slice(0,10);
 const weekday=new Intl.DateTimeFormat('vi-VN',{weekday:'long',timeZone:'UTC'}).format(new Date(from.slice(0,10)));
 $('#stock-window').textContent=singleDay
  ?weekday+', '+dateText(from.slice(0,10))+' · '+from.slice(11)+'–'+to.slice(11)
  :dateText(from.slice(0,10))+' '+from.slice(11)+' đến '+dateText(to.slice(0,10))+' '+to.slice(11);
 const summary=$('#stock-summary');
 const list=$('#stock-list');
 const retry=$('#stock-retry');
 const note=$('#stock-note');
 list.replaceChildren();
 note.hidden=retry.hidden=true;
 summary.textContent='Đang kiểm tra lịch Cami…';
 if(!stockDialog.open)stockDialog.showModal();
 await loadAvailability();
 if(!stockDialog.open||range.join('/')!==rentalWindow()?.join('/'))return;
 if(!availabilityResults){
  summary.textContent=catalogAvailability.textContent;
  retry.hidden=false;
  return;
 }
 const choices=availableModels();
 summary.textContent=choices.length?choices.length+' mẫu còn · Giá thuê dự kiến':'Hết máy trong khung này. Thử chọn ngày khác.';
 const days=1+(Date.parse(to.slice(0,10))-Date.parse(from.slice(0,10)))/dayMs;
 const item=([id,name,,six,day,third,fifth])=>{
  const price=plan.value==='six'?six:dayPrice(days,day,third,fifth);
  return `<li><button type="button" data-model="${id}"><strong>${escapeText(name)}</strong><span>${currency(price)}</span></button></li>`;
 };
 // Tách máy ảnh và ống kính thành hai nhóm riêng.
 const isLens=row=>row[2]==='Ống kính';
 list.innerHTML=[['Máy ảnh',choices.filter(row=>!isLens(row))],['Ống kính',choices.filter(isLens)]]
  .filter(([,rows])=>rows.length)
  .map(([title,rows])=>`<li class="stock-group">${title} <small>${rows.length}</small></li>`+rows.map(item).join('')).join('');
 note.hidden=!choices.length;
}
checkAvailability.addEventListener('click',openStockList);
$('#stock-retry').addEventListener('click',openStockList);
$('#stock-list').addEventListener('click',event=>{
 const button=event.target.closest('button[data-model]');
 if(!button||sending)return;
 stockDialog.close();
 chooseModel(button.dataset.model);
 location.hash='dat-lich';
 model.focus({preventScroll:true});
});

function quote(){
 const item=catalog.find(item=>item[0]===model.value);
 if(!item)throw Error('Chọn một mẫu máy để xem giá.');
 const [,name,,six,day,third,fifth]=item;
 const short = plan.value === 'six';
 const days = 1 + (Date.parse(end.value) - Date.parse(start.value)) / dayMs;
 const date = new Date(start.value + 'T12:00:00Z');
 const weekday = date.getUTCDay();
 const invalid = short && (!six || weekday === 0 || weekday === 6 || !hour.value || hour.value < '07:00' || hour.value > '16:30');
 if(start.value < today || !start.value) throw Error('Chọn ngày nhận từ hôm nay.');
 if(invalid) throw Error('Gói 6 giờ chỉ áp dụng cho máy có giá 6 giờ, từ thứ Hai đến thứ Sáu, giờ bắt đầu 7:00–16:30.');
 if(!short && (!Number.isInteger(days) || days < 1)) throw Error('Ngày trả phải từ ngày nhận trở đi.');
 const extras = [[battery,'Pin thêm',accessoryRates.battery],[reflector,'Hắt sáng',accessoryRates.reflector],[tripod,'Tripod',accessoryRates.tripod]].filter(([input])=>input.checked);
 const rent = short ? six : dayPrice(days,day,third,fifth);
 const extraTotal = (short ? 1 : days)*extras.reduce((sum,[,,rate])=>sum+rate,0);
 const price = rent + extraTotal;
 let period = dateText(start.value)+' → '+dateText(end.value)+' · '+days+' ngày';
 if(short){
  const finish = String(Number(hour.value.slice(0,2))+6).padStart(2,'0')+hour.value.slice(2);
  period = dateText(start.value)+' · '+hour.value+'–'+finish+' · 6 giờ';
 }
 return {name, period, extras, price, rent, extraTotal, days: short?null:days};
}
function updateSendButton(){
 const busy=availabilityResults?.[managerModels[model.value]]===false;
 submitRequest.disabled=!catalog.length||!model.value||sending||!!sentCode||busy;
}
function update(){
 if(sending)return;
 const short = plan.value === 'six';
 end.disabled = short;
 $('#end-label').hidden = short;
 hour.disabled = $('#hour-label').hidden = !short;
 end.min = start.value || today;
 if(!end.value || end.value < end.min) end.value = end.min;
 $('#send').hidden = true;
 const selected=catalog.find(item=>item[0]===model.value);
 const deposit=selected?.[8];
 $('#booking-selection').hidden=!selected;
 if(selected){
  const photo=$('#booking-photo');
  if(photo.dataset.model!==selected[0]){
   photo.dataset.model=selected[0];
   photo.innerHTML=selected[7]?'<img src="img/'+selected[7]+'.webp" width="96" height="80" alt="">':'';
  }
  $('#booking-model').textContent=selected[1];
  $('#booking-rate').textContent=currency(selected[4])+' / ngày';
 }
 for(const button of document.querySelectorAll('[data-day-offset]')){
  const date=new Date(Date.parse(today)+Number(button.dataset.dayOffset)*dayMs).toISOString().slice(0,10);
  button.setAttribute('aria-pressed',String(start.value===date&&(short||end.value===date)));
 }
 $('#booking-deposit-options').hidden=!selected;
 const depositNote=$('#machine-deposit');
 depositNote.hidden=!(deposit>0);
 depositNote.innerHTML=deposit>0?'Cọc tiền + CCCD <strong>'+dong(deposit)+'</strong>':'';
 const slot=rentalWindow();
 $('#request-window').textContent=slot ? dateText(slot[0].slice(0,10))+' · '+slot[0].slice(11)+' đến '+dateText(slot[1].slice(0,10))+' · '+slot[1].slice(11) : 'Chọn thời gian thuê để xem giá.';
 try{
  const price=quote();
  $('#price-breakdown').innerHTML=`<li><span>Thuê máy${price.days?' · '+price.days+' ngày':' · 6 giờ'}</span><span>${currency(price.rent)}</span></li>`+
   (price.extraTotal?`<li><span>Phụ kiện (${price.extras.map(([,l])=>l).join(', ')})</span><span>${currency(price.extraTotal)}</span></li>`:'');
  total.innerHTML='<span>Tổng dự kiến</span><span>'+currency(price.price)+'</span>';
  total.dataset.ok='1';
  stickyTotal=currency(price.price);
 }catch(error){
  $('#price-breakdown').innerHTML='';
  total.textContent=error.message;
  delete total.dataset.ok;
  stickyTotal='';
 }
 updateFinderSummary();
 updateSticky();
 const range = rentalWindow()?.join('/') || 'invalid';
 if(range !== currentRange){
  currentRange=range;
  loadAvailability();
 }else showAvailability();
 updateSendButton();
}
function requestEdited(){
 if(sending)return;
 $('#request-success').hidden=true;
 sentCode=undefined;
 submitRequest.textContent='Gửi yêu cầu thuê';
 requestFeedback.hidden=true;
 update();
}
form.addEventListener('input',requestEdited);
for(const input of [plan,start,end,hour])input.addEventListener('input',requestEdited);

form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(sending||sentCode)return;
 const body = {};
 try{
  quote();
  const range=rentalWindow();
  if(!range)throw Error('Chọn khung thuê hợp lệ.');
  const name=form.elements.customerName.value.trim();
  const phone=form.elements.phone.value.trim().replace(/[ .()-]/g,'').replace(/^\+84/,'0');
  if(!name||!/^0[0-9]{9}$/.test(phone))throw Error('Nhập tên và số điện thoại Việt Nam hợp lệ (10 số).');
  Object.assign(body,{name,phone,model:managerModels[model.value],plan:plan.value,start:range[0],end:range[1],delivery:delivery.value,
   battery:Number(battery.checked),reflector:Number(reflector.checked),tripod:Number(tripod.checked)});
 }catch(error){showRequestFeedback(error.message,false);return}
 const signature=JSON.stringify(body);
 if(lastSubmission?.signature!==signature)lastSubmission={signature,id:crypto.randomUUID()};
 sending=true;
 updateSendButton();
 submitRequest.textContent='Đang gửi…';
 const inputs=[...form.elements].filter(input=>!input.disabled&&input!==submitRequest);
 for(const input of inputs)input.disabled=true;
 try{
  const response=await fetch(managerApi+'/requests',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({...body,id:lastSubmission.id}),signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  if(!response.ok||typeof data.code!=='string'){
   if(response.status===409)loadAvailability();
   throw Error(data.error||'Chưa gửi được yêu cầu. Vui lòng thử lại.');
  }
  sentCode=data.code;
  showSuccess(data.code);
 }catch(error){showRequestFeedback(error.name==='TimeoutError'||error instanceof TypeError?'Chưa nhận được xác nhận. Thông tin vẫn được giữ, bấm gửi lại để thử tiếp.':error.message,false)}
 finally{
  for(const input of inputs)input.disabled=false;
  sending=false;
  submitRequest.textContent=sentCode?'Đã gửi yêu cầu':'Gửi yêu cầu thuê';
  update();
 }
});

function showSuccess(code){
 requestFeedback.hidden=true;
 $('#success-code').textContent=code;
 try{
  const q=quote();
  $('#success-zalo').dataset.text='Chào Cami, mình vừa gửi yêu cầu thuê '+q.name+' ('+q.period+'), mã '+code+'. Cami xác nhận giúp mình nhé!';
 }catch{}
 $('#request-success').hidden=false;
 $('#request-success').scrollIntoView({behavior:'smooth',block:'center'});
}
$('#success-zalo').addEventListener('click',()=>{const t=$('#success-zalo').dataset.text;if(t)navigator.clipboard?.writeText(t).catch(()=>{})});
$('#success-new').addEventListener('click',()=>{
 $('#request-success').hidden=true;
 sentCode=undefined;
 submitRequest.textContent='Gửi yêu cầu thuê';
 update();
 document.getElementById('may').scrollIntoView({behavior:'smooth'});
});
function showRequestFeedback(message,success){
 requestFeedback.hidden=false;
 requestFeedback.dataset.state=success?'free':'busy';
 requestFeedback.textContent=message;
 requestFeedback.focus();
}

$('#prepare-chat').addEventListener('click',()=>{
 try{
  const {name,period,extras,price} = quote();
  const available=availabilityResults?.[managerModels[model.value]];
  message.value = ['Chào Cami, mình muốn hỏi lịch thuê '+name+'.', 'Thời gian: '+period, 'Cách nhận: '+delivery.value, 'Phụ kiện thêm: '+(extras.map(([,label])=>label).join(', ')||'Không'), 'Giá dự kiến trên web: '+currency(price)+'.', available===true?'Cami xác nhận để mình giữ lịch nhé!':available===false?'Nếu mẫu này hết, Cami tư vấn giúp mình mẫu còn trong khung này nhé!':'Cami kiểm tra máy trống giúp mình nhé!'].join('\n');
  $('#copy-status').textContent = '';
  $('#send').hidden = false;
  $('#copy').focus();
 }catch(error){total.textContent = error.message}
});
$('#copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(message.value);$('#copy-status').textContent='Đã sao chép. Mở Instagram hoặc Zalo rồi dán nội dung.'}
 catch{message.focus();message.select();$('#copy-status').textContent='Nội dung đã được chọn. Nhấn giữ để sao chép.'}
});
async function loadCatalog(){
 const status=$('#catalog-load');
 const retry=$('#retry-catalog');
 retry.hidden=true;
 status.textContent='Đang tải danh mục Cami…';
 try{
  const response=await fetch(managerApi+'/catalog',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Catalog unavailable');
  const data=await response.json();
  const names=new Set();
  const rows=[];
  for(const item of data.models){
   const {model:name,six,day,third,fifth,deposit,lens}=item;
   if(typeof name!=='string'||!name||names.has(name)||![six,day,third,fifth].every(n=>Number.isSafeInteger(n)&&n>=0))continue;
   names.add(name);
   const known=photoMetadata.find(([id])=>managerModels[id]===name);
   const [id,title,brand]=known||['manager-'+rows.length,name,'Khác'];
   managerModels[id]=name;
   rows.push([id,title,lens===true&&!known?'Ống kính':brand,six,day,third,fifth,known?.[0],Number.isSafeInteger(deposit)&&deposit>=0?deposit:undefined]);
  }
  if(!rows.length||!['battery','reflector','tripod'].every(key=>Number.isSafeInteger(data.extras?.[key])&&data.extras[key]>=0))throw Error('Catalog incomplete');
  catalog=rows.sort(byPriority);
  accessoryRates=data.extras;
  for(const key of ['battery','reflector','tripod'])$('#rate-'+key).textContent=currency(accessoryRates[key]);
  model.replaceChildren(new Option('Chọn mẫu máy',''),...catalog.map(([id,name])=>new Option(name,id)));
  model.value=catalog[0][0];
  model.disabled=false;
  status.textContent='';
  currentRange='';
  renderCatalog();
  update();
 }catch{
  status.textContent='Chưa tải được danh mục. Bấm thử lại để xem máy và giá từ Cami.';
  retry.hidden=false;
  if(!catalog.length)$('#occasion-models').textContent='Chưa tải được danh mục. Bạn có thể thử tải lại ở mục Danh sách máy.';
 }
}
for(const button of document.querySelectorAll('[data-day-offset]')){
 button.addEventListener('click',()=>{
  const date=new Date(Date.parse(today)+Number(button.dataset.dayOffset)*dayMs).toISOString().slice(0,10);
  start.value=end.value=date;
  requestEdited();
 });
}
$('#retry-catalog').addEventListener('click',loadCatalog);
loadCatalog();

// ---- Upgrade: finder summary, weekend shortcut, phone check, sticky bar ----
function updateFinderSummary(){
 const el=$('#finder-summary');
 const slot=rentalWindow();
 if(!slot){el.textContent='';return}
 const wd=d=>new Intl.DateTimeFormat('vi-VN',{weekday:'short',timeZone:'UTC'}).format(new Date(d));
 const a=slot[0].slice(0,10),b=slot[1].slice(0,10);
 el.innerHTML=plan.value==='six'
  ?`<b>Gói 6 giờ</b> · ${wd(a)} ${dateText(a)} · ${slot[0].slice(11)}–${slot[1].slice(11)}`
  :`<b>${rangeDays()} ngày</b> · nhận ${wd(a)} ${dateText(a)} 7:00 → trả ${wd(b)} ${dateText(b)} 22:30`;
}
$('#weekend-shortcut').addEventListener('click',()=>{
 const t=new Date(today+'T00:00:00Z');
 const add=(6-t.getUTCDay()+7)%7;
 const sat=new Date(t.getTime()+add*dayMs).toISOString().slice(0,10);
 const sun=new Date(Date.parse(sat)+dayMs).toISOString().slice(0,10);
 plan.value='day';start.value=sat;end.value=sun;
 requestEdited();renderCatalog();
});
for(const input of [plan,start,end])input.addEventListener('change',renderCatalog);
const phoneInput=form.elements.phone;
const phoneOk=()=>/^0[0-9]{9}$/.test(phoneInput.value.trim().replace(/[ .()-]/g,'').replace(/^\+84/,'0'));
phoneInput.addEventListener('blur',()=>{const bad=phoneInput.value.trim()&&!phoneOk();$('#phone-error').hidden=!bad;phoneInput.setAttribute('aria-invalid',String(!!bad))});
phoneInput.addEventListener('input',()=>{if(phoneOk()){$('#phone-error').hidden=true;phoneInput.removeAttribute('aria-invalid')}});
let bookingVisible=false,pastHero=false;
function updateSticky(){
 const bar=$('#sticky-book');
 const sel=catalog.find(i=>i[0]===model.value);
 const show=!!sel&&pastHero&&!bookingVisible&&!sentCode;
 bar.hidden=!show;
 document.body.classList.toggle('has-sticky',show);
 if(!sel)return;
 $('#sticky-model').textContent=sel[1];
 $('#sticky-total').textContent=stickyTotal?'Dự kiến '+stickyTotal:'Chọn ngày để xem giá';
 const img=$('#sticky-photo');
 if(sel[7]){img.src='img/'+sel[7]+'.webp';img.hidden=false}else img.hidden=true;
}
if('IntersectionObserver' in window){
 new IntersectionObserver(([e])=>{bookingVisible=e.isIntersecting;updateSticky()},{threshold:0.05}).observe($('#dat-lich'));
 new IntersectionObserver(([e])=>{pastHero=!e.isIntersecting;updateSticky()}).observe($('#rental-finder'));
}
model.addEventListener('change',()=>{modelPicked=true;renderCatalog()});

// Khách tự chọn ngày thì mới hiện trạng thái còn/hết trên thẻ máy
function markDatePicked(){if(!datePicked){datePicked=true;renderCatalog()}}
for(const input of [plan,start,end,hour])input.addEventListener('input',markDatePicked);
for(const el of document.querySelectorAll('[data-day-offset],#weekend-shortcut,#check-availability'))el.addEventListener('click',markDatePicked);

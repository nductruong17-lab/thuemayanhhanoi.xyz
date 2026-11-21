// Cami motion & polish — loaded after app.js. Wrapped to avoid clashing with app.js globals.
(()=>{
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasIO='IntersectionObserver' in window;

/* Header shrink + scroll progress */
const top=q('.top');
const bar=document.createElement('div');bar.className='scroll-progress';document.body.append(bar);
let ticking=false;
function onScroll(){
 if(ticking)return;ticking=true;
 requestAnimationFrame(()=>{
  const y=scrollY,h=document.documentElement.scrollHeight-innerHeight;
  top.classList.toggle('scrolled',y>12);
  bar.style.setProperty('--p',h>0?Math.min(1,y/h):0);
  ticking=false;
 });
}
addEventListener('scroll',onScroll,{passive:true});onScroll();

/* Active nav link */
const navLinks=qa('.nav nav a');
if(hasIO){
 const io=new IntersectionObserver(entries=>{
  for(const e of entries)if(e.isIntersecting){
   for(const a of navLinks)a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id);
  }
 },{rootMargin:'-45% 0px -50% 0px'});
 for(const a of navLinks){const t=q(a.getAttribute('href'));if(t)io.observe(t)}
}

/* Scroll reveal */
const seen=new Set();
const revealIO=hasIO&&!reduce?new IntersectionObserver(entries=>{
 for(const e of entries)if(e.isIntersecting){e.target.classList.add('in');revealIO.unobserve(e.target)}
},{rootMargin:'0px 0px -8% 0px',threshold:.08}):null;
function reveal(el,i=0,key){
 if(!revealIO)return;
 if(key&&seen.has(key))return;   // only animate a card the first time it appears
 if(key)seen.add(key);
 el.classList.add('reveal');el.style.setProperty('--i',i);
 revealIO.observe(el);
}
qa('.reviews-head, .reviews-actions, .recommendations .section-head, #may .section-head, .booking-grid>div:first-child, #request, #quy-trinh h2, .steps article, details.policy').forEach((el,i)=>reveal(el,el.matches('.steps article,details.policy')?i%4:0));
function revealCards(container){
 qa('.card',container).forEach((card,i)=>{
  const id=card.querySelector('[data-model]')?.dataset.model;
  reveal(card,Math.min(i,5),container.id+':'+(card.closest('[data-carousel]')?.dataset.carousel||'')+':'+id);
 });
}

/* Skeleton while catalog loads */
const catalogEl=q('#catalog');
const sk='<div class="skeleton-card"><i></i><i></i><i></i></div>';
if(!catalogEl.children.length){
 catalogEl.innerHTML='<div class="skeleton-rail" data-skeleton>'+sk.repeat(4)+'</div>';
 const om=q('#occasion-models');
 if(!om.querySelector('.occasion-card'))om.innerHTML='<div class="skeleton-card" style="min-height:120px"></div>'.repeat(2);
}
new MutationObserver(()=>{
 if(!q('#retry-catalog').hidden)q('[data-skeleton]')?.remove();
}).observe(q('#retry-catalog'),{attributes:true,attributeFilter:['hidden']});

/* Carousel arrows */
function addRailNav(host,rail){
 if(!rail||host.querySelector(':scope>.rail-nav'))return;
 const nav=document.createElement('div');nav.className='rail-nav';
 nav.innerHTML='<button type="button" aria-label="Xem máy trước">‹</button><button type="button" aria-label="Xem máy tiếp">›</button>';
 const [prev,next]=nav.children;
 const sync=()=>{prev.disabled=rail.scrollLeft<4;next.disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-4};
 prev.onclick=()=>rail.scrollBy({left:-rail.clientWidth*.85,behavior:reduce?'auto':'smooth'});
 next.onclick=()=>rail.scrollBy({left:rail.clientWidth*.85,behavior:reduce?'auto':'smooth'});
 rail.addEventListener('scroll',sync,{passive:true});
 host.append(nav);requestAnimationFrame(sync);
}
function decorate(){
 revealCards(catalogEl);revealCards(q('#hot-track'));
 qa('.camera-group',catalogEl).forEach(g=>addRailNav(g,g.querySelector('.camera-rail')));
 addRailNav(q('#hot-cameras'),q('#hot-track'));
}
new MutationObserver(decorate).observe(catalogEl,{childList:true});
new MutationObserver(decorate).observe(q('#hot-track'),{childList:true});

/* Occasion switch animation */
const om=q('#occasion-models');
qa('[data-occasion]').forEach(b=>b.addEventListener('click',()=>{
 om.classList.remove('switching');void om.offsetWidth;om.classList.add('switching');
}));

/* Ripple */
document.addEventListener('pointerdown',e=>{
 const b=e.target.closest('.button,.hero-catalog-link,.filters button,.date-shortcuts button');
 if(!b||reduce)return;
 const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2.2;
 const dot=document.createElement('span');dot.className='ripple';
 dot.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;
 b.append(dot);setTimeout(()=>dot.remove(),650);
});

/* Hero parallax tilt (desktop) */
const hero=q('.hero'),heroImg=q('.hero-product img');
if(hero&&heroImg&&!reduce&&matchMedia('(pointer:fine)').matches){
 hero.addEventListener('pointermove',e=>{
  const r=hero.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
  heroImg.style.transform=`rotate(${-8+x*6}deg) translate(${x*14}px,${y*10}px)`;
 });
 hero.addEventListener('pointerleave',()=>heroImg.style.transform='');
}

/* Toast */
const wrap=document.createElement('div');wrap.className='toast-wrap';wrap.setAttribute('role','status');document.body.append(wrap);
function toast(html){
 const t=document.createElement('div');t.className='toast';t.innerHTML=html;
 wrap.replaceChildren(t);
 setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300)},2200);
}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-model]');
 if(!el)return;
 setTimeout(()=>{
  try{
   const row=catalog.find(r=>r[0]===model.value);
   if(!row)return;
   toast((row[7]?`<img src="img/${row[7]}.webp" alt="">`:'')+'Đã chọn '+row[1].replace(/[<>&]/g,''));
  }catch{}
 },30);
});
q('#weekend-shortcut')?.addEventListener('click',()=>toast('Đã chọn cuối tuần này 📅'));

/* Animated total */
const total=q('#total');let last=0;
new MutationObserver(()=>{
 const span=total.dataset.ok&&total.lastElementChild;
 if(!span)return;
 const target=Number(span.textContent.replace(/\D/g,''));
 if(!target||target===last){last=target||last;return}
 const from=last;last=target;
 total.classList.remove('bump');void total.offsetWidth;total.classList.add('bump');
 if(reduce||!from)return;
 const t0=performance.now(),dur=450;
 const step=t=>{
  const k=Math.min(1,(t-t0)/dur),v=Math.round(from+(target-from)*(1-Math.pow(1-k,3)));
  if(total.lastElementChild!==span)return;
  span.textContent=(Math.round(v/1000)*1000).toLocaleString('vi-VN')+'đ';
  if(k<1)requestAnimationFrame(step);else span.textContent=target.toLocaleString('vi-VN')+'đ';
 };
 requestAnimationFrame(step);
}).observe(total,{childList:true});

/* Confetti on successful request */
function confetti(){
 if(reduce)return;
 const c=document.createElement('canvas');c.className='confetti';document.body.append(c);
 const x=c.getContext('2d'),dpr=devicePixelRatio||1;
 c.width=innerWidth*dpr;c.height=innerHeight*dpr;x.scale(dpr,dpr);
 const colors=['#8a355d','#e7a0bf','#f6c3d6','#ffd27a','#2e8b5a','#ffffff'];
 const ps=Array.from({length:140},()=>({x:innerWidth/2,y:innerHeight*.45,vx:(Math.random()-.5)*14,vy:-Math.random()*14-4,r:Math.random()*6+4,c:colors[Math.random()*colors.length|0],a:Math.random()*6,s:(Math.random()-.5)*.3}));
 const t0=performance.now();
 (function frame(t){
  x.clearRect(0,0,innerWidth,innerHeight);
  for(const p of ps){p.vy+=.35;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.a+=p.s;
   x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);x.restore()}
  if(t-t0<2600)requestAnimationFrame(frame);else c.remove();
 })(t0);
}
const success=q('#request-success');
if(success)new MutationObserver(()=>{if(!success.hidden)confetti()}).observe(success,{attributes:true,attributeFilter:['hidden']});
})();

/* APP STORE LINKS: after Google Play / Apple approve the app, paste the public listing addresses here.
   Leave a value empty and its badge shows "Coming soon". Only addresses on play.google.com / apps.apple.com are accepted. */
const APP_LINKS={play:'',ios:''};
/* KIRO AI wording: address of your deployed relay (kiro-ai-relay). Leave empty to use calculated answers only.
   The relay holds the AI key; this page never does. Only anonymised totals are sent (no customer names or phones, no invoice numbers). */
const AI_RELAY_URL='';
const $=s=>document.querySelector(s), h=(el,html)=>{if(el)el.innerHTML=html};
const CATS={
 fb:{n:'Food & Beverage',i:'🍽',d:'Cafés to full-service restaurants, from first order to final bill.',
  t:['Coffee Shops','Quick Service','Drive-through','Full Service','Bars & Breweries','Food Trucks','Catering','Bakeries','Pizzerias'],
  c:['Take payments','Manage orders','Table management','QR ordering','Kitchen orders','Menu management','Inventory','Ingredient tracking','Recipe management','Track wastage','Customer management','Customer loyalty','KIRO Marketing','Employee management','Sales analytics','Cash-flow management']},
 re:{n:'Retail',i:'🛍',d:'Barcode, variants and multi-store stock that stays accurate.',
  t:['Clothing','Footwear','Grocery','Kirana / Convenience','Electronics','Home & Gift','Jewellery','Hardware','Beauty Retail','Garden','Specialty Stores','Other Retail'],
  c:['Take payments','Track inventory','Barcode management','SKU management','Product variants','Size & color management','Purchase orders','Supplier management','Stock transfers','Returns & exchanges','Customer management','Loyalty','KIRO Marketing','Employee management','Sales analytics','Cash-flow management','Multi-store management','Online catalog','Business website']},
 be:{n:'Beauty',i:'✂',d:'Bookings, staff and memberships in one calendar.',
  t:['Salons','Barbers','Spas','Nail Salons','Beauty Stores','Wellness Businesses'],
  c:['Appointments','Services','Staff scheduling','Customer profiles','Customer history','Memberships','Packages','Payments','Service inventory','Employee commissions','Customer loyalty','Marketing','Reminders','Reports','Analytics']},
 sv:{n:'Services',i:'🔧',d:'Quotes, bookings and invoices for teams on the move.',
  t:['Professional Services','Repair Services','Automotive','Cleaning','Home Services','Consulting','Education & Training','Other Services'],
  c:['Appointments','Bookings','Customer management','Service management','Employee scheduling','Invoices','Payments','Quotes','Expenses','Customer communication','Marketing','Reports','Analytics']}
};
const ALL=[...Object.values(CATS).map(c=>c.n),'Restaurants','Coffee Shops','Bakeries','Pizzerias','Grocery','Kirana','Clothing','Footwear','Electronics','Jewellery','Hardware','Salons','Barbers','Spas','Repair Shops','Automotive','Professional Services','Education','Cleaning','Home Services'];
const sl=x=>x.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const chips=(a,cls='bg-mist')=>a.map(x=>`<span class="text-sm ${cls} rounded-full px-3 py-1.5">${x}</span>`).join('');

const TYPES=[];Object.entries(CATS).forEach(([k,c])=>c.t.forEach(n=>TYPES.push({k,n,s:sl(n)})));
const lchips=a=>a.map(t=>`<a href="#/type/${t.k}/${t.s}" class="text-sm bg-mist rounded-full px-3 py-1.5 hover:bg-kate/10 hover:text-kate">${t.n}</a>`).join('');
/* ---------- NAV ---------- */
const links=[['Products','#/products'],['Solutions','#/solutions'],['KIRO Marketing','#/marketing'],['KIRO AI','#/ai'],['Pricing','#/pricing'],['Resources','#/resources']];
h($('#navlinks'),`<button id="btBtn" aria-expanded="false" aria-controls="mega" class="px-3 py-2 rounded-lg hover:bg-mist font-semibold">Business Types ▾</button>`+links.map(l=>`<a href="${l[1]}" class="px-3 py-2 rounded-lg hover:bg-mist">${l[0]}</a>`).join(''));
let active='fb';
function renderMega(){
 const keys=[...Object.keys(CATS),'all'];
 const left=keys.map(k=>`<button data-k="${k}" class="w-full text-left px-4 py-3 rounded-xl font-semibold flex justify-between ${k===active?'bg-kate/10 text-kate':'hover:bg-mist'}">${k==='all'?'All Business Types':CATS[k].n}<span>›</span></button>`).join('');
 let right;
 if(active==='all') right=`<h3 class="text-xl font-extrabold">All Business Types</h3><input id="q" placeholder="Search industries…" aria-label="Search industries" class="mt-3 w-full border border-black/15 rounded-xl px-4 py-2.5"><div id="allGrid" class="mt-4 flex flex-wrap gap-2">${lchips(TYPES)}</div><p class="mt-4 text-sm text-ink/60">Hundreds more categories are supported by the same schema. <a href="#/all" class="text-kate font-semibold">Open full page →</a></p>`;
 else{const c=CATS[active];right=`<div class="grid md:grid-cols-3 gap-8">
  <div><p class="text-xs font-bold tracking-widest text-ink/50">DISCOVER</p><a href="#/category/${active}" class="mt-2 block font-semibold hover:text-kate">Overview</a><a href="#/category/${active}" class="mt-1 block font-semibold hover:text-kate">Why KIRO for ${c.n}</a><p class="mt-2 text-sm text-ink/60">${c.d}</p>
  <p class="mt-6 text-xs font-bold tracking-widest text-ink/50">BUSINESS TYPES</p><ul class="mt-2 space-y-1.5 text-sm">${c.t.map(x=>`<li><a href="#/type/${active}/${sl(x)}" class="hover:text-kate">${x}</a></li>`).join('')}</ul></div>
  <div class="md:col-span-2"><p class="text-xs font-bold tracking-widest text-ink/50">CAPABILITIES</p><div class="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">${c.c.map(x=>`<div class="flex gap-2"><span class="text-kate">✓</span>${x}</div>`).join('')}</div></div></div>`}
 h($('#mega'),`<div class="max-w-7xl mx-auto px-5 py-8 grid lg:grid-cols-[260px_1fr] gap-8"><div role="tablist" class="space-y-1">${left}</div><div class="fade">${right}</div></div>`);
 $('#mega').querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{active=b.dataset.k;renderMega()});
 const q=$('#q'); if(q) q.oninput=()=>h($('#allGrid'),lchips(TYPES.filter(t=>t.n.toLowerCase().includes(q.value.toLowerCase()))));
}
const mega=$('#mega'),btn=$('#btBtn');
const setMega=o=>{mega.classList.toggle('hidden',!o);btn.setAttribute('aria-expanded',o);if(o){renderMega();mega.classList.add('fade')}};
btn.onclick=e=>{e.stopPropagation();setMega(mega.classList.contains('hidden'))};
document.addEventListener('click',e=>{if(!e.composedPath().includes(mega))setMega(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){setMega(false);btn.focus()}});

/* mobile accordion */
const mob=$('#mobile'),bg=$('#burger');
h(mob,`<details class="border-b border-black/5"><summary class="py-3 font-semibold cursor-pointer">Business Types</summary><div class="pb-3 space-y-2">${Object.entries(CATS).map(([k,c])=>`<details class="ml-2"><summary class="py-2 cursor-pointer">${c.i} ${c.n}</summary><ul class="pl-6 pb-2 text-sm space-y-2 text-ink/80"><li><a href="#/category/${k}" class="font-semibold text-kate">Overview</a></li>${c.t.map(t=>`<li><a href="#/type/${k}/${sl(t)}" class="block">${t}</a></li>`).join('')}</ul></details>`).join('')}<a href="#/all" class="ml-2 block py-2 font-semibold">All Business Types</a></div></details>`+links.map(l=>`<a href="${l[1]}" class="block py-3 border-b border-black/5">${l[0]}</a>`).join('')+`<div class="flex gap-3 pt-4"><a href="#" class="flex-1 text-center border border-black/15 rounded-full py-3 font-semibold">Sign In</a><a href="#start" class="flex-1 text-center bg-ink text-white rounded-full py-3 font-semibold">Get Started</a></div>`);
bg.onclick=()=>{const o=mob.classList.toggle('hidden');bg.setAttribute('aria-expanded',!o);bg.textContent=o?'☰':'✕'};

/* ---------- SECTIONS ---------- */
h($('#bars'),[40,65,50,80,60,95,72].map((v,i)=>`<div class="flex-1 rounded-t-lg ${i===5?'bg-kate':'bg-ink/15'}" style="height:${v}%"></div>`).join(''));
h($('#industryCards'),Object.entries(CATS).map(([k,c])=>`<a href="#/category/${k}" class="card block rounded-3xl border border-black/10 p-6 bg-white"><div class="text-3xl">${c.i}</div><h3 class="mt-4 text-xl font-bold">${c.n}</h3><p class="mt-2 text-sm text-ink/70">${c.d}</p><p class="mt-4 text-xs text-ink/50">${c.t.slice(0,3).join(' · ')}</p></a>`).join(''));
h($('#storeBadges'),[['play','Get it on','Google Play','https://play.google.com/'],['ios','Download on the','App Store','https://apps.apple.com/']].map(([k,a,b,pre])=>{const u=String(APP_LINKS[k]||'').trim(),live=u.startsWith(pre)&&/^https:\/\/[^\s"'<>]+$/.test(u);
 const inner=`<span class="block text-[11px] leading-none opacity-70">${live?a:'Coming soon on'}</span><span class="block text-lg font-bold leading-tight">${b}</span>`;
 return live?`<a href="${u}" target="_blank" rel="noopener" class="rounded-2xl bg-ink text-white px-5 py-3 min-w-[170px] hover:opacity-90">${inner}</a>`:`<span role="note" aria-disabled="true" class="rounded-2xl border border-dashed border-black/25 text-ink/50 px-5 py-3 min-w-[170px]">${inner}</span>`}).join(''));



const P=[['🧾','KIRO POS','Fast checkout on desktop, tablet and mobile.'],['📊','KIRO Business','Orders, staff, expenses and reports in one dashboard.'],['📦','KIRO Inventory','Stock, suppliers, variants and purchase orders.'],['💳','KIRO Payments','UPI, cards and cash reconciled automatically.'],['📣','KIRO Marketing','Campaigns built from real customer data.'],['✦','KIRO AI','Ask your business questions in plain language.'],['🌐','KIRO Website','A live website generated from your catalog.']];


const AI={"Which products sold the most this month?":"Top sellers: Cappuccino (612), Butter Croissant (455), Cold Brew (398). Cappuccino drove 21% of revenue.",
 "Which products are running low?":"3 items below reorder level: Oat milk (6 left), Paper cups 12oz (40), Croissant dough (2 kg).",
 "Why did sales decrease this week?":"Sales are down 9%: weekday lunch orders fell after a 2-day stock-out on sandwiches. Weekend sales rose 4%.",
 "Create a promotion for customers who haven't visited in 60 days.":"Draft ready: 87 customers · “We miss you — 15% off this week” via WhatsApp. Review and send?",
 "How much did I make this month?":"Revenue ₹9.4L, expenses ₹6.1L, estimated profit ₹3.3L (35%)."};


/* ---------- LOGIN ---------- */
const login=$('#login');
const openLogin=e=>{e&&e.preventDefault&&e.preventDefault();if(U){openApp();return}login.classList.remove('hidden');document.body.style.overflow='hidden';setMega(false);mob.classList.add('hidden');setMode('signin')};
const closeLogin=()=>{login.classList.add('hidden');document.body.style.overflow=''};
document.querySelectorAll('a').forEach(a=>{if(a.textContent.trim()==='Sign In')a.onclick=openLogin});
['#loginClose','#loginClose2'].forEach(x=>$(x).addEventListener('click',closeLogin));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLogin()});

/* ---------- REAL APP: accounts, businesses, operations (data saved in this browser) ---------- */
const KEY='kate_db_v1',SES='kate_ses';
let DB={acc:[],biz:{}},U=null,S={mod:'',cart:[],c:{},q:'',flash:'',last:null,camp:null};
try{DB=JSON.parse(localStorage.getItem(KEY))||DB}catch(e){}
try{const sid=localStorage.getItem(SES);U=DB.acc.find(a=>a.uid===sid)||null}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}};
const uid=()=>Math.random().toString(36).slice(2,10);
const rs=n=>'₹'+Math.round(n||0).toLocaleString('en-IN');
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const B=()=>DB.biz[U.biz],CF=()=>BT[B().type];
const paid=()=>B().sales.filter(s=>s.st==='paid');
const sumT=a=>a.reduce((x,s)=>x+s.total,0);
const d0=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const fT=t=>new Date(t).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const fD=t=>new Date(t).toLocaleDateString('en-IN');
const wa=p=>{const d=(p||'').replace(/\D/g,'');return d.length===10?'91'+d:d};
const val=id=>($('#'+id)||{}).value||'';
const flash=m=>{S.flash=m};
async function hpOld(pw,salt){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+pw));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return btoa(unescape(encodeURIComponent(salt+pw)))}}
async function hp(pw,salt){try{const en=new TextEncoder(),k=await crypto.subtle.importKey('raw',en.encode(pw),'PBKDF2',false,['deriveBits']),b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:en.encode(salt),iterations:150000,hash:'SHA-256'},k,256);return 'v2:'+[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return hpOld(pw,salt)}}
async function chk(a,pw){return a.ph===(a.ph.startsWith('v2:')?await hp(pw,a.salt):await hpOld(pw,a.salt))}
const pwOk=p=>p.length>=8&&/[A-Za-z]/.test(p)&&/\d/.test(p);
const pwScore=p=>{let n=0;if(p.length>=8)n++;if(p.length>=12)n++;if(/[A-Z]/.test(p)&&/[a-z]/.test(p))n++;if(/\d/.test(p))n++;if(/[^A-Za-z0-9]/.test(p))n++;return Math.min(4,n)};
const rcGen=()=>{const al='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(12));return [...r].map(x=>al[x%al.length]).join('').match(/.{4}/g).join('-')};
const FAIL={};
function locked(id){const f=FAIL[id];if(!f||f.n<5)return 0;if(Date.now()>=f.u){f.n=0;return 0}return Math.ceil((f.u-Date.now())/1000)}
const normId=x=>{x=x.trim().toLowerCase();const d=x.replace(/\D/g,'');return !x.includes('@')&&d.length===10?d:x};

/* business type configs: items, sale fields, special modules, marketing templates */
const MKD=['Hi {name}, we miss you at {biz}! Visit us this week and enjoy 10% off.','Hi {name}, thank you for shopping with {biz}. We have new offers just for you!'];
const BT={
 restaurant:{n:'Restaurant / Café',i:'🍽',w:'Menu',ins:1,mods:['kitchen','wastage','insights','purchases'],
  ex:[['otype','Order type','sel',['Dine-in','Takeaway','Delivery']],['table','Table no.','txt']],
  items:[['Cappuccino','Beverages',180,60],['Cold Brew','Beverages',210,40],['Masala Chai','Beverages',80,80],['Veg Burger','Food',220,30],['Margherita Pizza','Food',350,20],['Pasta Alfredo','Food',320,20],['Butter Croissant','Bakery',120,25],['Brownie','Bakery',140,25]],
  mk:['Hi {name}, we miss you at {biz}! Show this message for 15% off your next order.','Hi {name}, new dishes are live at {biz}. Come and try them this week!']},
 salon:{n:'Salon',i:'✂',w:'Services',mods:['commission'],ex:[['stylist','Stylist','txt'],['appt','Appointment time','time']],
  items:[['Haircut','Hair',400,null],['Hair Colour','Hair',1800,null],['Beard Trim','Grooming',200,null],['Facial','Skin',1200,null],['Manicure','Nails',600,null],['Head Massage','Spa',350,null],['Bridal Package','Packages',9000,null]],
  mk:['Hi {name}, it has been a while! Book your next visit at {biz} and get 15% off any service.','Hi {name}, happy birthday from {biz}! Enjoy a free head massage with any service this month.']},
 clothing:{n:'Clothing Store',i:'👕',w:'Products',ins:1,gst:5,mods:['insights','purchases'],ex:[['size','Size / Colour','txt']],
  items:[['T-Shirt','Tops',799,40,480],['Formal Shirt','Tops',1299,25,800],['Jeans','Bottoms',1799,30,1100],['Kurta','Ethnic',1499,20,900],['Jacket','Winter',2999,12,1900],['Belt','Accessories',599,30,320]],
  mk:['Hi {name}, new arrivals are in at {biz}! Show this message for 10% off your next purchase.','Hi {name}, our season sale has started at {biz}. Visit us this weekend!']},
 saree:{n:'Saree Shop / Boutique',i:'🥻',w:'Sarees',ins:1,gst:5,mods:['insights','purchases'],ex:[['size','Blouse / colour note','txt']],
  items:[['Banarasi Silk Saree','Banarasi',5499,12,3800],['Kanjivaram Silk Saree','Silk',8999,8,6500],['Cotton Handloom Saree','Cotton',1299,30,800],['Georgette Party Saree','Georgette',2199,18,1400],['Chanderi Saree','Chanderi',2799,14,1900],['Linen Saree','Linen',1899,16,1200],['Readymade Blouse','Blouse',699,25,380]],
  mk:['Hi {name}, new saree collection has arrived at {biz}! Visit us this week.','Hi {name}, festival offers are live at {biz}. Special prices on selected sarees.']},
 grocery:{n:'Grocery / Kirana',i:'🛒',w:'Products',ins:1,mods:['insights','purchases'],ex:[],
  items:[['Basmati Rice 5kg','Staples',520,40],['Sunflower Oil 1L','Staples',160,50],['Toor Dal 1kg','Staples',150,40],['Sugar 1kg','Staples',48,60],['Tea 250g','Beverages',130,35],['Biscuits','Snacks',30,100],['Milk 500ml','Dairy',30,60],['Detergent 1kg','Household',110,30]],
  mk:['Hi {name}, monthly grocery offers are live at {biz}. Order on WhatsApp for home delivery!','Hi {name}, we have not seen you in a while at {biz}. Enjoy ₹50 off your next bill above ₹500.']},
 battery:{n:'Battery Shop',i:'🔋',w:'Batteries',ins:1,mods:['warranty','insights','purchases'],ex:[['serial','Battery serial no.','txt'],['warr','Warranty (months)','num'],['exch','Old battery exchange (₹)','num']],
  items:[['Exide Inverter 150Ah','Inverter',14500,8],['Luminous Tubular 200Ah','Inverter',17800,5],['Amaron Car 65Ah','Automotive',6200,10],['Exide Bike 9Ah','Two-wheeler',1900,15],['Inverter Trolley','Accessories',2400,6],['Distilled Water 5L','Accessories',120,40],['Battery Charging','Service',300,null]],
  mk:['Hi {name}, your battery from {biz} may be due for a check. Visit us for a free health test!','Hi {name}, exchange your old battery at {biz} and get the best value on a new one.']},
 repair:{n:'Repair Shop',i:'🔧',w:'Services & Parts',ins:1,mods:['insights','purchases'],ex:[['device','Device / job no.','txt']],
  items:[['Screen Replacement','Mobile',2500,null],['Battery Replacement','Mobile',1200,null],['Laptop Service','Laptop',900,null],['Charging Port Repair','Mobile',700,null],['Data Recovery','Software',1500,null],['Tempered Glass','Parts',150,50]],
  mk:['Hi {name}, thanks for trusting {biz}. Get 10% off on your next repair or accessory.','Hi {name}, is your device running slow? Book a service at {biz} this week.']}
};
BT.pharmacy={n:'Pharmacy / Medical Store',i:'💊',ph:true,w:'Medicines',mods:[],ex:[],items:[],mk:MKD};
const MODN={dashboard:['📊','Dashboard'],pos:['🧾','POS'],insights:['🧠','Stock Insights'],kitchen:['👨‍🍳','Kitchen'],wastage:['🗑','Wastage'],commission:['💈','Commissions'],warranty:['🛡','Warranty'],purchases:['📥','Stock In'],items:['📦','Items'],sales:['💳','Sales'],customers:['👥','Customers'],marketing:['📣','Marketing'],expenses:['🧮','Expenses'],reports:['📈','Reports'],staff:['🧑‍💼','Staff'],settings:['⚙','Settings']};
Object.assign(MODN,{phHome:['🏠','Home'],phBill:['🧾','Billing'],phSales:['📑','Bills & returns'],phStock:['📦','Inventory'],phExpiry:['⏳','Expiry'],phBuy:['🛒','Purchases'],phCust:['👥','Customers'],phSup:['🏭','Suppliers'],phRx:['📋','Prescriptions'],phRep:['📊','Reports'],phIns:['🧠','Stock insights'],phAi:['🤖','Ask KIRO'],ai:['🤖','Ask KIRO'],audit:['🔍','Audit log'],phSet:['⚙','Store settings'],phWa:['💬','WhatsApp reports'],account:['🔑','Password']});
const ROLE_L={owner:'Owner',accounts:'Accounts',pos:'POS',supervisor:'Supervisor',manager:'Manager',pharmacist:'Pharmacist',cashier:'Cashier',inventory:'Inventory staff',accountant:'Accountant'};
function phMods(){const m=['phHome'];if(can('bill'))m.push('phBill','phSales');if(can('editMed')||can('stockAdj'))m.push('phStock','phExpiry');if(can('cost'))m.push('phIns');if(can('purchase'))m.push('phBuy');if(can('customer'))m.push('phCust');if(can('supplier'))m.push('phSup');if(can('approve_rx')||can('reports'))m.push('phRx');if(can('reports'))m.push('phRep','phWa');m.push('phAi');if(can('audit'))m.push('audit');if(U.role==='owner')m.push('staff','phSet');m.push('account');return m}
function mods(){if(CF().ph)return phMods();const c=CF().mods,r=U.role;
 if(r==='owner')return ['dashboard','pos',...c,'items','sales','customers','marketing','expenses','reports','ai','staff','settings'];
 if(r==='accounts')return ['dashboard','sales','expenses','reports','ai'];
 if(r==='pos')return ['pos',...c.filter(m=>['kitchen','warranty'].includes(m)),'customers'];
 return ['dashboard','items',...c,'sales','customers','reports','ai'];}

/* ui helpers (all user text is escaped with esc) */
const IN='border border-black/15 rounded-xl px-3 py-2 text-sm w-full bg-white';
const kp=a=>`<div class="grid grid-cols-2 xl:grid-cols-4 gap-3">${a.map(k=>`<div class="bg-white rounded-2xl p-4 border border-black/5"><p class="text-xs text-ink/60">${k[0]}</p><p class="text-2xl font-extrabold mt-1">${k[1]}</p></div>`).join('')}</div>`;
const tb=(hd,rows,em)=>rows.length?`<div class="bg-white rounded-2xl border border-black/5 overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-ink/50"><tr>${hd.map(x=>`<th class="p-3 font-semibold whitespace-nowrap">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="border-t border-black/5">${r.map(c=>`<td class="p-3">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-ink/50">${em||'Nothing here yet.'}</div>`;
const bx=(t,b)=>`<div class="bg-white rounded-2xl border border-black/5 p-4">${t?`<p class="font-bold mb-3">${t}</p>`:''}${b}</div>`;
const fi=(id,ph,t)=>`<input id="${id}" type="${t||'text'}" placeholder="${ph}" aria-label="${ph}" class="${IN}">`;
/* KIRO QR encoder: byte mode, ECC M, versions 1-10, SVG output. */
const qrSvg=(()=>{
const ECW=[10,16,26,18,24,16,18,22,22,26],NB=[1,1,1,2,2,4,4,4,5,5];
const raw=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
const mul=(a,b)=>{let r=0;for(let i=7;i>=0;i--){r=(r<<1)^((r>>>7)*0x11D);r^=((b>>>i)&1)*a}return r&255};
const div=d=>{const r=new Array(d).fill(0);r[d-1]=1;let root=1;for(let i=0;i<d;i++){for(let j=0;j<d;j++){r[j]=mul(r[j],root);if(j+1<d)r[j]^=r[j+1]}root=mul(root,2)}return r};
const rem=(data,dv)=>{const r=dv.map(()=>0);for(const b of data){const f=b^r.shift();r.push(0);dv.forEach((c,i)=>r[i]^=mul(c,f))}return r};
function encode(text){
  const bytes=Array.from(new TextEncoder().encode(text));
  let v=0;
  for(let k=1;k<=10;k++){const dc=Math.floor(raw(k)/8)-ECW[k-1]*NB[k-1];if(4+(k>=10?16:8)+8*bytes.length<=dc*8){v=k;break}}
  if(!v)return null;
  const dc=Math.floor(raw(v)/8)-ECW[v-1]*NB[v-1],bits=[];
  const put=(x,n)=>{for(let i=n-1;i>=0;i--)bits.push((x>>>i)&1)};
  put(4,4);put(bytes.length,v>=10?16:8);bytes.forEach(b=>put(b,8));
  put(0,Math.min(4,dc*8-bits.length));while(bits.length%8)bits.push(0);
  for(let p=0xEC;bits.length<dc*8;p^=0xEC^0x11)put(p,8);
  const data=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|bits[i+j];data.push(b)}
  // ECC + interleave
  const nb=NB[v-1],el=ECW[v-1],rc=Math.floor(raw(v)/8),ns=nb-rc%nb,sl=Math.floor(rc/nb),dv=div(el),blocks=[];
  for(let i=0,k=0;i<nb;i++){const d=data.slice(k,k+sl-el+(i<ns?0:1));k+=d.length;const e=rem(d,dv);if(i<ns)d.push(0);blocks.push(d.concat(e))}
  const out=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!=sl-el||j>=ns)out.push(b[i])});
  return {v,out};
}
function build(text){
  const e=encode(text);if(!e)return null;
  const v=e.v,n=v*4+17,M=Array.from({length:n},()=>new Array(n).fill(false)),F=Array.from({length:n},()=>new Array(n).fill(false));
  const set=(x,y,c)=>{M[y][x]=c;F[y][x]=true};
  for(let i=0;i<n;i++){set(6,i,i%2==0);set(i,6,i%2==0)}
  const finder=(x,y)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),xx=x+dx,yy=y+dy;if(xx>=0&&xx<n&&yy>=0&&yy<n)set(xx,yy,d!=2&&d!=4)}};
  finder(3,3);finder(n-4,3);finder(3,n-4);
  const na=v==1?0:Math.floor(v/7)+2,ap=[];
  if(na){const st=Math.ceil((v*4+4)/(na*2-2))*2;ap.push(6);for(let p=n-7;ap.length<na;p-=st)ap.splice(1,0,p)}
  ap.forEach((cx,i)=>ap.forEach((cy,j)=>{if((i==0&&j==0)||(i==0&&j==na-1)||(i==na-1&&j==0))return;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!=1)}));
  const fmt=m=>{let d=m,r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=((d<<10)|r)^0x5412,g=i=>((b>>>i)&1)!=0;
    for(let i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));for(let i=9;i<15;i++)set(14-i,8,g(i));
    for(let i=0;i<8;i++)set(n-1-i,8,g(i));for(let i=8;i<15;i++)set(8,n-15+i,g(i));set(8,n-8,true)};
  fmt(0);
  if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=(v<<12)|r;for(let i=0;i<18;i++){const c=((b>>>i)&1)!=0,a=n-11+i%3,q=Math.floor(i/3);set(a,q,c);set(q,a,c)}}
  // codewords
  let i=0;const tot=e.out.length*8;
  for(let right=n-1;right>=1;right-=2){if(right==6)right=5;for(let vert=0;vert<n;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)==0,y=up?n-1-vert:vert;if(!F[y][x]&&i<tot){M[y][x]=((e.out[i>>>3]>>>(7-(i&7)))&1)!=0;i++}}}
  const conds=[(x,y)=>(x+y)%2==0,(x,y)=>y%2==0,(x,y)=>x%3==0,(x,y)=>(x+y)%3==0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2==0,(x,y)=>x*y%2+x*y%3==0,(x,y)=>(x*y%2+x*y%3)%2==0,(x,y)=>((x+y)%2+x*y%3)%2==0];
  const apply=m=>{for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!F[y][x]&&conds[m](x,y))M[y][x]=!M[y][x]};
  const pen=()=>{let p=0;const lines=[];
    for(let y=0;y<n;y++){lines.push(M[y].map(Number));}
    for(let x=0;x<n;x++){lines.push(M.map(r=>Number(r[x])))}
    for(const L of lines){let run=1;for(let k=1;k<=n;k++){if(k<n&&L[k]==L[k-1])run++;else{if(run>=5)p+=run-2;run=1}}
      const s=L.join('');for(const pt of ['10111010000','00001011101']){let ix=-1;while((ix=s.indexOf(pt,ix+1))>=0)p+=40}}
    for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const c=M[y][x];if(c==M[y][x+1]&&c==M[y+1][x]&&c==M[y+1][x+1])p+=3}
    let dk=0;M.forEach(r=>r.forEach(c=>{if(c)dk++}));p+=Math.floor(Math.abs(dk*20-n*n*10)/(n*n))*10;return p};
  let best=0,bp=1e9;
  for(let m=0;m<8;m++){fmt(m);apply(m);const p=pen();apply(m);if(p<bp){bp=p;best=m}}
  fmt(best);apply(best);return M;
}
return function(text,px){
  const M=build(String(text));if(!M)return '';
  const n=M.length,q=4,t=n+q*2;let d='';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(M[y][x])d+=`M${x+q},${y+q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${px||200}" height="${px||200}" shape-rendering="crispEdges" role="img" aria-label="UPI payment QR code"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
};
})();

/* UPI payment QR (standard UPI deep link; works with PhonePe, GPay, Paytm, BHIM). No payment verification: cashier confirms. */
const UPI_RE=/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/,f2=n=>(Math.round(n*100)/100).toFixed(2);
const upiLink=(vpa,name,amt,note)=>'upi://pay?pa='+vpa+'&pn='+encodeURIComponent(String(name||'Store').replace(/[^A-Za-z0-9 .&-]/g,'').slice(0,40)||'Store')+'&am='+amt+'&cu=INR&tn='+encodeURIComponent(String(note||'Bill').replace(/[^A-Za-z0-9 -]/g,'').slice(0,40)||'Bill');
const upiPanel=(vpa,biz,amt,note)=>{if(!(amt>0))return '';
 if(!UPI_RE.test(vpa||''))return `<div class="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">UPI chosen. Add your shop's UPI ID in Settings to show a payment QR here.</div>`;
 const a=f2(amt),link=upiLink(vpa,biz,a,note);
 return `<div class="mt-3 rounded-xl border border-black/10 p-3 text-center"><p class="text-xs font-bold tracking-widest text-ink/50">SCAN TO PAY WITH ANY UPI APP</p><div class="inline-block my-2 border border-black/10 rounded-lg overflow-hidden">${qrSvg(link,190)}</div><p class="font-extrabold text-lg">₹${a}</p><p class="text-xs text-ink/60">${esc(vpa)}</p><a href="${esc(link)}" class="inline-block mt-2 text-xs font-semibold underline text-kate">Open UPI app on this phone</a><label class="flex items-center justify-center gap-2 text-sm font-semibold mt-3"><input type="checkbox" data-chk="upiok" data-amt="${a}" ${S.c.upiokA===a?'checked':''}> Payment received on my phone</label></div>`};
/* Smart Inventory Insights (clothing and saree shops): stock age, dead stock, fast movers.
   Each item keeps batches it.bt=[{id,t:receivedAt,q,l:left,c:unitCost}]; sales use oldest batch first (FIFO). */
const DAY=864e5,DEAD_DAYS=90;
function insFit(it){
 if(it.stock==null){delete it.bt;return}
 it.bt=it.bt||[];
 const d=it.stock-it.bt.reduce((a,x)=>a+x.l,0);
 if(d>0)it.bt.push({id:uid(),t:Date.now(),q:d,l:d,c:it.cost||0});
 else if(d<0){let n=-d;it.bt.sort((a,b)=>a.t-b.t).forEach(x=>{const k=Math.min(x.l,n);x.l-=k;n-=k})}
 it.bt=it.bt.filter(x=>x.l>0).sort((a,b)=>a.t-b.t)}
function insData(now=Date.now()){
 const b=B(),items=b.items.filter(i=>i.stock!=null),ps=paid(),last={},byId={},byName={};
 let ch=false;items.forEach(it=>{const was=JSON.stringify(it.bt||null);insFit(it);if(JSON.stringify(it.bt)!==was)ch=true});if(ch)save();
 b.items.forEach(i=>{byId[i.id]=i;byName[i.n]=i});
 const find=l=>(l.id&&byId[l.id])||byName[l.n]||null;
 ps.forEach(s=>s.items.forEach(l=>{const it=find(l);if(it)last[it.id]=Math.max(last[it.id]||0,s.t)}));
 const cats=t0=>{const m={};ps.filter(s=>s.t>=t0).forEach(s=>s.items.forEach(l=>{const it=find(l),c=it?it.cat:'Other';m[c]=(m[c]||0)+l.q}));return Object.entries(m).sort((a,b)=>b[1]-a[1])};
 let inv=0,stuck=0,nocost=0;const dead=[],ages=[['0-30 days',0],['31-60 days',0],['61-90 days',0],['Over 90 days',0]];
 items.forEach(it=>{if(!(it.cost>0)&&!it.bt.some(x=>x.c>0))nocost++;
  const idle=!last[it.id]||now-last[it.id]>DEAD_DAYS*DAY;
  it.bt.forEach(x=>{const c=x.c||it.cost||0,v=x.l*c,age=Math.floor((now-x.t)/DAY);inv+=v;ages[age>90?3:age>60?2:age>30?1:0][1]+=v;
   if(age>DEAD_DAYS&&idle){stuck+=v;dead.push({it,x,age,locked:v})}})});
 dead.sort((a,b)=>b.locked-a.locked);
 return{inv,stuck,nocost,dead,ages,week:cats(now-7*DAY),fort:cats(now-14*DAY).slice(0,5)}}
const gstRate=()=>{const b=B();return b.gst!=null?+b.gst:(CF().gst||0)};
function gstOf(total){const r=gstRate();if(!(r>0)||!(total>0))return null;const tax=total-total/(1+r/100),cg=Math.round(tax/2*100)/100,sg=Math.round((tax-cg)*100)/100;return{r,cg,sg,base:Math.round((total-cg-sg)*100)/100}}
const m2=n=>'₹'+Number(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const gstBox=total=>{const g=gstOf(total);return g?`<div class="mt-2 pt-2 border-t border-black/5 text-xs text-ink/60 space-y-0.5"><div class="flex justify-between"><span>Taxable value</span><span>${m2(g.base)}</span></div><div class="flex justify-between"><span>CGST ${g.r/2}%</span><span>${m2(g.cg)}</span></div><div class="flex justify-between"><span>SGST ${g.r/2}%</span><span>${m2(g.sg)}</span></div><p class="text-[11px] text-ink/40">Prices include GST. Check the rate for your products with your CA.</p></div>`:''};
function insAgeCell(it,deadIds){if(it.stock==null||!it.bt||!it.bt.length)return '<span class="text-ink/40">—</span>';const a=Math.floor((Date.now()-it.bt[0].t)/DAY);return deadIds.has(it.id)?`<span class="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">${a} d · dead stock</span>`:`<span class="text-sm">${a} d</span>`}
const insBanner=()=>{if(!CF().ins||!mods().includes('insights'))return '';const D=insData();return D.stuck>0?`<div class="mb-4 rounded-2xl bg-orange-50 border border-orange-200 p-4 text-sm flex flex-wrap items-center justify-between gap-2"><span>⚠ ${rs(D.stuck)} is stuck in ${D.dead.length} dead stock lot(s) older than ${DEAD_DAYS} days.</span>${bt('go','See dead stock','insights','bg-orange-600 text-white')}</div>`:''};
const fv=(id,l,v,t)=>`<label class="text-xs font-semibold text-ink/60">${l}<input id="${id}" type="${t||'text'}" value="${esc(v)}" class="${IN} font-normal"></label>`;
const bt=(act,txt,a,cls)=>`<button data-act="${act}" data-a="${esc(a==null?'':a)}" class="${cls||'bg-ink text-white hover:bg-kate'} rounded-full px-4 py-2 text-sm font-semibold transition whitespace-nowrap">${txt}</button>`;
const sel=(id,opts,cur,x)=>`<select id="${id}" ${x||''} class="${IN}">${opts.map(o=>{const v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return `<option value="${esc(v)}" ${v==cur?'selected':''}>${esc(l)}</option>`}).join('')}</select>`;
const h2=t=>`<h2 class="text-2xl font-extrabold mb-4">${t}</h2>`;
const topItems=ps=>{const m={};ps.forEach(s=>s.items.forEach(i=>{const x=m[i.n]||(m[i.n]={n:i.n,q:0,r:0});x.q+=i.q;x.r+=i.p*i.q}));return Object.values(m).sort((a,b)=>b.r-a.r)};
function tot(){const sub=S.cart.reduce((a,l)=>a+l.p*l.q,0),cp=B().coupons.find(x=>x.on&&x.code===(S.c.coupon||'').trim().toUpperCase()),disc=cp?Math.round(sub*cp.pct/100):0,exch=CF().ex.some(e=>e[0]==='exch')?Math.max(0,Math.min(+S.c.exch||0,sub-disc)):0;return{sub,cp,disc,exch,total:Math.max(0,sub-disc-exch)}}
const receipt=s=>`${B().name}\nReceipt #${s.no}\n${s.items.map(i=>`${i.n} x${i.q} = ${rs(i.p*i.q)}`).join('\n')}\n${s.disc?'Discount: -'+rs(s.disc)+'\n':''}${s.exch?'Exchange: -'+rs(s.exch)+'\n':''}Total: ${rs(s.total)} (${s.pay})${s.gst?`\nIncl. GST ${s.gst.r}%: CGST ₹${f2(s.gst.cg)} + SGST ₹${f2(s.gst.sg)}`:''}\nThank you!`;
function custUpsert(name,phone,total){name=(name||'').trim();phone=(phone||'').replace(/\D/g,'');if(!name&&!phone)return null;
 const b=B();let c=b.customers.find(x=>(phone&&x.phone===phone)||(!phone&&name&&x.name.toLowerCase()===name.toLowerCase()));
 if(!c){c={id:uid(),name:name||'Customer',phone,dob:'',visits:0,spent:0,points:0,last:0};b.customers.push(c)}
 c.visits++;c.spent+=total;c.points+=Math.floor(total/100);c.last=Date.now();return c}
function segs(){const cs=B().customers,now=Date.now(),mth=new Date().getMonth(),st=[...cs].sort((a,b)=>b.spent-a.spent);
 return{all:cs,repeat:cs.filter(c=>c.visits>=2),inactive:cs.filter(c=>c.last&&now-c.last>30*864e5),top:st.slice(0,Math.max(1,Math.ceil(cs.length/4))).filter(c=>c.spent>0),birthday:cs.filter(c=>c.dob&&new Date(c.dob).getMonth()===mth)}}
const SEGL={all:'All customers',repeat:'Repeat customers (2+ visits)',inactive:'Not visited in 30 days',top:'Top spenders',birthday:'Birthdays this month'};

function staffTools(l){const st=l.filter(a=>a.role!=='owner');return st.length?`<div class="mt-4">`+bx('Reset a staff password',`<div class="grid sm:grid-cols-3 gap-2">${sel('rS',st.map(a=>[a.uid,a.name+' ('+a.id+')']))}${fi('rP','New password (8+, letters & numbers)','password')}${bt('staffPw','Reset')}</div>`)+`</div>`:''}
function securityBox(){return `<div class="mt-4">`+bx('Security',`<div class="grid sm:grid-cols-3 gap-2">${fi('cpC','Current password','password')}${fi('cpN','New password (8+, letters & numbers)','password')}${fi('cpN2','Confirm new password','password')}</div><div class="mt-3 flex flex-wrap gap-2">${bt('pwChange','Change password')}${bt('rcNew','Create new recovery code','','border border-black/15')}</div><p class="text-xs text-ink/50 mt-2">A recovery code lets you reset a forgotten password. Enter your current password above to create a new one.</p>${S.rcShow?`<div class="mt-3 rounded-xl bg-mist p-4 text-center"><p class="text-xs text-ink/60">Your new recovery code (shown once)</p><p class="text-xl font-extrabold tracking-widest select-all">${S.rcShow}</p></div>`:''}`)+`</div>`}
/* views */
const V={
 dashboard(){const b=B(),ps=paid(),t0=d0(Date.now()),m0=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();
  const td=ps.filter(s=>s.t>=t0),mo=ps.filter(s=>s.t>=m0),ex=b.expenses.filter(e=>e.t>=m0).reduce((x,e)=>x+e.amt,0);
  const days=[...Array(7)].map((_,i)=>{const t=t0-(6-i)*864e5;return[new Date(t).toLocaleDateString('en-IN',{weekday:'short'}),sumT(ps.filter(s=>s.t>=t&&s.t<t+864e5))]});
  const mx=Math.max(1,...days.map(d=>d[1])),low=b.items.filter(i=>i.stock!=null&&i.stock<=b.low),top=topItems(ps).slice(0,5);
  return h2('Dashboard')+(ps.length?'':`<div class="mb-4 rounded-2xl bg-kate/10 text-kate p-4 text-sm font-semibold">No sales yet. ${mods().includes('pos')?bt('go','Open POS','pos','bg-kate text-white'):'Sales will appear here once the POS team starts billing.'}</div>`)
  +insBanner()+kp([['Today\'s sales',rs(sumT(td))],['Orders today',td.length],['This month',rs(sumT(mo))],['Profit this month',rs(sumT(mo)-ex)]])
  +`<div class="mt-4 grid xl:grid-cols-2 gap-4">`+bx('Last 7 days',`<div class="flex items-end gap-2 h-36">${days.map((d,i)=>`<div class="flex-1 flex flex-col justify-end items-center gap-1 h-full"><div class="w-full rounded-t-lg ${i===6?'bg-kate':'bg-ink/15'}" style="height:${Math.max(3,d[1]/mx*100)}%" title="${rs(d[1])}"></div><span class="text-[10px] text-ink/50">${d[0]}</span></div>`).join('')}</div>`)
  +bx('Top items',top.length?tb(['Item','Qty','Sales'],top.map(x=>[esc(x.n),x.q,rs(x.r)])):'<p class="text-sm text-ink/50">Top sellers will show here.</p>')+`</div>`
  +(low.length?`<div class="mt-4">`+bx('Low stock ('+low.length+')',`<div class="flex flex-wrap gap-2">${low.map(i=>`<span class="text-sm bg-red-50 text-red-700 rounded-full px-3 py-1">${esc(i.n)}: ${i.stock} left</span>`).join('')}</div>`)+`</div>`:'')},
 pos(){const b=B(),c=CF(),T=tot(),q=(S.q||'').toLowerCase();
  const last=S.last?`<div class="mb-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm p-3">Sale #${S.last.no} recorded · ${rs(S.last.total)} · <button data-act="rcptShow" data-a="${S.last.id}" class="font-semibold underline">Print receipt</button> ${S.last.cust&&S.last.cust.ph?`· <a class="font-semibold underline" target="_blank" rel="noopener" href="https://wa.me/${wa(S.last.cust.ph)}?text=${encodeURIComponent(receipt(S.last))}">Send receipt on WhatsApp</a>`:''}</div>`:'';
  const grid=b.items.map(i=>{const out=i.stock===0,ic=S.cart.find(l=>l.id===i.id),nm=(i.n+' '+i.cat+' '+(i.code||'')+' '+(i.dc||'')).toLowerCase();return `<button data-act="add" data-a="${i.id}" data-nm="${esc(nm)}" ${out?'disabled':''} class="card relative bg-white rounded-2xl border border-black/5 p-4 text-left min-h-[84px] ${ic?'ring-2 ring-kate':''} ${out?'opacity-40':''} ${nm.includes(q)?'':'hidden'}">${ic?`<span class="absolute top-2 right-2 bg-kate text-white text-xs font-bold rounded-full px-2 py-0.5">${ic.q}</span>`:''}<p class="font-semibold text-sm">${esc(i.n)}</p><p class="text-xs text-ink/50">${esc(i.cat)}${i.stock!=null?' · '+i.stock+' left':''}</p><p class="text-kate font-bold mt-2">${rs(i.p)}</p></button>`}).join('');
  const exf=c.ex.map(([k,l,t,o])=>`<label class="block text-xs font-semibold text-ink/60">${l}${t==='sel'?`<select data-c="${k}" class="${IN} font-normal">${o.map(x=>`<option ${S.c[k]===x?'selected':''}>${x}</option>`).join('')}</select>`:`<input data-c="${k}" ${t==='num'?'data-re type="number" min="0"':t==='time'?'type="time"':'type="text"'} value="${esc(S.c[k]||'')}" class="${IN} font-normal">`}</label>`).join('');
  const cart=S.cart.length?S.cart.map(l=>`<div class="flex items-center justify-between text-sm py-1 gap-2"><span class="flex-1">${esc(l.n)}</span><span class="flex items-center gap-1"><button data-act="qty" data-a="${l.id}:-1" class="w-6 h-6 rounded-full bg-mist" aria-label="Less">−</button>${l.q}<button data-act="qty" data-a="${l.id}:1" class="w-6 h-6 rounded-full bg-mist" aria-label="More">+</button></span><span class="w-20 text-right">${rs(l.p*l.q)}</span></div>`).join(''):'<p class="text-sm text-ink/50">Tap an item to add it.</p>';
  return h2(c.i+' '+c.n+' POS')+last+`<div class="grid xl:grid-cols-[1fr_340px] gap-4 mpad"><div><div class="flex gap-2 mb-3"><input id="scanIn" placeholder="Scan or type barcode, then Enter" aria-label="Scan barcode" autocomplete="off" class="${IN}">${bt('rCam','📷 Scan','','border border-black/15 bg-white')}</div><div class="flex gap-2 mb-3"><input id="pq" value="${esc(S.q||'')}" placeholder="Search ${c.w.toLowerCase()} or say a design code…" aria-label="Search items" class="${IN}">${bt('rVoice','🎤','','border border-black/15 bg-white !px-4')}</div><div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${grid||'<p class="text-sm text-ink/50">No items yet. Add some in Items.</p>'}</div></div>`
  +'<div class="mhide">'+bx('Current bill',`<div class="space-y-2 mb-3">${exf}</div>${cart}<div class="mt-3 pt-3 border-t border-black/10 space-y-2"><div class="grid grid-cols-2 gap-2"><input data-c="cn" value="${esc(S.c.cn||'')}" placeholder="Customer name" aria-label="Customer name" class="${IN}"><input data-c="cp" value="${esc(S.c.cp||'')}" placeholder="Mobile" aria-label="Customer mobile" class="${IN}"></div><div class="grid grid-cols-2 gap-2"><input data-c="coupon" data-re value="${esc(S.c.coupon||'')}" placeholder="Coupon code" aria-label="Coupon" class="${IN}"><select data-c="pay" data-re class="${IN}">${['Cash','UPI','Card'].map(x=>`<option ${S.c.pay===x?'selected':''}>${x}</option>`).join('')}</select></div></div>
  <div class="mt-3 text-sm space-y-1"><div class="flex justify-between"><span>Subtotal</span><span>${rs(T.sub)}</span></div>${T.disc?`<div class="flex justify-between text-green-700"><span>Coupon ${esc(T.cp.code)}</span><span>−${rs(T.disc)}</span></div>`:''}${T.exch?`<div class="flex justify-between text-green-700"><span>Old battery exchange</span><span>−${rs(T.exch)}</span></div>`:''}<div class="flex justify-between font-extrabold text-lg pt-1"><span>Total</span><span>${rs(T.total)}</span></div>${gstBox(T.total)}</div>${S.c.pay==='UPI'?upiPanel(b.upi,b.name,T.total,'Bill '+((b.seq||0)+1)):''}<div class="mt-3 flex gap-2">${bt('pay','Take Payment','','bg-kate text-white hover:bg-ink flex-1')}${bt('clear','Clear','','border border-black/15')}</div>`)+`</div></div>`},
 items(){const b=B(),c=CF(),miss=b.items.filter(i=>!i.code).length,D=c.ins?insData():null,deadIds=new Set(D?D.dead.map(r=>r.it.id):[]);return h2(c.w)+bx('Add new',`<div class="grid sm:grid-cols-6 gap-2">${fi('iN','Name')}${fi('iC','Category')}${fi('iP','Price ₹','number')}${fi('iS','Stock (blank = not tracked)','number')}${fi('iB','Barcode (blank = create)')}${bt('itemAdd','Add')}</div>`)+`<div class="mt-3 flex flex-wrap gap-2">${bt('rGenAll','Create missing barcodes'+(miss?' ('+miss+')':''),'','border border-black/15 bg-white')}${bt('rLblAll','Print all labels','','border border-black/15 bg-white')}</div><div class="mt-4">`+tb(c.ins?['Name','Category','Price ₹','Stock','Stock age','Barcode','']:['Name','Category','Price ₹','Stock','Barcode',''],b.items.map(i=>[esc(i.n),esc(i.cat),`<input data-edit="p" data-id="${i.id}" type="number" value="${i.p}" aria-label="Price" class="${IN} w-24">`,`<input data-edit="s" data-id="${i.id}" type="number" value="${i.stock==null?'':i.stock}" placeholder="—" aria-label="Stock" class="${IN} w-24">`,...(c.ins?[insAgeCell(i,deadIds)]:[]),`<div class="min-w-[190px]"><input data-edit="c" data-id="${i.id}" value="${esc(i.code||'')}" placeholder="No barcode" aria-label="Barcode" class="${IN} mb-1 font-mono">${bcSvg(i.code||'',34)||(i.code?'<span class="text-xs text-ink/50">Drawing needs a valid EAN-13 / UPC-A code</span>':'')}<div class="flex flex-wrap gap-1 mt-1">${bt('rGen',i.code?'New code':'Create',i.id,'border border-black/15 !px-3 !py-1')}${bt('rScan','📷 Scan',i.id,'border border-black/15 !px-3 !py-1')}${bcSvg(i.code||'')?bt('rLbl','Label',i.id,'border border-black/15 !px-3 !py-1'):''}</div></div>`,bt('itemDel','Delete',i.id,'text-red-600 border border-red-200')]),'No items yet.')+`</div>`},
 sales(){const b=B(),cr=['owner','supervisor'].includes(U.role);return h2('Sales')+tb(['#','When','Items','Customer','Payment','Total','Status',''],b.sales.slice(0,100).map(s=>[s.no,fT(s.t),esc(s.items.map(i=>i.n+' ×'+i.q).join(', '))+(Object.keys(s.ex||{}).length?`<br><span class="text-xs text-ink/50">${esc(Object.values(s.ex).join(' · '))}</span>`:''),esc(s.cust?s.cust.n:'—'),s.pay,rs(s.total),s.st==='paid'?'Paid':'<span class="text-red-600">Refunded</span>',(s.st==='paid'?bt('rcptShow','Receipt',s.id,'border border-black/15')+' ':'')+(cr&&s.st==='paid'?bt('refund','Refund',s.id,'border border-black/15'):'')]),'No sales recorded yet.')},
 customers(){const b=B();return h2('Customers')+bx('Add customer',`<div class="grid sm:grid-cols-4 gap-2">${fi('uN','Name')}${fi('uP','Mobile')}${fi('uD','Birthday','date')}${bt('custAdd','Add')}</div>`)+`<div class="mt-4">`+tb(['Name','Mobile','Visits','Spent','Points','Last visit'],[...b.customers].sort((a,c)=>c.last-a.last).map(c=>[esc(c.name),esc(c.phone||'—'),c.visits,rs(c.spent),c.points,c.last?fD(c.last):'—']),'Customers are added automatically when you enter a name or mobile at billing.')+`</div>`},
 expenses(){const b=B(),m0=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();return h2('Expenses')+kp([['This month',rs(b.expenses.filter(e=>e.t>=m0).reduce((a,e)=>a+e.amt,0))],['All time',rs(b.expenses.reduce((a,e)=>a+e.amt,0))]])+`<div class="mt-4">`+bx('Add expense',`<div class="grid sm:grid-cols-4 gap-2">${sel('eC',['Rent','Salaries','Supplies','Utilities','Marketing','Purchases','Other'])}${fi('eA','Amount ₹','number')}${fi('eN','Note')}${bt('expAdd','Add')}</div>`)+`</div><div class="mt-4">`+tb(['Date','Category','Note','Amount',''],b.expenses.slice(0,100).map(e=>[fD(e.t),esc(e.cat),esc(e.note),rs(e.amt),bt('expDel','Delete',e.id,'text-red-600 border border-red-200')]),'No expenses yet.')+`</div>`},
 marketing(){const b=B(),sg=segs(),seg=S.c.seg||'all',ch=S.c.ch||'WhatsApp',tp=CF().mk||MKD,msg=S.c.msg!==undefined?S.c.msg:tp[0];
  const camp=S.camp?`<div class="mt-4">`+bx('Ready to send: '+esc(SEGL[S.camp.seg])+' · '+S.camp.ch,tb(['Customer','Mobile','Message'],S.camp.list.map(r=>[esc(r.n),esc(r.ph),`<a target="_blank" rel="noopener" class="text-kate font-semibold" href="${S.camp.ch==='WhatsApp'?'https://wa.me/'+wa(r.ph)+'?text=':'sms:'+esc(r.ph)+'?body='}${encodeURIComponent(r.m)}">Send ${S.camp.ch} →</a>`])))+`</div>`:'';
  return h2('Marketing')+kp(Object.keys(SEGL).map(k=>[SEGL[k],sg[k].length]))+`<div class="mt-4 grid xl:grid-cols-2 gap-4">`+bx('Create a campaign',`<div class="grid grid-cols-2 gap-2 mb-2">${sel('mSeg',Object.keys(SEGL).map(k=>[k,SEGL[k]]),seg,'data-c="seg" data-re')}${sel('mCh',['WhatsApp','SMS'],ch,'data-c="ch" data-re')}</div><textarea data-c="msg" rows="4" aria-label="Message" class="${IN}">${esc(msg)}</textarea><p class="text-xs text-ink/50 mt-1">Use {name} and {biz}. Templates:</p><div class="flex flex-wrap gap-2 my-2">${tp.map((t,i)=>bt('tpl','Template '+(i+1),i,'border border-black/15')).join('')}</div>${bt('prep','Prepare campaign')}`)
  +bx('Coupons',`<div class="grid grid-cols-3 gap-2 mb-3">${fi('cC','Code e.g. WELCOME10')}${fi('cP','Discount %','number')}${bt('cpAdd','Create')}</div>`+tb(['Code','Off','Status',''],b.coupons.map(c=>[esc(c.code),c.pct+'%',c.on?'Active':'Off',bt('cpTog',c.on?'Turn off':'Turn on',c.id,'border border-black/15')+' '+bt('cpDel','Delete',c.id,'text-red-600 border border-red-200')]),'No coupons yet. Customers can use them at POS.'))+`</div>`+camp
  +`<div class="mt-4">`+bx('Past campaigns',tb(['When','Segment','Channel','Recipients'],b.campaigns.slice(0,20).map(c=>[fT(c.t),esc(SEGL[c.seg]),c.ch,c.n]),'No campaigns yet.'))+`</div>`},
 reports(){const b=B(),r=S.c.rng||'7',lim=r==='all'?0:d0(Date.now())-(+r-1)*864e5,ps=paid().filter(s=>s.t>=lim),ex=b.expenses.filter(e=>e.t>=lim).reduce((a,e)=>a+e.amt,0),t=sumT(ps),by={};ps.forEach(s=>by[s.pay]=(by[s.pay]||0)+s.total);
  return h2('Reports')+`<div class="max-w-xs mb-4">${sel('rRng',[['1','Today'],['7','Last 7 days'],['30','Last 30 days'],['all','All time']],r,'data-c="rng" data-re')}</div>`+kp([['Sales',rs(t)],['Orders',ps.length],['Average bill',rs(ps.length?t/ps.length:0)],['Profit (sales − expenses)',rs(t-ex)]])+`<div class="mt-4 grid xl:grid-cols-2 gap-4"><div><p class="font-bold mb-2">By payment mode</p>${tb(['Mode','Amount'],Object.entries(by).map(([k,v])=>[k,rs(v)]),'No sales in this period.')}</div><div><p class="font-bold mb-2">Top items</p>${tb(['Item','Qty','Sales'],topItems(ps).slice(0,10).map(x=>[esc(x.n),x.q,rs(x.r)]),'No sales in this period.')}</div></div>`},
 staff(){const l=DB.acc.filter(a=>a.biz===U.biz);return h2('Staff & logins')+bx('Add a staff login',`<div class="grid sm:grid-cols-5 gap-2">${fi('tN','Name')}${fi('tI','Login (email / mobile / username)')}${fi('tP','Password (8+, letters & numbers)','password')}${sel('tR',CF().ph?[['manager','Manager'],['pharmacist','Pharmacist'],['cashier','Cashier'],['inventory','Inventory staff'],['accountant','Accountant']]:[['pos','POS'],['supervisor','Supervisor'],['accounts','Accounts']])}${bt('staffAdd','Add')}</div>`)+staffTools(l)+`<div class="mt-4">`+tb(['Name','Login','Role',''],l.map(a=>[esc(a.name),esc(a.id),ROLE_L[a.role],a.role==='owner'?'':bt('staffDel','Remove',a.uid,'text-red-600 border border-red-200')]))+`</div>`},
 settings(){const b=B();return h2('Settings')+bx('Business',`<div class="grid sm:grid-cols-3 gap-3">${fv('sN','Business name',b.name)}${fv('sL','Low-stock alert at (units)',b.low,'number')}${b.type==='salon'?fv('sC','Staff commission %',b.comm,'number'):''}${fv('sU','UPI ID for payment QR (e.g. shop@okhdfcbank)',b.upi||'')}${fv('sG','GST % included in prices (0 = off)',gstRate(),'number')}${fv('sT','GSTIN (printed on receipts, optional)',b.gstin||'')}${fv('sA','Address / phone line on receipts',b.addr||'')}<label class="text-xs font-semibold text-ink/60">Receipt paper${sel('sP',[['80','80 mm (3 inch)'],['58','58 mm (2 inch)']],b.paper||'80')}</label></div><div class="mt-3">${bt('setSave','Save')}</div>`)+securityBox()+`<div class="mt-4">`+bx('Danger zone',`<p class="text-sm text-ink/60 mb-3">Delete all sales, customers, expenses and campaigns for this business. Items stay.</p>${bt('reset',S.rc?'Click again to confirm':'Delete business data','','text-red-600 border border-red-200')}`)+`</div>`},
 kitchen(){const q=B().sales.filter(s=>s.st==='paid'&&s.k&&s.k!=='Served').reverse(),nx={New:'Preparing',Preparing:'Ready',Ready:'Served'};return h2('Kitchen orders')+(q.length?`<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">${q.map(s=>bx('#'+s.no+' · '+esc((s.ex.otype||'')+(s.ex.table?' · Table '+s.ex.table:'')),`<ul class="text-sm mb-3">${s.items.map(i=>`<li>${i.q} × ${esc(i.n)}</li>`).join('')}</ul><div class="flex justify-between items-center"><span class="text-xs bg-mist rounded-full px-2 py-1">${s.k}</span>${bt('kstep','Mark '+nx[s.k],s.id)}</div>`)).join('')}</div>`:tb([],[],'No pending kitchen orders.'))},
 wastage(){const b=B(),tr=b.items.filter(i=>i.stock!=null);return h2('Wastage')+bx('Log wastage',`<div class="grid sm:grid-cols-4 gap-2">${sel('wI',tr.map(i=>[i.id,i.n]))}${fi('wQ','Quantity','number')}${sel('wR',['Spoiled','Expired','Dropped','Other'])}${bt('wasteAdd','Log')}</div>`)+`<div class="mt-4">`+tb(['When','Item','Qty','Reason','Value'],b.waste.slice(0,100).map(w=>[fT(w.t),esc(w.n),w.q,w.r,rs(w.v)]),'No wastage logged.')+`</div>`},
 purchases(){const b=B(),tr=b.items.filter(i=>i.stock!=null);return h2('Stock in / purchases')+bx('Receive stock',`<div class="grid sm:grid-cols-5 gap-2">${sel('pI',tr.map(i=>[i.id,i.n]))}${fi('pQ','Quantity','number')}${fi('pS','Supplier')}${fi('pC','Total cost ₹','number')}${bt('purAdd','Add stock')}${billPickHtml()}</div>`)+billMiss(b.purch)+`<div class="mt-4">`+tb(['When','Item','Qty','Supplier','Cost','Bill'],b.purch.slice(0,100).map(p=>[fT(p.t),esc(p.n),p.q,esc(p.s),rs(p.c),billCell(p)]),'No purchases yet.')+`</div>`},
 insights(){const b=B(),D=insData(),items=b.items.filter(i=>i.stock!=null),pct=+S.c.ipct||20,iso=t=>new Date(t-new Date(t).getTimezoneOffset()*6e4).toISOString().slice(0,10);
  const k=kp([['Total inventory value (at cost)',rs(D.inv)],['Stuck capital in dead stock',rs(D.stuck)],['Top selling category this week',D.week[0]?esc(D.week[0][0])+' · '+D.week[0][1]+' sold':'No sales yet'],['Dead stock lots',D.dead.length+' (over '+DEAD_DAYS+' days)']]);
  const dead=D.dead.length?tb(['Item','Received','Days on shelf','Left','Locked money',''],D.dead.map(r=>[esc(r.it.n)+(r.it.dc?` <span class="text-xs text-ink/50">${esc(r.it.dc)}</span>`:''),fD(r.x.t),r.age+' days',r.x.l,`<b class="text-red-600">${rs(r.locked)}</b>`,bt('insAlert','Create Discount Alert',r.it.id,'border border-kate text-kate !px-3 !py-1')+(r.it.alert?` <span class="text-xs text-ink/50">sent ${fD(r.it.alert.t)}</span>`:'')])):`<div class="bg-white rounded-2xl border border-black/5 p-6 text-center text-sm text-ink/50">No dead stock. Nothing has sat unsold for over ${DEAD_DAYS} days.</div>`;
  const lots=[];items.forEach(it=>it.bt.forEach(x=>lots.push([esc(it.n),`<input data-dc="${it.id}" value="${esc(it.dc||'')}" placeholder="Design code" aria-label="Design code" class="${IN} w-28">`,`<input type="date" data-bd="${it.id}:${x.id}" value="${iso(x.t)}" max="${iso(Date.now())}" aria-label="Purchase date" class="${IN} w-36">`,Math.floor((Date.now()-x.t)/DAY)+' d',x.l,`<input type="number" min="0" data-bc="${it.id}:${x.id}" value="${x.c||it.cost||''}" placeholder="0" aria-label="Cost per piece" class="${IN} w-24">`])));
  return h2('Stock Insights')+`<p class="text-sm text-ink/60 -mt-2 mb-4">Dead stock = a lot older than ${DEAD_DAYS} days whose item has not sold in ${DEAD_DAYS} days. Locked money = pieces left × purchase price.</p>`+k
  +(D.nocost?`<p class="mt-2 text-xs text-orange-700">${D.nocost} item(s) have no purchase price, so values are understated. Add the cost in the lots table below.</p>`:'')
  +`<div class="mt-4"><div class="flex items-center justify-between mb-2"><p class="font-bold">Dead stock warning</p><label class="text-xs font-semibold text-ink/60 flex items-center gap-2">Offer ${sel('ipct',[10,20,30].map(x=>[x,x+'% off']),pct,'data-c="ipct" data-re')}</label></div>${dead}<p class="text-[11px] text-ink/40 mt-1">The alert opens WhatsApp with a ready offer message to send to your customers. It does not change the price in the POS.</p></div>`
  +`<div class="mt-4 grid xl:grid-cols-2 gap-4"><div><p class="font-bold mb-2">Fast-moving categories (last 14 days)</p>${tb(['Category','Pieces sold'],D.fort.map(x=>[esc(x[0]),x[1]]),'No sales in the last 14 days.')}</div><div><p class="font-bold mb-2">Where your money sits (by stock age)</p>${tb(['Age','Value at cost'],D.ages.map(x=>[x[0],rs(x[1])]))}</div></div>`
  +`<div class="mt-4">`+bx('Receive new stock (with purchase date)',`<div class="grid sm:grid-cols-5 gap-2">${sel('iI',items.map(i=>[i.id,i.n]))}${fi('iQ','Pieces','number')}<input id="iD" type="date" value="${iso(Date.now())}" max="${iso(Date.now())}" aria-label="Purchase date" class="${IN}">${fi('iC','Cost per piece ₹','number')}${bt('insRecv','Add stock')}${billPickHtml()}</div>`)+`</div>`
  +`<div class="mt-4"><p class="font-bold mb-2">Stock lots (edit date, design code or cost if needed)</p>${tb(['Item','Design code','Purchase date','Age','Left','Cost ₹ / piece'],lots,'No stock lots yet.')}</div>`},
 commission(){const b=B(),m={};paid().forEach(s=>{const k=((s.ex&&s.ex.stylist)||'Unassigned').trim()||'Unassigned',x=m[k]||(m[k]={n:k,c:0,r:0});x.c++;x.r+=s.total});return h2('Staff commissions')+`<p class="text-sm text-ink/60 mb-3">Rate: ${b.comm}% (change in Settings)</p>`+tb(['Stylist','Bills','Revenue','Commission'],Object.values(m).map(x=>[esc(x.n),x.c,rs(x.r),rs(x.r*b.comm/100)]),'No sales with a stylist name yet.')},
 warranty(){const q=(S.c.wq||'').toLowerCase(),now=Date.now();const rows=paid().filter(s=>s.ex&&s.ex.serial).filter(s=>!q||(s.ex.serial+' '+(s.cust?s.cust.n+s.cust.ph:'')).toLowerCase().includes(q)).map(s=>{const m=+s.ex.warr||0,e=new Date(s.t);e.setMonth(e.getMonth()+m);return[esc(s.ex.serial),esc(s.items.map(i=>i.n).join(', ')),esc(s.cust?s.cust.n+' '+s.cust.ph:'—'),fD(s.t),m+' mo · '+fD(e),e.getTime()>now?'<span class="text-green-700">In warranty</span>':'<span class="text-red-600">Expired</span>']});return h2('Warranty lookup')+`<input data-c="wq" data-re value="${esc(S.c.wq||'')}" placeholder="Search serial no. or customer, then press Enter" aria-label="Search warranty" class="${IN} max-w-md mb-4">`+tb(['Serial','Battery','Customer','Sold on','Warranty till','Status'],rows,'No batteries with a serial number sold yet. Enter the serial at POS.')}
};

/* actions */
const nx={New:'Preparing',Preparing:'Ready',Ready:'Served'};
const ACT={
 go(a){S.mod=a;S.rcShow='';render();window.scrollTo(0,0)},
 add(id){const it=B().items.find(i=>i.id===id);if(!it)return;const l=S.cart.find(x=>x.id===id);if(it.stock!=null&&(l?l.q:0)>=it.stock){flash('Only '+it.stock+' in stock');return render()}l?l.q++:S.cart.push({id,n:it.n,p:it.p,q:1});render()},
 qty(a){const[id,d]=a.split(':'),l=S.cart.find(x=>x.id===id),it=B().items.find(i=>i.id===id);if(!l)return;if(+d>0&&it&&it.stock!=null&&l.q>=it.stock){flash('Only '+it.stock+' in stock');return render()}l.q+=+d;if(l.q<=0)S.cart=S.cart.filter(x=>x!==l);render()},
 clear(){S.cart=[];S.c={};render()},
 pay(){const b=B(),T=tot();if(!S.cart.length){flash('Add items to the bill first.');return render()}
  if(S.c.pay==='UPI'&&UPI_RE.test(b.upi||'')&&S.c.upiokA!==f2(T.total)){flash('Tick "Payment received on my phone" once the UPI money shows on your phone.');return render()}
  S.cart.forEach(l=>{const it=b.items.find(i=>i.id===l.id);if(it&&it.stock!=null)it.stock=Math.max(0,it.stock-l.q)});
  if(CF().ins)S.cart.forEach(l=>{const it=b.items.find(i=>i.id===l.id);if(it)insFit(it)});
  const ex={};CF().ex.forEach(([k,l,t,o])=>{const v=(S.c[k]!==undefined&&S.c[k]!=='')?S.c[k]:(t==='sel'?o[0]:'');if(v!=='')ex[k]=v});
  const cu=custUpsert(S.c.cn,S.c.cp,T.total);
  const sale={id:uid(),no:++b.seq,t:Date.now(),items:S.cart.map(l=>({id:l.id,n:l.n,q:l.q,p:l.p})),sub:T.sub,disc:T.disc,exch:T.exch,total:T.total,gst:gstOf(T.total),pay:S.c.pay||'Cash',cust:cu?{n:cu.name,ph:cu.phone}:null,ex,st:'paid',k:b.type==='restaurant'?'New':'',by:U.name};
  b.sales.unshift(sale);save();S.last=sale;S.cart=[];S.c={};render()},
 itemAdd(){const n=val('iN').trim(),p=+val('iP');if(!n||!(p>=0)||val('iP')===''){flash('Enter a name and price.');return render()}const st=val('iS'),b=B(),it={id:uid(),n,cat:val('iC').trim()||'General',p,stock:st===''?null:Math.max(0,+st),code:''},bc=val('iB').trim();if(bc){if(!setCode(it,bc))return render()}else it.code=genEan(b,b.items);b.items.push(it);save();flash('Item added with barcode '+it.code+'.');render()},
 itemDel(id){B().items=B().items.filter(i=>i.id!==id);save();render()},
 edit(t){const it=B().items.find(i=>i.id===t.dataset.id);if(!it)return;const k=t.dataset.edit;if(k==='p')it.p=Math.max(0,+t.value||0);else if(k==='s')it.stock=t.value===''?null:Math.max(0,+t.value||0);else if(k==='c'){if(!setCode(it,t.value)){render();return}flash('Barcode updated.')}save();if(k==='c')render()},
 refund(id){const b=B(),s=b.sales.find(x=>x.id===id);if(!s||s.st!=='paid')return;s.st='refunded';s.items.forEach(l=>{const it=b.items.find(i=>i.n===l.n);if(it&&it.stock!=null){it.stock+=l.q;if(CF().ins)insFit(it)}});if(s.cust){const c=b.customers.find(x=>(s.cust.ph&&x.phone===s.cust.ph)||x.name===s.cust.n);if(c){c.spent=Math.max(0,c.spent-s.total);c.visits=Math.max(0,c.visits-1);c.points=Math.max(0,c.points-Math.floor(s.total/100))}}save();flash('Sale #'+s.no+' refunded and stock restored.');render()},
 custAdd(){const n=val('uN').trim(),p=val('uP').replace(/\D/g,'');if(!n){flash('Enter a name.');return render()}if(p&&B().customers.some(c=>c.phone===p)){flash('That mobile number already exists.');return render()}B().customers.push({id:uid(),name:n,phone:p,dob:val('uD'),visits:0,spent:0,points:0,last:0});save();render()},
 expAdd(){const a=+val('eA');if(!(a>0)){flash('Enter an amount.');return render()}B().expenses.unshift({id:uid(),t:Date.now(),cat:val('eC'),amt:a,note:val('eN').trim()});save();render()},
 expDel(id){B().expenses=B().expenses.filter(e=>e.id!==id);save();render()},
 cpAdd(){const c=val('cC').trim().toUpperCase().replace(/\s/g,''),p=+val('cP');if(!c||!(p>0&&p<=100)){flash('Enter a code and a discount between 1 and 100.');return render()}if(B().coupons.some(x=>x.code===c)){flash('Code already exists.');return render()}B().coupons.push({id:uid(),code:c,pct:p,on:true});save();render()},
 cpTog(id){const c=B().coupons.find(x=>x.id===id);c.on=!c.on;save();render()},
 cpDel(id){B().coupons=B().coupons.filter(x=>x.id!==id);save();render()},
 tpl(i){S.c.msg=(CF().mk||MKD)[+i];render()},
 prep(){const b=B(),seg=S.c.seg||'all',ch=S.c.ch||'WhatsApp',msg=S.c.msg!==undefined?S.c.msg:(CF().mk||MKD)[0],list=segs()[seg].filter(c=>c.phone);
  if(!list.length){flash('No customers with mobile numbers in this segment yet. They are added when you enter a mobile at billing.');S.camp=null;return render()}
  S.camp={seg,ch,list:list.map(c=>({n:c.name,ph:c.phone,m:msg.replace(/\{name\}/g,c.name).replace(/\{biz\}/g,b.name)}))};b.campaigns.unshift({id:uid(),t:Date.now(),seg,ch,n:list.length});save();render()},
 kstep(id){const s=B().sales.find(x=>x.id===id);if(s&&nx[s.k])s.k=nx[s.k];save();render()},
 wasteAdd(){const b=B(),it=b.items.find(i=>i.id===val('wI')),q=+val('wQ');if(!it||!(q>0)){flash('Choose an item and quantity.');return render()}it.stock=Math.max(0,it.stock-q);b.waste.unshift({id:uid(),t:Date.now(),n:it.n,q,r:val('wR'),v:q*it.p});save();render()},
 purAdd(){const b=B(),it=b.items.find(i=>i.id===val('pI')),q=+val('pQ'),c=+val('pC')||0;if(!it||!(q>0)){flash('Choose an item and quantity.');return render()}if(CF().ins)insFit(it);it.stock+=q;if(CF().ins&&it.bt)it.bt.push({id:uid(),t:Date.now(),q,l:q,c:c>0?c/q:(it.cost||0)});const pr={id:uid(),t:Date.now(),n:it.n,q,s:val('pS').trim()||'—',c};b.purch.unshift(pr);billAttach(pr);if(c>0)b.expenses.unshift({id:uid(),t:Date.now(),cat:'Purchases',amt:c,note:it.n+' ×'+q+' from '+(val('pS').trim()||'supplier')});save();flash('Stock updated.');render()},
 rVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){flash('Voice search is not supported in this browser. Try Chrome.');return render()}const r=new SR();r.lang='en-IN';r.interimResults=false;r.onresult=e=>{S.q=e.results[0][0].transcript.trim();render()};r.onerror=()=>{flash('Could not hear you. Try again.');render()};try{r.start()}catch(x){}},
 insRecv(){const b=B(),it=b.items.find(i=>i.id===val('iI')),q=Math.floor(+val('iQ')),c=Math.max(0,+val('iC')||0),t=val('iD')?new Date(val('iD')+'T12:00:00').getTime():Date.now();
  if(!it||it.stock==null||!(q>0)){flash('Choose an item and the number of pieces.');return render()}
  if(isNaN(t)||t>Date.now()+DAY){flash('Purchase date cannot be in the future.');return render()}
  insFit(it);it.stock+=q;it.bt.push({id:uid(),t:Math.min(t,Date.now()),q,l:q,c});if(c>0)it.cost=c;
  const pr={id:uid(),t:Date.now(),n:it.n,q,s:'—',c:c*q};b.purch.unshift(pr);billAttach(pr);if(c>0)b.expenses.unshift({id:uid(),t:Date.now(),cat:'Purchases',amt:c*q,note:it.n+' ×'+q});
  save();flash('Stock received, dated '+fD(t)+'.');render()},
 insAlert(id){const b=B(),it=b.items.find(i=>i.id===id);if(!it)return;const pct=+S.c.ipct||20,np=Math.round(it.p*(1-pct/100));
  const msg=`Special offer at ${b.name}: ${it.n}${it.dc?' ('+it.dc+')':''} now ${pct}% off, only ₹${np} (was ₹${it.p}). Limited pieces. Visit us today!`;
  it.alert={t:Date.now(),pct};save();window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');render()},
 async staffAdd(){const n=val('tN').trim(),id=normId(val('tI')),pw=val('tP');if(!n||!id||!pwOk(pw)){flash('Enter name, login and a password with 8+ characters, letters and numbers.');return render()}if(DB.acc.some(a=>a.id===id)){flash('That login is already used.');return render()}const salt=uid();DB.acc.push({uid:uid(),id,name:n,salt,ph:await hp(pw,salt),biz:U.biz,role:val('tR')});save();flash('Staff login created. Share the login and password with them.');render()},
 staffDel(id){DB.acc=DB.acc.filter(a=>a.uid!==id||a.role==='owner');save();render()},
 async pwChange(){if(!await chk(U,val('cpC'))){flash('Current password is wrong.');return render()}const n=val('cpN');if(!pwOk(n)||n!==val('cpN2')){flash('New passwords must match and have 8+ characters with letters and numbers.');return render()}U.salt=uid();U.ph=await hp(n,U.salt);save();flash('Password changed.');render()},
 async rcNew(){if(!await chk(U,val('cpC'))){flash('Enter your current password first.');return render()}const code=rcGen();U.rs=uid();U.rh=await hp(code.replace(/-/g,''),U.rs);save();S.rcShow=code;render()},
 async staffPw(){const a=DB.acc.find(x=>x.uid===val('rS')&&x.biz===U.biz&&x.role!=='owner'),n=val('rP');if(!a||!pwOk(n)){flash('Choose a staff member and a password with 8+ characters, letters and numbers.');return render()}a.salt=uid();a.ph=await hp(n,a.salt);save();flash('Password reset for '+a.name+'.');render()},
 setSave(){const b=B();const u=val('sU').trim();if(u&&!UPI_RE.test(u)){flash('That UPI ID looks wrong. It should look like name@bank.');return render()}b.upi=u;if($('#sG'))b.gst=Math.min(28,Math.max(0,+val('sG')||0));if($('#sT')){const g=val('sT').trim().toUpperCase();if(g&&!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g)){flash('GSTIN should be 15 characters, like 29ABCDE1234F1Z5.');return render()}b.gstin=g;b.addr=val('sA').trim().slice(0,120);b.paper=val('sP')==='58'?'58':'80'}b.name=val('sN').trim()||b.name;b.low=Math.max(0,+val('sL')||0);if($('#sC'))b.comm=Math.min(100,Math.max(0,+val('sC')||0));save();flash('Saved.');render()},
 reset(){if(!S.rc){S.rc=true;return render()}const b=B();(b.purch||[]).forEach(p=>{if(p.img)billDel(p.img)});b.sales=[];b.customers=[];b.expenses=[];b.campaigns=[];b.waste=[];b.purch=[];b.seq=0;S.rc=false;S.last=null;save();flash('Business data deleted.');render()}
};

/* render + events */
const app=$('#app');
function render(){const m=mods();if(!m.includes(S.mod))S.mod=m[0];const c=CF(),fl=S.flash;S.flash='';
 $('#appBiz').textContent=c.i+' '+B().name;$('#who').textContent=U.name+' · '+ROLE_L[U.role];
 h($('#side'),m.map(k=>`<button data-act="go" data-a="${k}" class="whitespace-nowrap text-left px-3 py-2 rounded-lg lg:w-full lg:block ${k===S.mod?'bg-kate/10 text-kate font-semibold':'text-ink/70 hover:bg-mist'}">${MODN[k][0]} ${k==='items'?c.w:MODN[k][1]}</button>`).join(''));
 h($('#main'),`<div class="fade">${fl?`<div role="status" class="mb-3 rounded-xl bg-ink text-white text-sm p-3">${esc(fl)}</div>`:''}${V[S.mod]()}</div>`);h($('#bar'),posBar(fl))}
app.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(t&&ACT[t.dataset.act])ACT[t.dataset.act](t.dataset.a,t)});
app.addEventListener('input',e=>{const t=e.target;if(t.dataset.c!==undefined)S.c[t.dataset.c]=t.value;if(t.id==='pq'){S.q=t.value;document.querySelectorAll('[data-nm]').forEach(b=>b.classList.toggle('hidden',!b.dataset.nm.includes(t.value.toLowerCase())))}});
app.addEventListener('change',e=>{const t=e.target;if(t.dataset.edit)ACT.edit(t);else if(t.dataset.re!==undefined){S.c[t.dataset.c]=t.value;render()}});
app.addEventListener('change',e=>{const t=e.target;if(!U||!(t.dataset.bd||t.dataset.bc||t.dataset.dc))return;const b=B();
 if(t.dataset.dc){const it=b.items.find(i=>i.id===t.dataset.dc);if(it){it.dc=t.value.trim().slice(0,30);save()}return}
 const[iid,bid]=(t.dataset.bd||t.dataset.bc).split(':'),it=b.items.find(i=>i.id===iid),x=it&&it.bt&&it.bt.find(y=>y.id===bid);
 if(x&&t.dataset.bd){const v=new Date(t.value+'T12:00:00').getTime();if(!isNaN(v)&&v<=Date.now()+DAY){x.t=Math.min(v,Date.now());save();flash('Purchase date updated.')}}
 else if(x){x.c=Math.max(0,+t.value||0);if(!(it.cost>0))it.cost=x.c;save();flash('Cost updated.')}
 render()});
function openApp(){S={mod:'',cart:[],c:{},q:'',flash:'',last:null,camp:null};app.classList.remove('hidden');document.body.style.overflow='hidden';render()}
function signOut(){camClose();U=null;try{localStorage.removeItem(SES)}catch(e){}app.classList.add('hidden');document.body.style.overflow=''}
$('#appClose').onclick=signOut;
$('#appHome').onclick=()=>{app.classList.add('hidden');document.body.style.overflow=''};

/* ===== barcode: EAN-13 drawing, scanning (keyboard scanner + camera), print overlay ===== */
const EL=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const ER=EL.map(x=>x.replace(/[01]/g,c=>c==='0'?'1':'0')),EG=ER.map(x=>[...x].reverse().join(''));
const EP=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
const eanCk=d=>{let s=0;for(let i=0;i<12;i++)s+=+d[i]*(i%2?3:1);return String((10-s%10)%10)};
const eanFix=code=>{let c=String(code||'').replace(/\D/g,'');if(c.length===12)c='0'+c;return c.length===13&&c[12]===eanCk(c)?c:''};
function genEan(o,list){let c;do{o.bseq=(o.bseq||0)+1;const d='2'+String(o.bseq).padStart(11,'0');c=d+eanCk(d)}while(list.some(x=>x.barcode===c||x.code===c));return c}
function bcSvg(code,H){const c=eanFix(code);if(!c)return'';H=H||60;let b='101';const pt=EP[+c[0]];for(let i=0;i<6;i++)b+=(pt[i]==='L'?EL:EG)[+c[i+1]];b+='01010';for(let i=7;i<13;i++)b+=ER[+c[i]];b+='101';
 const m=2,w=(b.length+18)*m;let r='';for(let i=0;i<b.length;){if(b[i]==='1'){let j=i;while(b[j]==='1')j++;const g=i<3||(i>=45&&i<50)||i>=92;r+=`<rect x="${(i+9)*m}" y="0" width="${(j-i)*m}" height="${g?H+8:H}"/>`;i=j}else i++}
 const tx=(x,t)=>`<text x="${x*m}" y="${H+22}" font-size="18" font-family="monospace" text-anchor="middle"${t.length>1?' letter-spacing="2.5"':''}>${t}</text>`;
 return `<svg class="bc" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H+28}" role="img" aria-label="Barcode ${c}"><rect width="${w}" height="${H+28}" fill="#fff"/><g fill="#000">${r}</g>${tx(5,c[0])}${tx(33,c.slice(1,7))}${tx(80,c.slice(7))}</svg>`}
const cn=c=>String(c||'').replace(/\D/g,'').replace(/^0+/,'');
const beep=()=>{try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator();o.connect(c.destination);o.frequency.value=880;o.start();setTimeout(()=>{o.stop();c.close()},90)}catch(e){}};
let camStop=null,camCb=null;
function camClose(){if(camStop)camStop();camStop=null;camCb=null;$('#camBox').classList.add('hidden')}
const loadH5=()=>new Promise((ok,no)=>{if(window.Html5Qrcode)return ok();const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
async function camStart(cb){camCb=cb;$('#camBox').classList.remove('hidden');h($('#camView'),'');$('#camMsg').textContent='Starting camera…';
 let last='',lt=0;const hit=c=>{if(c===last&&Date.now()-lt<1500)return;last=c;lt=Date.now();const m=camCb&&camCb(c);if(m)$('#camMsg').textContent=m};
 try{if('BarcodeDetector' in window){const det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']}),st=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}),v=document.createElement('video');v.srcObject=st;v.setAttribute('playsinline','');v.muted=true;v.className='w-full h-full object-cover';$('#camView').appendChild(v);await v.play();let on=true;camStop=()=>{on=false;st.getTracks().forEach(t=>t.stop())};$('#camMsg').textContent='Point the camera at a barcode.';(async function loop(){while(on){try{const r=await det.detect(v);if(r[0])hit(r[0].rawValue)}catch(e){}await new Promise(k=>setTimeout(k,200))}})()}
  else{await loadH5();const q=new Html5Qrcode('camView');await q.start({facingMode:'environment'},{fps:10,qrbox:{width:260,height:140}},hit);camStop=()=>{q.stop().then(()=>q.clear()).catch(()=>{})};$('#camMsg').textContent='Point the camera at a barcode.'}}
 catch(e){$('#camMsg').textContent='Camera not available. Allow camera access (needs https), or use a USB/Bluetooth scanner, or type the code.'}}
/* ===== Purchase bill photos: kept in this browser (IndexedDB), shrunk to about 300 KB, never uploaded anywhere ===== */
const billIdb=()=>new Promise((ok,no)=>{try{const r=indexedDB.open('kiro_bill_photos_v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('p');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}});
const billTx=async(mode,fn)=>{const d=await billIdb();return new Promise((ok,no)=>{const t=d.transaction('p',mode),r=fn(t.objectStore('p'));t.oncomplete=()=>{d.close();ok(r&&r.result)};t.onerror=t.onabort=()=>{d.close();no(t.error)}})};
const billPut=(k,b)=>billTx('readwrite',s=>s.put(b,k)),billGet=k=>billTx('readonly',s=>s.get(k)),billDel=k=>billTx('readwrite',s=>s.delete(k)).catch(()=>{});
function billShrink(file){return new Promise((ok,no)=>{if(!file||!/^image\//.test(file.type))return no(new Error('Choose a photo (JPEG or PNG).'));if(file.size>30e6)return no(new Error('That photo is too large (30 MB limit).'));
 const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);const s=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);c.toBlob(b=>b?ok(b):no(new Error('Could not read that photo.')),'image/jpeg',.75)};
 im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('Could not read that photo.'))};im.src=u})}
const billKey=()=>((U&&U.biz)||'b')+':'+uid();
const billRec=id=>(CF().ph?PH():B()).purch.find(p=>p.id===id);
const billPrevHtml=()=>S.billPend?`<span class="inline-flex items-center gap-2"><img src="${S.billPend.url}" alt="Bill photo preview" class="h-14 w-10 object-cover rounded border border-black/15"><button type="button" data-act="billClear" class="text-xs text-red-600 underline">Remove</button></span>`:'';
const billPickHtml=()=>`<div class="sm:col-span-full flex flex-wrap items-center gap-3"><label class="cursor-pointer text-sm font-semibold border border-black/15 rounded-full px-4 py-2 bg-white hover:border-ink focus-within:ring-2 ring-kate">📷 Photo of the supplier bill<input type="file" accept="image/*" capture="environment" data-billnew class="sr-only" aria-label="Photo of the supplier bill"></label><span id="billPrev">${billPrevHtml()}</span><span class="text-xs text-ink/50">Optional. Saved on this device only.</span></div>`;
const billCell=p=>p.img?`<button data-act="billView" data-a="${p.id}" class="text-sm font-semibold underline">📷 View</button>`:`<label class="cursor-pointer text-xs text-ink/60 underline">＋ Add photo<input type="file" accept="image/*" capture="environment" data-billadd="${p.id}" class="sr-only" aria-label="Add bill photo"></label>`;
const billMiss=l=>{const n=l.filter(p=>!p.img).length;return n?`<p class="text-xs text-orange-700 mt-3">${n} purchase${n>1?'s have':' has'} no bill photo yet. Add one so every bill is on record.</p>`:''};
function billAttach(rec){const p=S.billPend;if(!p)return;S.billPend=null;const k=billKey();rec.img=k;billPut(k,p.blob).then(()=>URL.revokeObjectURL(p.url),()=>{if(rec.img===k){rec.img=null;save()}flash('The bill photo could not be saved in this browser, but the purchase was recorded.');render()})}
async function billChange(e){const t=e.target;if(!t||!t.dataset||(t.dataset.billnew===undefined&&!t.dataset.billadd))return;const f=t.files&&t.files[0];t.value='';if(!f)return;
 try{const blob=await billShrink(f);
  if(t.dataset.billnew!==undefined){ACT.billClear();S.billPend={blob,url:URL.createObjectURL(blob)};const el=$('#billPrev');if(el)h(el,billPrevHtml())}
  else{const rec=billRec(t.dataset.billadd);if(!rec)return;const old=rec.img,k=billKey();await billPut(k,blob);rec.img=k;save();if(old)billDel(old);docClose();flash('Bill photo saved.');render()}}
 catch(err){const m=(err&&err.message)||'Could not save that photo in this browser.';if(t.dataset.billnew!==undefined){const el=$('#billPrev');if(el)h(el,`<span class="text-xs text-red-600">${esc(m)}</span>`)}else{flash(m);render()}}}
Object.assign(ACT,{
 billClear(){if(S.billPend){URL.revokeObjectURL(S.billPend.url);S.billPend=null}const e=$('#billPrev');if(e)h(e,'')},
 async billView(id){const rec=billRec(id);if(!rec||!rec.img)return;let blob=null;try{blob=await billGet(rec.img)}catch(e){}
  const ph=CF().ph,sp=ph?PH().sup.find(x=>x.id===rec.sup):null,title=ph?((sp?sp.name:'Supplier')+(rec.inv?' · '+rec.inv:'')):((rec.s&&rec.s!=='—'?rec.s:'Supplier bill')+' · '+rec.n),amt=ph?rp(rec.total):rs(rec.c);
  const head=`<div class="flex justify-between items-center gap-3"><div><p class="font-bold">${esc(title)}</p><p class="text-xs text-ink/60">${fT(rec.t)} · ${amt}</p></div><button data-docclose class="text-sm font-semibold border border-black/15 rounded-full px-4 py-2">✕ Close</button></div>`;
  if(!blob){showDoc(`<div class="max-w-3xl mx-auto p-4 np">${head}<p class="mt-4 text-sm">This photo is not on this device. It was saved in another browser, or this browser's data was cleared.</p><div class="mt-3"><label class="cursor-pointer text-sm font-semibold border border-black/15 rounded-full px-4 py-2 inline-block">Add the photo again<input type="file" accept="image/*" capture="environment" data-billadd="${id}" class="sr-only" aria-label="Add bill photo"></label></div></div>`);return}
  if(window.__billUrl)URL.revokeObjectURL(window.__billUrl);const url=window.__billUrl=URL.createObjectURL(blob);
  showDoc(`<div class="max-w-3xl mx-auto p-4 np">${head}<img src="${url}" alt="Photo of the supplier bill" class="mt-3 w-full rounded-xl border border-black/10"><div class="mt-3 flex flex-wrap gap-2"><label class="cursor-pointer text-sm font-semibold border border-black/15 rounded-full px-4 py-2">Replace photo<input type="file" accept="image/*" capture="environment" data-billadd="${id}" class="sr-only" aria-label="Replace bill photo"></label><button data-billrm="${id}" class="text-sm font-semibold text-red-600 border border-red-200 rounded-full px-4 py-2">Remove photo</button></div></div>`)}
});
function showDoc(html){h($('#docBox'),html);$('#docBox').classList.remove('hidden')}
function docClose(){$('#docBox').classList.add('hidden');if(window.__billUrl){URL.revokeObjectURL(window.__billUrl);window.__billUrl=null}}
const labelsHtml=(list,n)=>`<div class="np sticky top-0 bg-white border-b border-black/10 p-3 flex flex-wrap items-center gap-3"><b>Barcode labels</b><button data-print class="bg-ink text-white rounded-full px-4 py-2 text-sm font-semibold">Print</button><button data-docclose class="border border-black/15 rounded-full px-4 py-2 text-sm font-semibold">Close</button><span class="text-xs text-ink/50">In the print window choose A4 and turn off headers and footers.</span></div><div class="p-4 grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">${list.map(x=>`<div class="lbl"><div class="text-[10px]">${esc(x.biz)}</div><div class="font-semibold text-xs">${esc(x.name)}</div>${bcSvg(x.code,44)}<div class="text-xs font-bold">${x.price}</div></div>`).join('')}</div>`;
let kb='',kt=0;
const scanRoute=c=>S.mod==='phBill'?phScan(c):ACT.scan(c);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){camClose();docClose();return}
 if(app.classList.contains('hidden')||e.ctrlKey||e.metaKey||e.altKey||!['phBill','pos'].includes(S.mod))return;const t=e.target,g=t.tagName;if(g==='INPUT'||g==='TEXTAREA'||g==='SELECT')return;
 if(e.key==='Enter'){if(kb.length>=6){e.preventDefault();scanRoute(kb)}kb='';return}
 if(e.key.length===1){const n=Date.now();if(n-kt>120)kb='';kt=n;kb+=e.key}});
$('#camClose').onclick=camClose;
$('#docBox').addEventListener('click',e=>{if(e.target.closest('[data-docclose]'))docClose();if(e.target.closest('[data-print]'))window.print();const r=e.target.closest('[data-billrm]');if(r){if(r.dataset.sure!=='1'){r.dataset.sure='1';r.textContent='Click again to remove';return}const rec=billRec(r.dataset.billrm);if(rec&&rec.img){billDel(rec.img);rec.img=null;save()}docClose();flash('Bill photo removed.');render()}});
$('#docBox').addEventListener('change',billChange);app.addEventListener('change',billChange);
/* ===== KIRO PHARMACY: core, billing, invoices, returns ===== */
const newPh=()=>({meds:[],batches:[],moves:[],sales:[],returns:[],purch:[],sup:[],cust:[],audit:[],seq:0,bseq:0,warn:30,prefix:'INV',gstin:'',dl:'',addr:'',phone:'',rules:{H:true,H1:true,X:true}});
const PH=()=>B().ph;
const rp=p=>'₹'+((p||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const toP=v=>Math.round((+v||0)*100);
const t0=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};
const dd=e=>Math.round((new Date(e+'T00:00:00')-t0())/864e5);
const fx=e=>e.slice(5,7)+'/'+e.slice(0,4);
const ec=e=>{const d=dd(e);return d<0?'text-red-600 font-semibold':d<=30?'text-orange-600 font-semibold':d<=90?'text-yellow-700':'text-ink/70'};
const pExp=s=>{const m=/^\s*(\d{1,2})\s*[\/-]\s*(\d{2}|\d{4})\s*$/.exec(s||'');if(!m)return null;let y=+m[2];if(y<100)y+=2000;const mo=+m[1];if(mo<1||mo>12)return null;return y+'-'+String(mo).padStart(2,'0')+'-'+String(new Date(y,mo,0).getDate()).padStart(2,'0')};
const fy=()=>{const d=new Date(),y=d.getMonth()>=3?d.getFullYear():d.getFullYear()-1;return y+'-'+String(y+1).slice(2)};
const PERMS={owner:'*',manager:['bill','cancel','refund','editMed','stockAdj','purchase','supplier','customer','reports','cost','approve_rx','audit'],pharmacist:['bill','cancel','refund','editMed','customer','approve_rx'],cashier:['bill','customer'],inventory:['editMed','stockAdj','purchase','supplier','cost'],accountant:['reports','cost','supplier','audit','customer']};
const can=k=>{const p=PERMS[U.role];return p==='*'||!!(p&&p.includes(k))};
const needsRx=m=>!!(PH().rules[m.sched]||m.rxo);
const audit=(act,detail)=>{const a=PH().audit;a.unshift({t:Date.now(),by:U.name+' ('+ROLE_L[U.role]+')',act,detail});if(a.length>2000)a.length=2000};
function move(batchId,type,qty,ref,reason){const bt=PH().batches.find(x=>x.id===batchId);bt.qty+=qty;PH().moves.unshift({id:uid(),t:Date.now(),batch:batchId,med:bt.med,type,qty,ref:ref||'',reason:reason||'',by:U.name});if(PH().moves.length>5000)PH().moves.length=5000}
const avail=id=>PH().batches.filter(b=>b.med===id&&b.st==='active'&&dd(b.exp)>=0).reduce((a,b)=>a+b.qty,0);
const onhand=id=>PH().batches.filter(b=>b.med===id).reduce((a,b)=>a+b.qty,0);
const nearest=id=>PH().batches.filter(b=>b.med===id&&b.qty>0).map(b=>b.exp).sort()[0]||'';
const mg=l=>{const q=l.qty-(l.ret||0);return l.qty?Math.round(l.taxable*q/l.qty)-l.cost*q:0};
const liveSales=()=>PH().sales.filter(s=>s.st!=='cancelled');
function quarBatch(bt){const ph=PH();let q=ph.batches.find(x=>x.med===bt.med&&x.no===bt.no&&x.exp===bt.exp&&x.mrp===bt.mrp&&x.st==='quarantine');if(!q){q={...bt,id:uid(),qty:0,st:'quarantine',recv:Date.now()};ph.batches.push(q)}return q}
/* FEFO allocation: earliest expiry first; expired and quarantined batches never auto-selected */
function alloc(medId,qty,pick){let bs=PH().batches.filter(x=>x.med===medId&&x.st==='active'&&x.qty>0&&dd(x.exp)>=0).sort((a,b)=>a.exp<b.exp?-1:a.exp>b.exp?1:a.recv-b.recv);if(pick)bs=bs.filter(x=>x.id===pick);let rem=qty;const out=[];for(const x of bs){const k=Math.min(x.qty,rem);if(k>0){out.push({batch:x,qty:k});rem-=k}if(!rem)break}return{lines:out,short:rem}}
function cartCalc(){const ph=PH(),lines=[],warn=[],info=[];let sub=0;
 S.cart.forEach(l=>{const m=ph.meds.find(x=>x.id===l.med),a=alloc(l.med,l.qty,l.pick);if(a.short)warn.push(m.brand+': only '+(l.qty-a.short)+' available in date.');
  const mrps=new Set(a.lines.map(x=>x.batch.mrp));if(mrps.size>1)info.push(m.brand+': batches have different MRPs.');
  a.lines.forEach(x=>{const amt=x.qty*x.batch.mrp;sub+=amt;lines.push({med:m,bt:x.batch,qty:x.qty,mrp:x.batch.mrp,amt});if(dd(x.batch.exp)<=ph.warn)info.push(m.brand+': batch '+x.batch.no+' expires '+fx(x.batch.exp)+'.')})});
 const disc=Math.min(sub,toP(S.c.disc));let used=0;lines.forEach((L,i)=>{L.disc=i===lines.length-1?disc-used:Math.round(disc*L.amt/(sub||1));used+=L.disc});
 let tax=0,total=0;lines.forEach(L=>{L.net=L.amt-L.disc;L.taxable=Math.round(L.net/(1+L.med.gst/100));L.tax=L.net-L.taxable;L.cgst=Math.floor(L.tax/2);L.sgst=L.tax-L.cgst;tax+=L.tax;total+=L.net});
 const rnd=Math.round(total/100)*100-total;return{lines,warn,info,sub,disc,tax,total,rnd,pay:total+rnd,rx:S.cart.some(l=>needsRx(ph.meds.find(x=>x.id===l.med)))}}
function phAdd(id){const m=PH().meds.find(x=>x.id===id);if(!m)return;const l=S.cart.find(x=>x.med===id),q=(l?l.qty:0)+1;if(q>avail(id)){flash('Only '+avail(id)+' of '+m.brand+' in stock (non-expired).');return render()}l?l.qty=q:S.cart.push({med:id,qty:1,pick:''});S.c.bq='';render()}
function phScan(code){const k=cn(code),m=PH().meds.find(x=>x.barcode&&cn(x.barcode)===k&&x.st!=='off');if(!m){const t='No medicine with barcode '+code;flash(t);render();return t}beep();phAdd(m.id);return 'Added: '+m.brand}
const bRes=()=>{const q=(S.c.bq||'').toLowerCase().trim();if(!q)return '<p class="text-sm text-ink/50 p-3">Type a brand or salt name, or scan a barcode.</p>';
 const r=PH().meds.filter(m=>m.st!=='off'&&(m.brand+' '+m.generic+' '+(m.barcode||'')).toLowerCase().includes(q)).slice(0,8);
 return r.length?r.map(m=>{const a=avail(m.id),b=PH().batches.filter(x=>x.med===m.id&&x.st==='active'&&x.qty>0&&dd(x.exp)>=0).sort((x,y)=>x.exp<y.exp?-1:1)[0];return `<div class="flex items-center justify-between gap-3 p-3 border-t border-black/5 first:border-0"><div class="min-w-0"><p class="font-semibold text-sm">${esc(m.brand)} ${esc(m.strength)} ${needsRx(m)?'<span class="text-[10px] bg-red-100 text-red-700 rounded px-1.5 py-0.5">Rx</span>':''}</p><p class="text-xs text-ink/60 truncate">${esc(m.generic)} · ${esc(m.form)} ${esc(m.pack)} · ${a} in stock</p></div><div class="text-right whitespace-nowrap"><p class="font-bold text-sm">${b?rp(b.mrp):rp(m.mrp)}</p>${a>0?bt('phAdd','Add +',m.id,'bg-kate text-white'):'<span class="text-xs text-red-600">Out of stock</span>'}</div></div>`}).join(''):'<p class="text-sm text-ink/50 p-3">No medicine found.</p>'};
function invoiceHtml(s){const ph=PH(),b=B(),cu=ph.cust.find(x=>x.id===s.cust),cg=s.lines.reduce((a,l)=>a+l.cgst,0),sg=s.lines.reduce((a,l)=>a+l.sgst,0),tv=s.lines.reduce((a,l)=>a+l.taxable,0);
 const txt=`${b.name}\nInvoice ${s.no}\n${s.lines.map(l=>`${l.name} x${l.qty} = ${rp(l.net)}`).join('\n')}\nTotal: ${rp(s.pay)}\nThank you!`;
 const wb=cu&&cu.mobile&&cu.consent?`<a class="bg-green-600 text-white rounded-full px-4 py-2 text-sm font-semibold" target="_blank" rel="noopener" href="https://wa.me/${wa(cu.mobile)}?text=${encodeURIComponent(txt)}">WhatsApp invoice</a>`:(cu&&cu.mobile?'<span class="text-xs text-ink/50">Customer has not opted in to WhatsApp.</span>':'');
 return `<div class="np sticky top-0 bg-white border-b border-black/10 p-3 flex flex-wrap items-center gap-2"><b>Invoice ${esc(s.no)}</b><button data-print class="bg-ink text-white rounded-full px-4 py-2 text-sm font-semibold">Print</button>${wb}<button data-docclose class="border border-black/15 rounded-full px-4 py-2 text-sm font-semibold">Close</button></div><div class="p-6 max-w-3xl mx-auto text-sm bg-white"><div class="text-center"><p class="text-xl font-extrabold">${esc(b.name)}</p><p class="text-xs">${esc(ph.addr)} ${esc(ph.phone)}</p><p class="text-xs">${ph.gstin?'GSTIN: '+esc(ph.gstin)+' · ':''}${ph.dl?'Drug Licence: '+esc(ph.dl):''}</p><p class="mt-2 font-bold">TAX INVOICE</p></div><div class="flex justify-between mt-3 text-xs"><span>Invoice: <b>${esc(s.no)}</b></span><span>${fT(s.t)}</span></div><p class="text-xs">Customer: ${esc(cu?cu.name+(cu.mobile?' · '+cu.mobile:''):'Walk-in')}${s.rx?` · Rx: Dr. ${esc(s.rx.doc)} / ${esc(s.rx.pat)}`:''}</p>
 <table class="w-full mt-3 text-xs"><thead class="border-y border-black/30"><tr class="text-left"><th class="py-1">Item</th><th>Batch</th><th>Exp</th><th class="text-right">Qty</th><th class="text-right">MRP</th><th class="text-right">GST%</th><th class="text-right">Amount</th></tr></thead><tbody>${s.lines.map(l=>`<tr class="border-b border-black/10"><td class="py-1">${esc(l.name)}</td><td>${esc(l.bno)}</td><td>${fx(l.exp)}</td><td class="text-right">${l.qty}</td><td class="text-right">${rp(l.mrp)}</td><td class="text-right">${l.gst}</td><td class="text-right">${rp(l.net)}</td></tr>`).join('')}</tbody></table>
 <div class="mt-3 ml-auto max-w-xs text-xs space-y-0.5"><div class="flex justify-between"><span>Taxable value</span><span>${rp(tv)}</span></div><div class="flex justify-between"><span>CGST</span><span>${rp(cg)}</span></div><div class="flex justify-between"><span>SGST</span><span>${rp(sg)}</span></div>${s.disc?`<div class="flex justify-between"><span>Discount (included)</span><span>${rp(s.disc)}</span></div>`:''}<div class="flex justify-between"><span>Round off</span><span>${rp(s.rnd)}</span></div><div class="flex justify-between text-base font-extrabold border-t border-black/30 pt-1"><span>TOTAL</span><span>${rp(s.pay)}</span></div><p class="pt-1">Paid: ${s.payments.map(p=>p.m+' '+rp(p.a)).join(' · ')}</p></div><p class="mt-4 text-[10px] text-center text-ink/60">MRP inclusive of all taxes. Please check batch and expiry before leaving the counter.</p></div>`}
function phPay(){const ph=PH(),c=cartCalc(),F=m=>{flash(m);render()};
 if(!S.cart.length)return F('Add medicines to the bill first.');if(c.warn.length)return F(c.warn[0]);
 let rx=null;if(c.rx){if(!can('approve_rx'))return F('A pharmacist or manager must approve prescription medicines. Ask them to sign in and complete this bill.');if(!(S.c.rxd||'').trim()||!(S.c.rxp||'').trim())return F('Enter the doctor and patient name for prescription medicines.');rx={doc:S.c.rxd.trim(),pat:S.c.rxp.trim(),by:U.name}}
 let pay=[['CASH','pcash'],['UPI','pupi'],['CARD','pcard'],['CREDIT','pcredit']].map(([m,k])=>({m,a:toP(S.c[k])})).filter(x=>x.a>0);if(!pay.length)pay=[{m:S.c.pm||'CASH',a:c.pay}];const paid=pay.reduce((a,x)=>a+x.a,0);
 if(paid!==c.pay)return F('Payments ('+rp(paid)+') must equal the total ('+rp(c.pay)+').');
 {const up=pay.find(x=>x.m==='UPI');if(up&&UPI_RE.test(ph.upi||'')&&S.c.upiokA!==f2(up.a/100))return F('Tick "Payment received on my phone" once the UPI money shows on your phone.')}
 const nm=(S.c.cn||'').trim(),mb=(S.c.cm||'').replace(/\D/g,'');let cu=ph.cust.find(x=>x.id===S.c.cust)||(mb.length===10?ph.cust.find(x=>x.mobile===mb):null);
 if(!cu&&(nm||mb)){if(mb&&mb.length!==10)return F('Enter a 10-digit mobile number.');cu=mb&&ph.cust.find(x=>x.mobile===mb);if(!cu){cu={id:uid(),name:nm||'Customer',mobile:mb,consent:!!S.c.opt,visits:0,spent:0,bal:0};ph.cust.push(cu)}}
 if(pay.some(x=>x.m==='CREDIT')&&!cu)return F('Select or add a customer for credit sales.');
 const no=`${ph.prefix}/${fy()}/${String(++ph.seq).padStart(5,'0')}`;
 const lines=c.lines.map(L=>{move(L.bt.id,'SALE',-L.qty,no);return{med:L.med.id,name:L.med.brand+(L.med.strength?' '+L.med.strength:''),batch:L.bt.id,bno:L.bt.no,exp:L.bt.exp,qty:L.qty,mrp:L.mrp,disc:L.disc,net:L.net,taxable:L.taxable,tax:L.tax,cgst:L.cgst,sgst:L.sgst,gst:L.med.gst,hsn:L.med.hsn,cost:L.bt.cost,ret:0}});
 const s={id:uid(),no,t:Date.now(),lines,sub:c.sub,disc:c.disc,tax:c.tax,rnd:c.rnd,pay:c.pay,payments:pay,cust:cu?cu.id:null,rx,st:'completed',by:U.name};
 ph.sales.unshift(s);if(cu){cu.visits=(cu.visits||0)+1;cu.spent=(cu.spent||0)+c.pay;const cr=pay.find(x=>x.m==='CREDIT');if(cr)cu.bal=(cu.bal||0)+cr.a}
 if(c.disc>0)audit('DISCOUNT',no+': '+rp(c.disc));if(S.cart.some(l=>l.pick))audit('MANUAL_BATCH',no);if(rx)audit('RX_SALE',no+' · Dr. '+rx.doc);
 save();S.cart=[];S.c={};showDoc(invoiceHtml(s));render()}
function phRetDo(){const ph=PH(),s=ph.sales.find(x=>x.id===S.ret);if(!s)return;const reason=val('rtR'),method=val('rtM');let refund=0,n=0;const rl=[];
 s.lines.forEach((l,i)=>{const q=Math.min(Math.max(0,+val('rq'+i)||0),l.qty-(l.ret||0));if(q>0){const amt=Math.round(l.net*q/l.qty),bt=ph.batches.find(x=>x.id===l.batch);refund+=amt;n+=q;l.ret=(l.ret||0)+q;move(['Damaged','Expired'].includes(reason)?quarBatch(bt).id:bt.id,'SALES_RETURN',q,s.no,reason);rl.push({name:l.name,qty:q,amt})}});
 if(!n){flash('Enter a quantity to return.');return render()}
 s.st=s.lines.every(l=>(l.ret||0)>=l.qty)?'returned':'partial';const cu=ph.cust.find(x=>x.id===s.cust);
 if(method==='CREDIT'&&cu)cu.bal=Math.max(0,(cu.bal||0)-refund);
 ph.returns.unshift({id:uid(),t:Date.now(),sale:s.no,lines:rl,refund,method,reason,by:U.name});audit('SALES_RETURN',s.no+' · '+rp(refund)+' · '+reason);save();S.ret=null;flash('Return processed. Refund '+rp(refund)+' by '+method+'.');render()}
function phCancel(id){const ph=PH(),s=ph.sales.find(x=>x.id===id);if(!s||s.st!=='completed'||s.t<t0())return;s.lines.forEach(l=>{const bt=ph.batches.find(x=>x.id===l.batch);move(bt.id,'SALES_RETURN',l.qty-(l.ret||0),s.no,'Cancelled');l.ret=l.qty});s.st='cancelled';const cu=ph.cust.find(x=>x.id===s.cust);if(cu){cu.spent=Math.max(0,cu.spent-s.pay);cu.visits=Math.max(0,cu.visits-1);const cr=s.payments.find(x=>x.m==='CREDIT');if(cr)cu.bal=Math.max(0,cu.bal-cr.a)}audit('SALE_CANCELLED',s.no+' · '+rp(s.pay));save();flash('Bill '+s.no+' cancelled and stock restored.');render()}
V.phSales=()=>{const ph=PH();
 if(S.ret){const s=ph.sales.find(x=>x.id===S.ret);return `<button data-act="phRetX" class="text-sm text-kate font-semibold mb-3">← Back to bills</button>`+h2('Return · '+esc(s.no))+bx('',`<div class="space-y-2">${s.lines.map((l,i)=>`<div class="flex items-center justify-between gap-3 text-sm"><span class="flex-1">${esc(l.name)} · batch ${esc(l.bno)} (sold ${l.qty}, returned ${l.ret||0})</span><input id="rq${i}" type="number" min="0" max="${l.qty-(l.ret||0)}" placeholder="Qty" aria-label="Return quantity" class="${IN} w-24"></div>`).join('')}</div><div class="grid sm:grid-cols-3 gap-2 mt-4">${sel('rtR',['Wrong item','Customer changed mind','Damaged','Expired','Other'])}${sel('rtM',[['CASH','Refund cash'],['UPI','Refund UPI'],['CREDIT','Reduce customer credit']])}${bt('phRetDo','Process return')}</div><p class="text-xs text-ink/50 mt-2">Damaged or expired items go to a quarantined batch, not back to sellable stock.</p>`)}
 return h2('Bills & returns')+tb(['Invoice','When','Customer','Total','Payment','Status',''],ph.sales.slice(0,100).map(s=>{const cu=ph.cust.find(x=>x.id===s.cust);return[esc(s.no),fT(s.t),esc(cu?cu.name:'Walk-in'),rp(s.pay),s.payments.map(p=>p.m).join('+'),s.st==='completed'?'Completed':s.st==='cancelled'?'<span class="text-red-600">Cancelled</span>':s.st==='returned'?'<span class="text-red-600">Returned</span>':'<span class="text-orange-600">Part-returned</span>',`<span class="flex gap-1">${bt('phView','View',s.id,'border border-black/15')}${can('refund')&&['completed','partial'].includes(s.st)?bt('phRet','Return',s.id,'border border-black/15'):''}${can('cancel')&&s.st==='completed'&&s.t>=t0()?bt('phCancel','Cancel',s.id,'text-red-600 border border-red-200'):''}</span>`]}),'No bills yet.')};
/* ===== KIRO PHARMACY: home, inventory, expiry, purchases, people, reports, AI ===== */
const fc=(k,ph,t)=>`<input data-c="${k}" type="${t||'text'}" value="${esc(S.c[k]||'')}" placeholder="${ph}" aria-label="${ph}" class="${IN}">`;
const BKT=['Expired','0–30 days','31–60 days','61–90 days','90+ days'],bkOf=d=>d<0?0:d<=30?1:d<=60?2:d<=90?3:4;
V.phHome=()=>{const ph=PH(),sl=liveSales().filter(s=>s.t>=t0()),tot=sl.reduce((a,s)=>a+s.pay,0),mgn=sl.reduce((a,s)=>a+s.lines.reduce((x,l)=>x+mg(l),0),0),
 low=ph.meds.filter(m=>m.st!=='off'&&avail(m.id)<=m.min).length,bs=ph.batches.filter(b=>b.qty>0),ex=bs.filter(b=>dd(b.exp)<0).length,e30=bs.filter(b=>{const d=dd(b.exp);return d>=0&&d<=30}).length,e90=bs.filter(b=>{const d=dd(b.exp);return d>30&&d<=90}).length,hr=new Date().getHours();
 const due=can('reports')&&ph.kdDaily!==kd()&&ph.meds.length,wdue=can('reports')&&ph.meds.length&&(!ph.kdWeekly||Date.now()-ph.kdWeekly>=7*864e5);
 return `<p class="text-sm text-ink/60">${hr<12?'Good Morning':hr<17?'Good Afternoon':'Good Evening'}, ${esc(U.name)}</p>`+h2(esc(B().name))+(ph.meds.length?'':`<div class="mb-4 rounded-2xl bg-kate/10 text-kate p-4 text-sm font-semibold">Start by adding medicines in Inventory. ${can('editMed')?bt('go','Open Inventory','phStock','bg-kate text-white'):''}</div>`)
 +(due||wdue?`<div class="mb-4 rounded-2xl bg-green-50 border border-green-200 p-4 text-sm flex flex-wrap items-center justify-between gap-2"><span>💬 ${due?'Today\'s report is ready to send to the owner.':''} ${wdue?'The weekly report is ready.':''}</span>${bt('go','Open WhatsApp reports','phWa','bg-green-600 text-white')}</div>`:'')
 +(can('cost')?(()=>{const D=phInsData();return D.stuck>0?`<div class="mb-4 rounded-2xl bg-orange-50 border border-orange-200 p-4 text-sm flex flex-wrap items-center justify-between gap-2"><span>⚠ ${rp(D.stuck)} is stuck in ${D.dead.length} dead stock batch(es) older than ${DEAD_DAYS} days.</span>${bt('go','See dead stock','phIns','bg-orange-600 text-white')}</div>`:''})():'')+kp([['Today\'s sales',rp(tot)],['Bills',sl.length],[can('cost')?'Gross margin':'Low stock',can('cost')?rp(mgn):low],[can('cost')?'Low stock':'Expiring ≤ 30 days',can('cost')?low:e30]])
 +`<div class="mt-3 flex flex-wrap gap-2 text-sm"><span class="rounded-full bg-red-50 text-red-700 px-3 py-1">🔴 ${ex} expired</span><span class="rounded-full bg-orange-50 text-orange-700 px-3 py-1">🟠 ${e30} expiring within 30 days</span><span class="rounded-full bg-yellow-50 text-yellow-800 px-3 py-1">🟡 ${e90} expiring within 90 days</span></div>`
 +`<div class="mt-5 flex flex-wrap gap-3">${can('bill')?bt('go','NEW BILL','phBill','bg-kate text-white hover:bg-ink !px-8 !py-3 text-base'):''}${can('purchase')?bt('go','PURCHASE','phBuy','bg-white border border-black/10 !py-3'):''}${can('editMed')||can('stockAdj')?bt('go','INVENTORY','phStock','bg-white border border-black/10 !py-3'):''}${can('customer')?bt('go','CUSTOMERS','phCust','bg-white border border-black/10 !py-3'):''}${can('reports')?bt('go','REPORTS','phRep','bg-white border border-black/10 !py-3'):''}</div>`};
/* Smart Inventory Insights for pharmacy: batch age, dead stock, fast-moving forms (uses batch received date). */
function phInsData(now=Date.now()){
 const ph=PH(),meds={},sl=liveSales(),last={};ph.meds.forEach(m=>meds[m.id]=m);
 sl.forEach(s=>s.lines.forEach(l=>{if(l.qty-(l.ret||0)>0)last[l.med]=Math.max(last[l.med]||0,s.t)}));
 const cats=t0=>{const m={};sl.filter(s=>s.t>=t0).forEach(s=>s.lines.forEach(l=>{const q=l.qty-(l.ret||0);if(q>0){const c=(meds[l.med]||{}).form||'Other';m[c]=(m[c]||0)+q}}));return Object.entries(m).sort((a,b)=>b[1]-a[1])};
 let inv=0,stuck=0,expv=0,nocost=0;const dead=[],ages=[['0-30 days',0],['31-60 days',0],['61-90 days',0],['Over 90 days',0]];
 ph.batches.filter(b=>b.qty>0&&b.st!=='quarantine').forEach(b=>{const m=meds[b.med];if(!m)return;const v=b.qty*(b.cost||0);if(!(b.cost>0))nocost++;
  if(dd(b.exp)<0){expv+=v;return}
  const age=Math.floor((now-(b.recv||now))/DAY),idle=!last[b.med]||now-last[b.med]>DEAD_DAYS*DAY;
  inv+=v;ages[age>90?3:age>60?2:age>30?1:0][1]+=v;
  if(age>DEAD_DAYS&&idle){stuck+=v;dead.push({m,b,age,locked:v})}});
 dead.sort((a,b)=>b.locked-a.locked);
 return{inv,stuck,expv,nocost,dead,ages,week:cats(now-7*DAY),fort:cats(now-14*DAY).slice(0,5)}}
const phAgeTxt=id=>{const bs=PH().batches.filter(b=>b.med===id&&b.qty>0&&b.recv&&b.st!=='quarantine');if(!bs.length)return '<span class="text-ink/40">—</span>';const a=Math.floor((Date.now()-Math.min(...bs.map(b=>b.recv)))/DAY);return `<span class="${a>DEAD_DAYS?'text-red-600 font-semibold':''}">${a} d</span>`};
V.phIns=()=>{const ph=PH(),D=phInsData(),pct=+S.c.ipct||20;
 const k=kp([['Total inventory value (at cost)',rp(D.inv)],['Stuck capital in dead stock',rp(D.stuck)],['Top selling category this week',D.week[0]?esc(D.week[0][0])+' · '+D.week[0][1]+' sold':'No sales yet'],['Expired stock (at cost)',rp(D.expv)]]);
 const dead=D.dead.length?tb(['Medicine','Batch','Received','Days on shelf','Left','Locked money',''],D.dead.map(r=>[`<b>${esc(r.m.brand)} ${esc(r.m.strength)}</b>`,esc(r.b.no),r.b.recv?fD(r.b.recv):'—',r.age+' days',r.b.qty,`<b class="text-red-600">${rp(r.locked)}</b>`,needsRx(r.m)?'<span class="text-xs text-ink/50">Prescription medicine: do not advertise. Ask your supplier about return or exchange.</span>':bt('phInsAlert','Create Discount Alert',r.m.id,'border border-kate text-kate !px-3 !py-1')+(r.m.alert?` <span class="text-xs text-ink/50">sent ${fD(r.m.alert.t)}</span>`:'')])):`<div class="bg-white rounded-2xl border border-black/5 p-6 text-center text-sm text-ink/50">No dead stock. Nothing has sat unsold for over ${DEAD_DAYS} days.</div>`;
 return h2('Stock insights')+`<p class="text-sm text-ink/60 -mt-2 mb-4">Dead stock = a batch received more than ${DEAD_DAYS} days ago whose medicine has not sold in ${DEAD_DAYS} days. Locked money = packs left × purchase cost. Expired stock is shown separately.</p>`+k
 +(D.nocost?`<p class="mt-2 text-xs text-orange-700">${D.nocost} batch(es) have no purchase cost, so values are understated. Enter the cost when adding stock.</p>`:'')
 +`<div class="mt-4"><div class="flex items-center justify-between mb-2"><p class="font-bold">Dead stock warning</p><label class="text-xs font-semibold text-ink/60 flex items-center gap-2">Offer ${sel('ipct',[10,20,30].map(x=>[x,x+'% off']),pct,'data-c="ipct" data-re')}</label></div>${dead}<p class="text-[11px] text-ink/40 mt-1">The alert opens WhatsApp with a ready offer message. It does not change the price in billing. Only non-prescription medicines can be offered.</p></div>`
 +`<div class="mt-4 grid xl:grid-cols-2 gap-4"><div><p class="font-bold mb-2">Fast-moving categories (last 14 days)</p>${tb(['Category','Packs sold'],D.fort.map(x=>[esc(x[0]),x[1]]),'No sales in the last 14 days.')}</div><div><p class="font-bold mb-2">Where your money sits (by stock age)</p>${tb(['Age','Value at cost'],D.ages.map(x=>[x[0],rp(x[1])]))}</div></div>`};
Object.assign(ACT,{phInsAlert(id){const ph=PH(),m=ph.meds.find(x=>x.id===id);if(!m||needsRx(m)){flash('Prescription medicines cannot be advertised.');return render()}
 const pct=+S.c.ipct||20,np=Math.round(m.mrp*(1-pct/100)),msg=`Special offer at ${B().name}: ${m.brand}${m.strength?' '+m.strength:''} now ${pct}% off, only ${rp(np)} (MRP ${rp(m.mrp)}). Limited stock. Visit us today!`;
 m.alert={t:Date.now(),pct};audit('DISCOUNT_ALERT',m.brand+' '+pct+'%');save();window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');render()}});
/* ===== Mobile quick billing: tap items, tap charge, print / share receipt ===== */
function rcptHtml(s){const b=B(),g=s.gst,ph=s.cust&&s.cust.ph?wa(s.cust.ph):'';
 const lines=s.items.map(i=>`<div>${esc(i.n)}</div><div class="r"><span>${i.q} × ${rs(i.p)}</span><span>${rs(i.q*i.p)}</span></div>`).join('');
 const row=(l,v)=>`<div class="r"><span>${l}</span><span>${v}</span></div>`;
 return `<style>@page{margin:2mm}@media print{.rc{width:${b.paper==='58'?'48mm':'72mm'}}}</style>
<div class="np sticky top-0 bg-white border-b border-black/10 p-3 flex flex-wrap items-center gap-2"><b class="text-green-700 w-full text-lg">✓ Paid ${rs(s.total)}</b><button data-print class="flex-1 bg-ink text-white rounded-full px-5 py-3 text-sm font-bold">🖨 Print receipt</button>${ph?`<a class="flex-1 text-center bg-green-600 text-white rounded-full px-5 py-3 text-sm font-bold" target="_blank" rel="noopener" href="https://wa.me/${ph}?text=${encodeURIComponent(receipt(s))}">WhatsApp</a>`:''}<button data-docclose class="flex-1 border border-black/15 rounded-full px-5 py-3 text-sm font-bold">New bill</button></div>
<div class="rc"><p style="text-align:center;font-weight:700;font-size:15px">${esc(b.name)}</p>${b.addr?`<p style="text-align:center">${esc(b.addr)}</p>`:''}${b.gstin?`<p style="text-align:center">GSTIN: ${esc(b.gstin)}</p>`:''}<hr>${row('Bill #'+esc(String(s.no)),esc(fT(s.t)))}${s.cust&&(s.cust.n||s.cust.ph)?`<div>Customer: ${esc(s.cust.n||'')} ${esc(s.cust.ph||'')}</div>`:''}<hr>${lines}<hr>${row('Subtotal',rs(s.sub))}${s.disc?row('Discount','−'+rs(s.disc)):''}${s.exch?row('Exchange','−'+rs(s.exch)):''}<div class="r" style="font-weight:700;font-size:15px"><span>TOTAL</span><span>${rs(s.total)}</span></div>${g?`<hr>${row('Taxable value',m2(g.base))}${row('CGST '+g.r/2+'%',m2(g.cg))}${row('SGST '+g.r/2+'%',m2(g.sg))}<div>Prices include GST</div>`:''}<hr>${row('Paid by',esc(s.pay))}<div>Served by ${esc(s.by||'')}</div><hr><p style="text-align:center">Thank you! Visit again.</p></div>`}
function posBar(fl){
 const pill=fl?`<div role="alert" class="rounded-xl bg-ink text-white text-sm p-3 mb-2">${esc(fl)}</div>`:'';
 if(S.mod==='phBill'){const n=S.cart.reduce((a,l)=>a+l.qty,0);if(!n)return '';return `<div class="mbar">${pill}<button data-act="phBar" class="w-full rounded-2xl bg-kate text-white font-extrabold text-lg py-4">COMPLETE BILL ${rp(cartCalc().pay)} · ${n} item${n>1?'s':''}</button></div>`}
 const n=S.mod==='pos'?S.cart.reduce((a,l)=>a+l.q,0):0;if(!n)return '';
 const b=B(),T=tot(),pm=S.c.pay||'Cash',ic={Cash:'💵',UPI:'📱',Card:'💳'};
 const seg=['Cash','UPI','Card'].map(m=>`<button data-act="setPay" data-a="${m}" class="flex-1 rounded-xl py-3 text-sm font-bold ${pm===m?'bg-ink text-white':'bg-mist'}">${ic[m]} ${m}</button>`).join('');
 const bar=`<div class="mbar">${S.sheet?'':pill}<div class="flex gap-2 mb-2">${seg}</div><div class="flex gap-2"><button data-act="sheet" class="rounded-2xl border border-black/15 px-4 py-3 text-sm font-bold leading-tight">🛒 ${n}<br><span class="text-[11px] font-semibold text-ink/60">Review</span></button><button data-act="payPrint" class="flex-1 rounded-2xl bg-kate text-white font-extrabold text-lg py-4">🖨 CHARGE ${rs(T.total)}</button></div></div>`;
 if(!S.sheet)return bar;
 const cart=S.cart.map(l=>`<div class="flex items-center gap-2 py-2 border-b border-black/5"><div class="flex-1 min-w-0"><p class="font-semibold text-sm">${esc(l.n)}</p><p class="text-xs text-ink/50">${rs(l.p)} each</p></div><button data-act="qty" data-a="${l.id}:-1" class="w-11 h-11 rounded-full bg-mist text-xl" aria-label="Less">−</button><b class="w-6 text-center">${l.q}</b><button data-act="qty" data-a="${l.id}:1" class="w-11 h-11 rounded-full bg-mist text-xl" aria-label="More">+</button><b class="w-20 text-right text-sm">${rs(l.p*l.q)}</b></div>`).join('');
 const exf=CF().ex.map(([k,l,t,o])=>`<label class="block text-xs font-semibold text-ink/60">${l}${t==='sel'?`<select data-c="${k}" class="${IN} font-normal">${o.map(x=>`<option ${S.c[k]===x?'selected':''}>${x}</option>`).join('')}</select>`:`<input data-c="${k}" ${t==='num'?'data-re type="number" min="0"':t==='time'?'type="time"':'type="text"'} value="${esc(S.c[k]||'')}" class="${IN} font-normal">`}</label>`).join('');
 return bar+`<div class="msheet"><div><div class="flex items-center justify-between mb-2"><p class="text-lg font-extrabold">Bill · ${n} item${n>1?'s':''}</p><button data-act="sheet" class="w-11 h-11 rounded-full bg-mist text-xl" aria-label="Close">✕</button></div>${pill}${cart}<div class="space-y-2 my-3">${exf}<div class="grid grid-cols-2 gap-2"><input data-c="cn" value="${esc(S.c.cn||'')}" placeholder="Customer name (optional)" aria-label="Customer name" class="${IN}"><input data-c="cp" type="tel" inputmode="numeric" value="${esc(S.c.cp||'')}" placeholder="Mobile (for WhatsApp)" aria-label="Customer mobile" class="${IN}"></div><input data-c="coupon" data-re value="${esc(S.c.coupon||'')}" placeholder="Coupon code" aria-label="Coupon" class="${IN}"></div>
<div class="text-sm space-y-1"><div class="flex justify-between"><span>Subtotal</span><span>${rs(T.sub)}</span></div>${T.disc?`<div class="flex justify-between text-green-700"><span>Coupon ${esc(T.cp.code)}</span><span>−${rs(T.disc)}</span></div>`:''}${T.exch?`<div class="flex justify-between text-green-700"><span>Old battery exchange</span><span>−${rs(T.exch)}</span></div>`:''}<div class="flex justify-between font-extrabold text-xl pt-1"><span>Total</span><span>${rs(T.total)}</span></div>${gstBox(T.total)}</div>${pm==='UPI'?upiPanel(b.upi,b.name,T.total,'Bill '+((b.seq||0)+1)):''}<div class="flex gap-2 mt-4"><button data-act="payShow" class="rounded-2xl border border-black/15 px-4 py-4 text-sm font-bold">Charge only</button><button data-act="payPrint" class="flex-1 rounded-2xl bg-kate text-white font-extrabold text-lg py-4">🖨 CHARGE ${rs(T.total)}</button></div></div></div>`}
Object.assign(ACT,{
 setPay(m){if(['Cash','UPI','Card'].includes(m))S.c.pay=m;render()},
 sheet(){S.sheet=!S.sheet;render()},
 rcptShow(id){const s=B().sales.find(x=>x.id===id);if(s)showDoc(rcptHtml(s))},
 payShow(){ACT.payGo(false)},payPrint(){ACT.payGo(true)},
 payGo(print){const b=B(),T=tot();
  if(S.c.pay==='UPI'&&UPI_RE.test(b.upi||'')&&S.c.upiokA!==f2(T.total)){S.sheet=true;flash('Show the QR to the customer, then tick "Payment received on my phone".');return render()}
  const prev=S.last;S.sheet=false;ACT.pay();
  if(S.last&&S.last!==prev){showDoc(rcptHtml(S.last));if(print)setTimeout(()=>window.print(),300)}},
 phBar(){const ph=PH(),prev=ph.sales[0];phPay();if(PH().sales[0]===prev){const a=$('#app');if(a&&a.scrollTo)a.scrollTo({top:0,behavior:'smooth'})}}
});
V.phExpiry=()=>{const ph=PH(),f=S.c.eb===undefined?'':S.c.eb,rows=ph.batches.filter(b=>b.qty>0).map(b=>({b,m:ph.meds.find(x=>x.id===b.med),d:dd(b.exp)})).filter(x=>f==='all'?true:f===''?bkOf(x.d)<4:bkOf(x.d)===+f).sort((a,b)=>a.d-b.d),cnt=i=>ph.batches.filter(b=>b.qty>0&&bkOf(dd(b.exp))===i).length;
 return h2('Expiry management')+`<div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">${BKT.map((n,i)=>`<button data-act="expFlt" data-a="${i}" class="text-left rounded-2xl border p-3 ${String(i)===f?'border-kate bg-kate/10':'border-black/10 bg-white'}"><p class="text-xs text-ink/60">${n}</p><p class="text-2xl font-extrabold ${i===0?'text-red-600':i===1?'text-orange-600':''}">${cnt(i)}</p></button>`).join('')}</div><div class="mb-3 flex flex-wrap gap-2">${bt('expFlt','Within 90 days','','border border-black/15 bg-white')}${bt('expFlt','All batches','all','border border-black/15 bg-white')}${bt('expCsv','Copy as CSV','','border border-black/15 bg-white')}</div>`
 +tb(['Medicine','Batch','Expiry','Qty','Value (cost)','Status',''],rows.map(x=>[`<b>${esc(x.m.brand)}</b>`,esc(x.b.no),`<span class="${ec(x.b.exp)}">${fx(x.b.exp)} (${x.d<0?-x.d+' d ago':x.d+' d'})</span>`,x.b.qty,can('cost')?rp(x.b.qty*x.b.cost):'—',x.b.st+(x.b.clr?' · clearance':''),`<span class="flex flex-wrap gap-1">${can('stockAdj')?bt('expClr',x.b.clr?'Unmark':'Clearance',x.b.id,'border border-black/15')+bt('expQ',x.b.st==='quarantine'?'Release':'Quarantine',x.b.id,'border border-black/15')+bt('expW','Write off',x.b.id,'text-red-600 border border-red-200'):''}${can('purchase')&&x.b.sup?bt('expR','Return to supplier',x.b.id,'border border-black/15'):''}</span>`]),'Nothing in this range.')+`<p class="text-xs text-ink/50 mt-2">Expired stock is never deleted automatically. Every write-off and return is saved in the stock ledger and audit log.</p>`};
V.phBuy=()=>{const ph=PH(),pl=S.pl||[],tot=pl.reduce((a,l)=>a+Math.round(l.qty*l.cost*(1+l.gst/100)),0);
 return h2('Purchases')+bx('New purchase invoice',`<div class="grid sm:grid-cols-3 gap-2"><select data-c="bsup" aria-label="Supplier" class="${IN}"><option value="">Select supplier</option>${ph.sup.map(s=>`<option value="${s.id}" ${S.c.bsup===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>${fc('binv','Supplier invoice no.')}${fc('bdate','Invoice date','date')}${billPickHtml()}</div>
 <p class="text-xs text-ink/60 mt-3 mb-1">Add a line (cost and MRP per pack; cost is before GST)</p><div class="grid sm:grid-cols-4 gap-2"><select data-c="bmed" data-re aria-label="Medicine" class="${IN} sm:col-span-2"><option value="">Select medicine</option>${ph.meds.map(m=>`<option value="${m.id}" ${S.c.bmed===m.id?'selected':''}>${esc(m.brand)} ${esc(m.strength)}</option>`).join('')}</select>${fc('bno','Batch no.')}${fc('bexp','Expiry MM/YYYY')}${fc('bqty','Quantity (packs)','number')}${fc('bfree','Free qty','number')}${fc('bcost','Cost ₹','number')}${fc('bmrp','MRP ₹ (blank = master)','number')}${fc('bgst','GST % (blank = master)','number')}</div><div class="mt-2">${bt('buyAdd','Add line','','border border-black/15 bg-white')}</div>`)
 +`<div class="mt-4">`+tb(['Medicine','Batch','Expiry','Qty+free','Cost ₹','MRP ₹','GST','Line total',''],pl.map((l,i)=>[esc(l.name),esc(l.no),fx(l.exp),l.qty+'+'+l.free,rp(l.cost),rp(l.mrp),l.gst+'%',rp(Math.round(l.qty*l.cost*(1+l.gst/100))),bt('buyDel','✕',i,'text-red-600')]),'No lines yet. Add the lines from the distributor invoice.')+`</div><div class="mt-3 flex flex-wrap items-center gap-3"><b>Invoice total ${rp(tot)}</b>${fc('bpaid','Paid now ₹','number')}${bt('buyPost','Post purchase')}</div><p class="text-xs text-ink/50 mt-1">Posting updates batches, stock and the supplier balance. AI invoice scanning will fill these lines for you to review (needs the server AI service).</p>`
 +`<p class="font-bold mt-6 mb-2">Posted purchases</p>`+billMiss(ph.purch)+tb(['Date','Supplier','Invoice','Total','Type','Bill'],ph.purch.slice(0,50).map(p=>{const s=ph.sup.find(x=>x.id===p.sup);return[fT(p.t),esc(s?s.name:'—'),esc(p.inv),rp(p.total),p.type==='return'?'Return':'Purchase',billCell(p)]}),'No purchases yet.')};
V.phCust=()=>{const ph=PH();return h2('Customers')+bx('Add customer',`<div class="grid sm:grid-cols-4 gap-2">${fi('cuN','Name')}${fi('cuM','Mobile (10 digits)')}<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="cuO"> WhatsApp invoices opt-in</label>${bt('custAdd2','Add')}</div><p class="text-xs text-ink/50 mt-2">Collect only what you need. Do not send promotions without consent.</p>`)+`<div class="mt-4">`+tb(['Name','Mobile','Bills','Spent','Outstanding','Consent',''],ph.cust.map(c=>[esc(c.name),esc(c.mobile||'—'),c.visits||0,rp(c.spent),c.bal>0?`<b class="text-orange-600">${rp(c.bal)}</b>`:'—',c.consent?'WhatsApp opt-in':'—',c.anon?'Anonymized':`<span class="flex gap-1 items-center">${c.bal>0?`<input id="cr_${c.id}" type="number" placeholder="₹" aria-label="Amount received" class="${IN} w-20">${bt('custRec','Receive',c.id,'border border-black/15')}`:''}${U.role==='owner'||can('customer')?bt('custAnon','Anonymize',c.id,'text-red-600 border border-red-200'):''}</span>`]),'No customers yet. They are added at billing.')+`</div>`};
V.phSup=()=>{const ph=PH();return h2('Suppliers')+bx('Add supplier',`<div class="grid sm:grid-cols-4 gap-2">${fi('suN','Name')}${fi('suG','GSTIN')}${fi('suP','Phone')}${bt('supAdd','Add')}</div>`)+`<div class="mt-4">`+tb(['Supplier','GSTIN','Phone','Outstanding',''],ph.sup.map(s=>[esc(s.name),esc(s.gstin||'—'),esc(s.phone||'—'),s.bal?rp(s.bal):'—',s.bal>0?`<span class="flex gap-1 items-center"><input id="sp_${s.id}" type="number" placeholder="₹" aria-label="Amount paid" class="${IN} w-24">${bt('supPay','Record payment',s.id,'border border-black/15')}</span>`:''])
 ,'No suppliers yet.')+`</div>`};
V.phRx=()=>{const ph=PH();return h2('Prescription register')+tb(['Date','Invoice','Patient','Doctor','Medicines','Approved by'],ph.sales.filter(s=>s.rx).map(s=>[fT(s.t),esc(s.no),esc(s.rx.pat),'Dr. '+esc(s.rx.doc),esc(s.lines.filter(l=>needsRx(ph.meds.find(m=>m.id===l.med)||{})).map(l=>l.name+' ×'+l.qty).join(', ')),esc(s.rx.by)]),'No prescription sales yet.')+`<p class="text-xs text-ink/50 mt-2">Which schedules need prescription details is set in Store settings. Confirm the rules with your pharmacy-law adviser. Uploading prescription images needs the server storage service.</p>`};
V.phRep=()=>{const ph=PH(),r=S.c.rng||'7',lim=r==='all'?0:t0()-(+r-1)*864e5,sl=liveSales().filter(s=>s.t>=lim),rt=ph.returns.filter(x=>x.t>=lim),gross=sl.reduce((a,s)=>a+s.pay,0),ref=rt.reduce((a,x)=>a+x.refund,0),by={},prod={},day={};
 sl.forEach(s=>{s.payments.forEach(p=>by[p.m]=(by[p.m]||0)+p.a);const k=new Date(s.t).toLocaleDateString('en-IN');day[k]=(day[k]||0)+s.pay;s.lines.forEach(l=>{const q=l.qty-(l.ret||0);if(q<=0)return;const x=prod[l.name]||(prod[l.name]={n:l.name,q:0,r:0,m:0});x.q+=q;x.r+=Math.round(l.net*q/l.qty);x.m+=mg(l)})});
 const margin=sl.reduce((a,s)=>a+s.lines.reduce((x,l)=>x+mg(l),0),0),cost=can('cost'),bs=ph.batches.filter(b=>b.qty>0),vc=bs.reduce((a,b)=>a+b.qty*b.cost,0),vm=bs.reduce((a,b)=>a+b.qty*b.mrp,0);
 const tp=Object.values(prod).sort((a,b)=>b.r-a.r).slice(0,10);
 return h2('Reports')+`<div class="max-w-xs mb-4">${sel('rRng',[['1','Today'],['7','Last 7 days'],['30','Last 30 days'],['all','All time']],r,'data-c="rng" data-re')}</div>`+kp([['Net sales',rp(gross-ref)],['Bills',sl.length],['Refunds',rp(ref)],[cost?'Gross margin':'Average bill',cost?rp(margin):rp(sl.length?gross/sl.length:0)]])
 +`<div class="mt-4 grid xl:grid-cols-2 gap-4"><div><p class="font-bold mb-2">Sales by payment mode</p>${tb(['Mode','Amount'],Object.entries(by).map(([k,v])=>[k,rp(v)]),'No sales.')}</div><div><p class="font-bold mb-2">Sales by day</p>${tb(['Day','Sales'],Object.entries(day).map(([k,v])=>[k,rp(v)]),'No sales.')}</div><div><p class="font-bold mb-2">Top products</p>${tb(cost?['Product','Qty','Sales','Margin']:['Product','Qty','Sales'],tp.map(x=>cost?[esc(x.n),x.q,rp(x.r),rp(x.m)]:[esc(x.n),x.q,rp(x.r)]),'No sales.')}</div><div><p class="font-bold mb-2">Stock and dues</p>${tb(['Item','Value'],[[cost?'Stock value at cost':'Stock value at MRP',rp(cost?vc:vm)],['Customers owe you',rp(ph.cust.reduce((a,c)=>a+(c.bal||0),0))],['You owe suppliers',rp(ph.sup.reduce((a,s)=>a+Math.max(0,s.bal||0),0))],['Expired stock value (cost)',cost?rp(bs.filter(b=>dd(b.exp)<0).reduce((a,b)=>a+b.qty*b.cost,0)):'—']])}</div></div>`};
V.audit=()=>h2('Audit log')+tb(['When','Who','Action','Details'],PH().audit.slice(0,200).map(a=>[fT(a.t),esc(a.by),a.act,esc(a.detail)]),'No audited actions yet.');
V.phSet=()=>{const ph=PH();return h2('Store settings')+bx('Store details (printed on invoices)',`<div class="grid sm:grid-cols-3 gap-3">${fv('stN','Store name',B().name)}${fv('stG','GSTIN',ph.gstin)}${fv('stD','Drug licence no.',ph.dl)}${fv('stA','Address',ph.addr)}${fv('stP','Phone',ph.phone)}${fv('stX','Invoice prefix',ph.prefix)}${fv('stW','Near-expiry warning (days)',ph.warn,'number')}${fv('stO','Owner WhatsApp number (10 digits)',ph.ownerWa||'')}${fv('stU','UPI ID for payment QR (e.g. shop@okhdfcbank)',ph.upi||'')}</div>`)+`<div class="mt-4">`+bx('Prescription rules (set with your pharmacy-law adviser)',`<p class="text-xs text-ink/60 mb-2">When a medicine of a ticked schedule is billed, a pharmacist or manager must approve it and doctor and patient names are recorded.</p><div class="flex flex-wrap gap-4 text-sm">${['H','H1','X'].map(k=>`<label class="flex items-center gap-2"><input type="checkbox" data-rule="${k}" ${ph.rules[k]?'checked':''}> Schedule ${k}</label>`).join('')}</div>`)+`</div><div class="mt-4">${bt('phSetSave','Save settings')}</div>`};
V.phAi=()=>{const ex=['Which medicines are running low?','What expired this month?','What were yesterday\'s UPI sales?','What should I reorder this week?','Which products made the highest margin?','Show me today\'s sales','Last 5 invoices','Sales by staff this week','Who is using KIRO?','Forecast next week','Anything unusual?','ABC analysis','What sells together?','Customer segments','Give me a summary'];return h2('Ask KIRO')+bx('',`<p class="text-xs text-ink/60 mb-3">Answers come from this store's data and your permissions only. KIRO never changes records from here.</p><div class="flex gap-2"><input id="aiQ" value="${esc(S.c.aiq||'')}" placeholder="Ask about sales, stock, expiry, margin…" aria-label="Ask KIRO" class="${IN} text-base py-3">${bt('askGo','Ask')}</div><div class="flex flex-wrap gap-2 mt-3">${ex.map(x=>`<button data-act="askEx" data-a="${esc(x)}" class="text-xs border border-black/15 rounded-full px-3 py-1.5 hover:border-kate hover:text-kate">${esc(x)}</button>`).join('')}</div><div class="mt-4 rounded-2xl bg-mist p-4 text-sm whitespace-pre-line min-h-[80px]">${esc(S.aiA||'Pick a question or type your own.')}</div><p class="text-[11px] text-ink/40 mt-2">Preview: keyword-based answers. A language model connected through the server will understand free-form questions.</p>`)};
/* ===== Ask KIRO: one assistant over sales, invoices, staff, customers, stock, GST (keyword based, respects roles) ===== */
/* ---- KIRO data-science engine (same source as kiro-server/node/src/analytics.js and ai-facts.js) ---- */
// KIRO analytics: the numbers behind KIRO AI. Pure functions, no dependencies, same file runs in Node (server) and in the browser (website).
// Money is unit-agnostic (rupees or paise, just be consistent). Input sale: { no, t:ms, by, cust, total, disc, lines:[{id,n,cat,q,a,c}] }
//   a = line amount, c = line cost (optional). `off` = minutes east of UTC for the shop's time zone (India = 330).
// Rules of thumb used throughout: robust statistics (median / MAD) because shop data has outliers by nature, and every method
// refuses to answer when there is too little history instead of producing a confident-looking guess.
const KiroAnalytics = (function () {
  const DAY = 864e5;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mad = (a, med = median(a)) => median(a.map((x) => Math.abs(x - med)));
  const mean = (a) => (a.length ? sum(a) / a.length : NaN);
  const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - 1)); };
  const dayIdx = (t, off) => Math.floor((t + off * 6e4) / DAY);          // local calendar day number
  const dow = (di) => (((di + 4) % 7) + 7) % 7;                          // 0 = Sunday (day 0 = 1 Jan 1970 was a Thursday)
  const iso = (di) => new Date(di * DAY).toISOString().slice(0, 10);
  const hourOf = (t, off) => Math.floor((((t + off * 6e4) % DAY) + DAY) % DAY / 36e5);
  const round = (x, d = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : x);

  // ---- daily series: one entry per local day, zeros included, ending yesterday (today is incomplete, so it is left out) ----
  function daily(sales, { now = Date.now(), days = 120, off = 330, includeToday = false } = {}) {
    const last = dayIdx(now, off) - (includeToday ? 0 : 1), first = last - days + 1, m = new Map();
    for (const s of sales) { const d = dayIdx(s.t, off); if (d < first || d > last) continue; const o = m.get(d) || { total: 0, bills: 0 }; o.total += s.total; o.bills++; m.set(d, o); }
    const out = []; for (let d = first; d <= last; d++) { const o = m.get(d) || { total: 0, bills: 0 }; out.push({ day: d, date: iso(d), dow: dow(d), total: o.total, bills: o.bills }); }
    // trim leading empty days before the first real sale: the shop was not open yet, that is not "zero demand"
    let i = 0; while (i < out.length && out[i].bills === 0) i++;
    return out.slice(i);
  }

  // ---- forecast: weekday seasonality x robust (Theil-Sen) trend, with an honest backtest against "same weekday last week" ----
  function theilSen(y) {
    const n = y.length, slopes = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) slopes.push((y[j] - y[i]) / (j - i));
    const b = slopes.length ? median(slopes) : 0, a = median(y.map((v, i) => v - b * i));
    return { a, b };
  }
  // Weekday factors by classical decomposition: each day divided by its centred 7-day average, so a rising or falling
  // trend does not leak into the weekday pattern. Median per weekday, normalised to average 1.
  function weekdayFactors(w) {
    const r = Array.from({ length: 7 }, () => []);
    for (let i = 3; i < w.length - 3; i++) { const ma = sum(w.slice(i - 3, i + 4).map((x) => x.total)) / 7; if (ma > 0) r[w[i].dow].push(w[i].total / ma); }
    const idx = r.map((v) => (v.length ? median(v) : 1)), mi = mean(idx);
    return idx.map((v) => Math.max(mi > 0 ? v / mi : 1, 0.05));
  }
  function fitForecast(series, h) {
    const w = series.slice(-84), n = w.length; if (!(mean(w.map((x) => x.total)) > 0)) return null;
    const S = weekdayFactors(w), des = w.map((x) => x.total / S[x.dow]), { a, b } = theilSen(des);
    const res = des.map((v, i) => v - (a + b * i)), sig = 1.4826 * mad(res, median(res));
    const out = []; for (let k = 1; k <= h; k++) { const t = n - 1 + k, d = w[n - 1].day + k, s = S[dow(d)], p = Math.max(0, (a + b * t) * s); out.push({ date: iso(d), dow: dow(d), pred: p, lo: Math.max(0, p - 1.28 * sig * s), hi: p + 1.28 * sig * s }); }
    return { out, S, slopePerDay: b, sig };
  }
  function forecast(series, { horizon = 7, minDays = 28 } = {}) {
    if (series.length < minDays) return { ok: false, reason: `Need at least ${minDays} days of sales history to forecast; there are ${series.length}.` };
    const f = fitForecast(series, horizon); if (!f) return { ok: false, reason: 'No sales in the history to forecast from.' };
    // backtest: the last 14 days, each predicted using only the days before it
    let errM = 0, errN = 0, tot = 0, cnt = 0;
    for (let k = 14; k >= 1; k--) {
      const cut = series.length - k; if (cut < minDays) continue;
      const fit = fitForecast(series.slice(0, cut), 1), actual = series[cut].total, naive = series[cut - 7] ? series[cut - 7].total : NaN;
      if (!fit || !Number.isFinite(naive)) continue; errM += Math.abs(actual - fit.out[0].pred); errN += Math.abs(actual - naive); tot += actual; cnt++;
    }
    const wape = cnt && tot > 0 ? errM / tot : NaN, naiveWape = cnt && tot > 0 ? errN / tot : NaN;
    const total = sum(f.out.map((x) => x.pred));
    return { ok: true, horizon: f.out.map((x) => ({ ...x, pred: round(x.pred), lo: round(x.lo), hi: round(x.hi) })), total: round(total), weekdayIndex: f.S.map((v) => round(v, 3)),
      backtest: { days: cnt, wape: round(wape, 3), naiveWape: round(naiveWape, 3), beatsNaive: Number.isFinite(wape) && wape <= naiveWape },
      note: Number.isFinite(wape) && wape > 0.5 ? 'Daily sales here are very uneven, so day-level forecasts are rough. Trust the weekly total more than any single day.' : '' };
  }

  // ---- anomalies: unusual bills, discounts, hours, double entries, and days ----
  function anomalies(sales, { now = Date.now(), off = 330, z = 3.5, minBills = 30 } = {}) {
    const out = [], bills = sales.filter((s) => s.total > 0);
    if (bills.length < minBills) return { ok: false, reason: `Need at least ${minBills} bills to judge what is unusual; there are ${bills.length}.`, items: [] };
    const lg = bills.map((s) => Math.log(s.total)), md = median(lg), sc = 1.4826 * mad(lg, md) || 0.0001;
    for (const s of bills) { const mz = (Math.log(s.total) - md) / sc; if (mz > z) out.push({ type: 'large_bill', no: s.no, by: s.by, t: s.t, value: s.total, score: round(mz, 1), why: `${round(s.total / Math.exp(md), 1)}x the typical bill` }); }
    const dis = bills.filter((s) => s.disc > 0).map((s) => ({ s, r: s.disc / (s.total + s.disc) }));
    if (dis.length >= 10) { const rs = dis.map((x) => x.r), rm = median(rs), rd = 1.4826 * mad(rs, rm) || 0.01;
      for (const { s, r } of dis) if (r >= 0.25 && ((r - rm) / rd > z || r >= 0.5)) out.push({ type: 'big_discount', no: s.no, by: s.by, t: s.t, value: round(r * 100, 0), score: round((r - rm) / rd, 1), why: `${round(r * 100, 0)}% discount; typical is ${round(rm * 100, 0)}%` }); }
    if (bills.length >= 100) { const h = new Array(24).fill(0); bills.forEach((s) => h[hourOf(s.t, off)]++);
      for (const s of bills) { const hr = hourOf(s.t, off); if (h[hr] / bills.length <= 0.01) out.push({ type: 'odd_hour', no: s.no, by: s.by, t: s.t, value: hr, score: 0, why: `billed at ${String(hr).padStart(2, '0')}:00, when under 1% of bills happen` }); } }
    const srt = [...bills].sort((a, b) => a.t - b.t);
    for (let i = 1; i < srt.length; i++) { const p = srt[i - 1], c = srt[i]; if (p.by === c.by && p.total === c.total && c.t - p.t <= 120e3 && c.t !== p.t) out.push({ type: 'possible_double_bill', no: c.no, by: c.by, t: c.t, value: c.total, score: 0, why: `same amount by the same person ${Math.round((c.t - p.t) / 1000)}s after ${p.no}` }); }
    // days: compare each recent day to the same weekday's typical value
    const ser = daily(sales, { now, off, days: 120 }); const days = [];
    if (ser.length >= 28) for (const x of ser.slice(-14)) { const peers = ser.filter((y) => y.dow === x.dow && y.day !== x.day).map((y) => y.total); if (peers.length >= 3) { const pm = median(peers), ps = 1.4826 * mad(peers, pm) || Math.max(1, pm * 0.05), dz = (x.total - pm) / ps;
      if (Math.abs(dz) > z) days.push({ type: dz < 0 ? 'low_day' : 'high_day', date: x.date, value: x.total, score: round(dz, 1), why: `${round(x.total)} against a typical ${round(pm)} for this weekday` }); } }
    return { ok: true, items: out.sort((a, b) => b.t - a.t), days, checked: bills.length };
  }

  // ---- ABC / XYZ: which items carry the revenue (ABC) and how steady their demand is (XYZ) ----
  function abcxyz(sales, { now = Date.now(), days = 90, off = 330 } = {}) {
    const to = dayIdx(now, off) + 1, from = to - days, rev = new Map(), wk = new Map();
    for (const s of sales) { const d = dayIdx(s.t, off); if (d < from || d >= to) continue; const w = Math.floor((d - from) / 7);
      for (const l of s.lines) { const k = l.id != null ? String(l.id) : l.n, o = rev.get(k) || { id: k, n: l.n, cat: l.cat || '', a: 0, q: 0 }; o.a += l.a; o.q += l.q; rev.set(k, o);
        const arr = wk.get(k) || new Array(Math.ceil(days / 7)).fill(0); arr[w] += l.q; wk.set(k, arr); } }
    const list = [...rev.values()].sort((a, b) => b.a - a.a), tot = sum(list.map((x) => x.a));
    if (!list.length || !(tot > 0)) return { ok: false, reason: 'No sales in this period.', items: [] };
    let cum = 0; const items = list.map((x) => { const before = cum / tot; cum += x.a; const abc = before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C';
      const arr = wk.get(x.id), nz = arr.filter((v) => v > 0).length, cv = std(arr) / (mean(arr) || 1), xyz = nz < 4 ? '?' : cv < 0.5 ? 'X' : cv < 1 ? 'Y' : 'Z';
      return { id: x.id, n: x.n, cat: x.cat, revenue: round(x.a), share: round(x.a / tot, 4), qty: x.q, abc, xyz, cv: round(cv, 2) }; });
    const g = (c) => items.filter((i) => i.abc === c);
    return { ok: true, days, items, summary: { A: { items: g('A').length, share: round(sum(g('A').map((i) => i.share)), 3) }, B: { items: g('B').length, share: round(sum(g('B').map((i) => i.share)), 3) }, C: { items: g('C').length, share: round(sum(g('C').map((i) => i.share)), 3) } } };
  }

  // ---- market basket: items that are bought together more often than chance (lift > 1) ----
  function baskets(sales, { minSupport = 0.02, minCount = 3, top = 5, minLift = 1.2 } = {}) {
    const bills = sales.map((s) => [...new Set(s.lines.map((l) => l.n))]).filter((b) => b.length), N = bills.length;
    if (N < 30) return { ok: false, reason: `Need at least 30 bills to find items bought together; there are ${N}.`, pairs: [] };
    const c1 = new Map(), c2 = new Map();
    for (const b of bills) { b.forEach((x) => c1.set(x, (c1.get(x) || 0) + 1)); for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { const k = [b[i], b[j]].sort().join('\u0000'); c2.set(k, (c2.get(k) || 0) + 1); } }
    const pairs = []; for (const [k, c] of c2) { if (c < minCount || c / N < minSupport) continue; const [a, b] = k.split('\u0000'), lift = (c / N) / ((c1.get(a) / N) * (c1.get(b) / N));
      if (lift >= minLift) pairs.push({ a, b, bills: c, support: round(c / N, 4), confAB: round(c / c1.get(a), 3), confBA: round(c / c1.get(b), 3), lift: round(lift, 2) }); }
    return { ok: true, bills: N, pairs: pairs.sort((x, y) => y.lift * y.support - x.lift * x.support).slice(0, top) };
  }

  // ---- RFM customer segments ----
  function rfm(sales, { now = Date.now(), off = 330 } = {}) {
    const m = new Map(); for (const s of sales) { if (!s.cust) continue; const o = m.get(s.cust) || { cust: s.cust, last: 0, f: 0, m: 0 }; o.last = Math.max(o.last, s.t); o.f++; o.m += s.total; m.set(s.cust, o); }
    const cs = [...m.values()]; if (cs.length < 10) return { ok: false, reason: `Need at least 10 named customers for segments; there are ${cs.length}.`, customers: [] };
    cs.forEach((c) => { c.r = dayIdx(now, off) - dayIdx(c.last, off); });
    // Quintile 1..5 by the share of customers strictly worse; equal values always get equal scores.
    const score = (key, higherBetter) => { const sc = new Map(); cs.forEach((c) => { const worse = cs.filter((o) => (higherBetter ? o[key] < c[key] : o[key] > c[key])).length; sc.set(c, 1 + Math.min(4, Math.floor((worse * 5) / cs.length))); }); return sc; };
    const R = score('r', false), F = score('f', true), M = score('m', true);
    const out = cs.map((c) => { const r = R.get(c), f = F.get(c), mm = M.get(c); const seg = r >= 4 && f >= 4 ? 'Champions' : f >= 4 && r >= 3 ? 'Loyal' : r >= 4 && f <= 2 ? 'New or recent' : r <= 2 && f >= 3 ? 'At risk' : r === 1 && f <= 2 ? 'Lost' : 'Regular';
      return { cust: c.cust, recencyDays: c.r, bills: c.f, spent: round(c.m), r, f, m: mm, segment: seg }; });
    const counts = {}; out.forEach((c) => { counts[c.segment] = (counts[c.segment] || 0) + 1; });
    return { ok: true, customers: out.sort((a, b) => b.spent - a.spent), counts };
  }

  // ---- reorder points from real demand variability: ROP = mean demand x lead time + safety stock ----
  function reorder(items, sales, { now = Date.now(), off = 330, days = 28, leadDays = 3, z = 1.64 } = {}) {
    const to = dayIdx(now, off), from = to - days, dem = new Map();
    for (const s of sales) { const d = dayIdx(s.t, off); if (d < from || d >= to) continue; for (const l of s.lines) { const k = l.id != null ? String(l.id) : l.n, a = dem.get(k) || new Array(days).fill(0); a[d - from] += l.q; dem.set(k, a); } }
    const out = [];
    for (const it of items) { const a = dem.get(String(it.id)) || dem.get(it.n); if (!a) continue; const mu = mean(a), sd = std(a); if (!(mu > 0)) continue;
      const rop = mu * leadDays + z * sd * Math.sqrt(leadDays), cover = it.stock / mu;
      out.push({ id: it.id, n: it.n, stock: it.stock, perDay: round(mu, 2), reorderPoint: Math.ceil(rop), daysCover: round(cover, 1), reorderNow: it.stock <= rop, suggestQty: Math.max(0, Math.ceil(rop + mu * 7 - it.stock)) }); }
    return { ok: true, leadDays, items: out.sort((a, b) => a.daysCover - b.daysCover) };
  }

  return { daily, forecast, anomalies, abcxyz, baskets, rfm, reorder, _t: { median, mad, theilSen, dayIdx, dow } };
})();

// The pure half of KIRO AI: facts from sales, topic detection, calculated answers, and the invented-number guard.
// No network, no database, no Node-only APIs, so the same file runs on the server and inside the website.
const KiroAIFacts = (function (KA) {
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const inr = (r) => '₹' + Number(r).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const pct = (x) => Math.round(x * 1000) / 10;
// `unit: 'paise'` divides money by 100; the website already works in rupees.
const toRupees = (sales, unit) => (unit === 'rupees' ? sales : sales.map((s) => ({ ...s, total: s.total / 100, disc: s.disc / 100, lines: s.lines.map((l) => ({ ...l, a: l.a / 100, c: l.c / 100 })) })));

function windowStats(sales, from, to) { const l = sales.filter((s) => s.t >= from && s.t < to), total = l.reduce((a, s) => a + s.total, 0); return { total: Math.round(total), bills: l.length, avgBill: l.length ? Math.round(total / l.length) : 0 }; }

function buildFacts({ sales, items = [], stock = null, now = Date.now(), off = 330, unit = 'paise' }) {
  const S = toRupees(sales, unit), di = (t) => KA._t.dayIdx(t, off), today = di(now), D = 864e5, start = (d) => d * D - off * 6e4;
  const f = { asOf: new Date(now + off * 6e4).toISOString().slice(0, 10), currency: 'INR (rupees)', billsAnalysed: S.length };
  f.sales = { today: windowStats(S, start(today), start(today + 1)), yesterday: windowStats(S, start(today - 1), start(today)), last7days: windowStats(S, start(today - 6), start(today + 1)), previous7days: windowStats(S, start(today - 13), start(today - 6)),
    thisMonth: windowStats(S, start(today - new Date(now + off * 6e4).getUTCDate() + 1), start(today + 1)) };
  const fc = KA.forecast(KA.daily(S, { now, off }), { horizon: 7 });
  f.forecast = fc.ok ? { nextDays: fc.horizon.map((h) => ({ date: h.date, weekday: DAYS[h.dow], expected: Math.round(h.pred), low: Math.round(h.lo), high: Math.round(h.hi) })), nextWeekTotal: Math.round(fc.total),
    backtestErrorPercent: pct(fc.backtest.wape), naiveErrorPercent: pct(fc.backtest.naiveWape), beatsNaive: fc.backtest.beatsNaive, caution: fc.note } : { available: false, reason: fc.reason };
  const an = KA.anomalies(S, { now, off }); if (an.ok) { const counts = {}; an.items.forEach((x) => { counts[x.type] = (counts[x.type] || 0) + 1; });
    const big = an.items.filter((x) => x.type === 'large_bill').map((x) => x.value); f.unusual = { billsChecked: an.checked, counts, largestBill: big.length ? Math.max(...big) : 0, unusualDays: an.days.map((d) => ({ date: d.date, kind: d.type === 'low_day' ? 'unusually low' : 'unusually high', total: Math.round(d.value) })) }; }
  else f.unusual = { available: false, reason: an.reason };
  const ab = KA.abcxyz(S, { now, off }); if (ab.ok) f.itemClasses = { daysLooked: ab.days, A: { items: ab.summary.A.items, revenueSharePercent: pct(ab.summary.A.share) }, B: { items: ab.summary.B.items, revenueSharePercent: pct(ab.summary.B.share) }, C: { items: ab.summary.C.items, revenueSharePercent: pct(ab.summary.C.share) },
    topItems: ab.items.slice(0, 5).map((i) => ({ item: i.n, class: i.abc + (i.xyz === '?' ? '' : i.xyz), revenueSharePercent: pct(i.share) })) };
  const bk = KA.baskets(S); if (bk.ok && bk.pairs.length) f.boughtTogether = bk.pairs.map((p) => ({ items: [p.a, p.b], lift: p.lift, chanceBuyerOfFirstAlsoBuysSecondPercent: pct(p.confAB), bills: p.bills }));
  const rf = KA.rfm(S, { now, off }); f.customers = rf.ok ? { namedCustomers: rf.customers.length, segments: rf.counts } : { available: false, reason: rf.reason };
  if (items.length) { const ro = KA.reorder(items.map((i) => ({ id: i.id, n: i.name, stock: i.stock })), S, { now, off }); f.reorder = ro.items.filter((x) => x.reorderNow).slice(0, 5).map((x) => ({ item: x.n, inStock: x.stock, sellsPerDay: x.perDay, daysOfStockLeft: x.daysCover, suggestedOrderQty: x.suggestQty })); }
  if (stock) f.stock = stock; // already in rupees: { inventoryValueAtCost, stuckInDeadStock, deadStockLots, lowStockItems }
  const w = S.filter((s) => s.t >= start(today - 6)), by = {}; w.forEach((s) => { const o = by[s.by] || (by[s.by] = { bills: 0, total: 0 }); o.bills++; o.total += s.total; });
  f.staffThisWeek = Object.values(by).sort((a, b) => b.total - a.total).map((o, i) => ({ label: 'Staff ' + String.fromCharCode(65 + i), bills: o.bills, total: Math.round(o.total) }));
  return f;
}

// ---- which analytics topic does the question need? (plain keywords; anything else goes to the rule engine) ----
const TOPICS = [['forecast', /forecast|predict|projection|next (week|few days|days|month)|tomorrow|expect/], ['unusual', /anomal|unusual|suspicious|fraud|strange|irregular|odd |duplicate|double bill|discount abuse|cheat/],
  ['classes', /\babc\b|pareto|80\/?20|important items|which items (make|earn|bring)|revenue items|dead weight/], ['together', /together|combo|bundle|basket|cross.?sell|goes with|pair/],
  ['customers', /segment|rfm|loyal|churn|at risk|lost customers|best customers|repeat customers/], ['reorder', /reorder|re-order|restock|stock.?out|run out|safety stock|how much (to )?(buy|order)/],
  ['overview', /trend|growth|compare|versus| vs |last week|how are we doing|performance|insight|analy|health|what should i/]];
const topicOf = (q) => { const s = String(q).toLowerCase(); const t = TOPICS.find(([, re]) => re.test(s)); return t ? t[0] : null; };

// ---- the calculated answer: always available, no AI involved ----
function rulesAnswer(topic, f) {
  const L = [];
  const sales = f.sales;
  if (topic === 'forecast') {
    if (f.forecast.available === false) return f.forecast.reason;
    const fc = f.forecast; L.push(`Expected sales for the next 7 days: about ${inr(fc.nextWeekTotal)}.`, ...fc.nextDays.map((d) => `• ${d.weekday} ${d.date}: ${inr(d.expected)} (likely ${inr(d.low)} to ${inr(d.high)})`));
    L.push(`Check on past data: over the last 14 days this method was off by ${fc.backtestErrorPercent}% of sales${fc.beatsNaive ? ', better than just repeating last week' : ', no better than just repeating last week, so treat it as a rough guide'}.`); if (fc.caution) L.push(fc.caution);
  } else if (topic === 'unusual') {
    const u = f.unusual; if (u.available === false) return u.reason; const c = u.counts, n = Object.values(c).reduce((a, b) => a + b, 0);
    L.push(n || u.unusualDays.length ? `Checked ${u.billsChecked} bills. Found ${n} unusual bill${n === 1 ? '' : 's'}${u.unusualDays.length ? ` and ${u.unusualDays.length} unusual day${u.unusualDays.length === 1 ? '' : 's'}` : ''}.` : `Checked ${u.billsChecked} bills. Nothing looks unusual.`);
    const names = { large_bill: 'much larger than normal', big_discount: 'with a very high discount', odd_hour: 'billed at an unusual hour', possible_double_bill: 'that may have been entered twice' }; Object.entries(c).forEach(([k, v]) => L.push(`• ${v} bill${v === 1 ? '' : 's'} ${names[k] || k}`));
    u.unusualDays.forEach((d) => L.push(`• ${d.date}: ${d.kind} (${inr(d.total)})`)); if (n) L.push('Open Sales in the app to see which invoices these are.');
  } else if (topic === 'classes') {
    const c = f.itemClasses; if (!c) return 'There are no sales in the last 90 days to rank items.';
    L.push(`Over the last ${c.daysLooked} days: ${c.A.items} "A" item${c.A.items === 1 ? '' : 's'} bring ${c.A.revenueSharePercent}% of sales, ${c.B.items} "B" bring ${c.B.revenueSharePercent}%, and ${c.C.items} "C" bring ${c.C.revenueSharePercent}%.`, 'Top items:', ...c.topItems.map((i) => `• ${i.item}: ${i.revenueSharePercent}% of sales (class ${i.class})`), 'Class A items should never run out. Class C items are candidates to stock less.');
  } else if (topic === 'together') {
    if (!f.boughtTogether) return 'I have not found items that are bought together more often than chance yet. I need at least 30 bills with several items each.';
    L.push('Items customers buy together more often than chance:', ...f.boughtTogether.map((p) => `• ${p.items[0]} and ${p.items[1]}: ${p.bills} bills, ${p.lift} times more often than chance (${p.chanceBuyerOfFirstAlsoBuysSecondPercent}% of ${p.items[0]} buyers also buy ${p.items[1]})`), 'Consider placing them together or offering a combo.');
  } else if (topic === 'customers') {
    const c = f.customers; if (c.available === false) return c.reason; L.push(`${c.namedCustomers} named customers by value of recent visits:`, ...Object.entries(c.segments).map(([k, v]) => `• ${k}: ${v}`));
  } else if (topic === 'reorder') {
    if (!f.reorder || !f.reorder.length) return 'Nothing needs reordering based on the last 28 days of sales.';
    L.push('Reorder soon (stock is at or below what you sell during delivery plus a safety margin):', ...f.reorder.map((r) => `• ${r.item}: ${r.inStock} left, sells ${r.sellsPerDay} a day (${r.daysOfStockLeft} days left). Order about ${r.suggestedOrderQty}.`));
  } else {
    const a = sales.last7days, b = sales.previous7days, ch = b.total > 0 ? Math.round(((a.total - b.total) / b.total) * 1000) / 10 : null;
    L.push(`Today: ${inr(sales.today.total)} from ${sales.today.bills} bills. Yesterday: ${inr(sales.yesterday.total)}. This month: ${inr(sales.thisMonth.total)}.`, `Last 7 days: ${inr(a.total)} from ${a.bills} bills${ch === null ? '' : ` (${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch)}% on the 7 days before)`}.`);
    if (f.forecast.nextWeekTotal) L.push(`Expected next 7 days: about ${inr(f.forecast.nextWeekTotal)}.`); if (f.stock) L.push(`${inr(f.stock.stuckInDeadStock)} is stuck in dead stock.`);
  }
  return L.join('\n');
}

// ---- guard against invented numbers ----
const MULT = { lakh: 1e5, lakhs: 1e5, crore: 1e7, crores: 1e7, k: 1e3 };
function numbersIn(text) { const out = []; const re = /(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|crores?|k\b)?/gi; let m; while ((m = re.exec(text))) { const v = Number(m[1].replace(/,/g, '')); if (Number.isFinite(v)) out.push(v * (m[2] ? MULT[m[2].toLowerCase()] : 1)); } return out; }
function allowedNumbers(facts) { const set = new Set(); const add = (v) => { set.add(v); set.add(Math.round(v)); set.add(Math.round(v * 10) / 10); if (Math.abs(v) <= 1) set.add(Math.round(v * 100)); };
  (function walk(x) { if (typeof x === 'number') add(Math.abs(x)); else if (typeof x === 'string') numbersIn(x).forEach(add); else if (x && typeof x === 'object') Object.values(x).forEach(walk); })(facts); return set; }
function ungrounded(answer, facts) { const ok = allowedNumbers(facts), bad = [];
  for (const n of numbersIn(answer)) { if (Number.isInteger(n) && n <= 10) continue; let hit = false; for (const a of ok) if (Math.abs(n - a) <= Math.max(0.51, 0.006 * Math.abs(a))) { hit = true; break; } if (!hit) bad.push(n); } return bad; }


  return { buildFacts, topicOf, rulesAnswer, ungrounded, toRupees, inr };
})(typeof require !== 'undefined' ? require('./analytics') : KiroAnalytics);

function aiNorm(){
 if(CF().ph){const ph=PH();return{ph:true,list:liveSales().map(s=>{const cu=ph.cust.find(c=>c.id===s.cust);return{no:String(s.no),t:s.t,by:s.by||'—',cn:cu?cu.name:'',cp:cu?cu.mobile:'',total:s.pay/100,modes:s.payments.reduce((o,p)=>(o[p.m]=(o[p.m]||0)+p.a/100,o),{}),dc:(s.disc||0)/100,items:s.lines.map(l=>({id:l.med,n:l.name,cat:((ph.meds.find(m=>m.id===l.med)||{}).form)||'',q:l.qty-(l.ret||0),a:l.net/100})).filter(x=>x.q>0),cg:s.lines.reduce((a,l)=>a+l.cgst,0)/100,sg:s.lines.reduce((a,l)=>a+l.sgst,0)/100}})}}
 return{ph:false,list:paid().map(s=>({no:String(s.no),t:s.t,by:s.by||'—',cn:s.cust?s.cust.n:'',cp:s.cust?s.cust.ph:'',total:s.total,modes:{[(s.pay||'Cash').toUpperCase()]:s.total},dc:s.disc||0,items:s.items.map(i=>({id:i.id,n:i.n,cat:((B().items.find(x=>x.id===i.id)||{}).cat)||'',q:i.q,a:i.p*i.q})),cg:s.gst?s.gst.cg:0,sg:s.gst?s.gst.sg:0}))}}
/* sales in the shape the analytics engine expects (rupees) */
const aiSales=N=>N.list.map(x=>({no:x.no,t:x.t,by:x.by,cust:(x.cp||x.cn||'').trim(),total:x.total,disc:x.dc||0,lines:x.items.map(i=>({id:i.id!=null?i.id:i.n,n:i.n,cat:i.cat,q:i.q,a:i.a,c:0}))}));
const aiOff=()=>-new Date().getTimezoneOffset();
function aiPer(s){const now=Date.now(),t=t0(),mth=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime(),yr=new Date(new Date().getFullYear(),0,1).getTime();
 if(/yesterday/.test(s))return[t-864e5,t,'yesterday'];if(/all.?time|ever|overall|since (start|begin)/.test(s))return[0,now+1,'all time'];if(/year/.test(s))return[yr,now+1,'this year'];
 if(/month/.test(s))return[mth,now+1,'this month'];if(/week|7 days/.test(s))return[t-6*864e5,now+1,'in the last 7 days'];return[t,now+1,'today']}
/* KIRO AI wording: the same anonymised facts the calculated answer uses go to the relay; the reply is accepted only if every figure in it is in those facts */
function aiFacts(){const N=aiNorm(),ph=N.ph,items=ph?[]:B().items.filter(i=>i.stock!=null).map(i=>({id:i.id,name:i.n,stock:i.stock}));return KiroAIFacts.buildFacts({sales:aiSales(N),items,now:Date.now(),off:aiOff(),unit:'rupees'})}
function aiWillRun(q){const s=String(q||'').toLowerCase();if(!/^https:\/\//.test(AI_RELAY_URL))return false;const ph=CF().ph;if(ph&&/reorder|restock|expir|margin|profit|running low|low stock|\blow\b/.test(s))return false;
 const mgr=U.role==='owner'||['supervisor','manager','accounts','accountant'].includes(U.role);return !!KiroAIFacts.topicOf(s)&&!/invoice|bill no/.test(s)&&mgr}
async function aiWord(q){const f=aiFacts(),ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),14000);
 try{const r=await fetch(AI_RELAY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:String(q).slice(0,200),facts:f}),signal:ctl.signal});
  if(!r.ok)return{err:r.status===429?'busy':'down'};const d=await r.json();if(!d||typeof d.text!=='string'||!d.text.trim())return{err:'down'};
  const bad=KiroAIFacts.ungrounded(d.text,f);return bad.length?{err:'rejected'}:{text:d.text.trim()}}catch(e){return{err:'down'}}finally{clearTimeout(tm)}}
function aiRun(q,calc){const id=S.aiId=(S.aiId||0)+1;S.aiA=calc+'\n\n⏳ KIRO AI is putting this into words…';render();
 aiWord(q).then(r=>{if(S.aiId!==id)return;S.aiA=r.text?r.text+'\n\n(Worded by AI from your own totals. Every figure was checked against your data.)':calc+'\n\n('+(r.err==='busy'?'The free AI service is busy, so this is the calculated answer.':r.err==='rejected'?'The AI reply used a number that is not in your data, so it was discarded. This is the calculated answer.':'AI is not available right now, so this is the calculated answer.')+')';render()})}
function askAll(q){
 const s=String(q||'').toLowerCase().trim(),N=aiNorm(),m=rs,[from,to,pl]=aiPer(s),ph=N.ph;
 const owner=U.role==='owner',mgr=owner||['supervisor','manager','accounts','accountant'].includes(U.role),fin=owner||['accounts','accountant'].includes(U.role)||(ph&&can('reports'));
 const all=N.list.sort((a,b)=>a.t-b.t),inP=all.filter(x=>x.t>=from&&x.t<to),sum=a=>a.reduce((x,y)=>x+y.total,0);
 const help='I can answer from your own data:\n• Sales, bills and invoice numbers (today, yesterday, this week, this month)\n• "Invoice 12" or "last 5 invoices": who billed it, customer, items, payment\n• Sales by staff, and who is using KIRO\n• GST collected, payment modes, top items, customers\n• Stock: low stock, dead stock, fast movers'+(ph?', expiry, reorder, margin':'')+'\n• A one-line "summary" of the business';
 if(!s)return help;
 if(ph&&/reorder|restock|expir|margin|profit|running low|low stock|\blow\b/.test(s))return askKiro(q);
 const tp=KiroAIFacts.topicOf(s);
 if(tp&&!/invoice|bill no/.test(s)){
  if(!mgr)return 'You do not have permission to view business analysis.';
  const items=ph?[]:B().items.filter(i=>i.stock!=null).map(i=>({id:i.id,name:i.n,stock:i.stock}));
  const f=KiroAIFacts.buildFacts({sales:aiSales(N),items,now:Date.now(),off:aiOff(),unit:'rupees'});
  return KiroAIFacts.rulesAnswer(tp,f)+'\n\n(Calculated from your own bills in this browser.)'}
 const fmtBill=x=>`• ${x.no} · ${fT(x.t)} · ${x.by} · ${m(x.total)}`;
 const mi=/(?:invoice|bill|receipt|inv)\s*(?:no\.?|number|num|#)?\s*[:#]?\s*([a-z0-9\/\-]*\d[a-z0-9\/\-]*)/.exec(s);
 if(mi&&!/(last|latest|recent)\s*\d*\s*(invoice|bill)/.test(s)){const tok=mi[1].replace(/^[\/\-]+|[\/\-]+$/g,'').toLowerCase(),dg=/^\d+$/.test(tok)?+tok:null;
  const x=all.find(y=>{const n=y.no.toLowerCase();return n===tok||n.endsWith('/'+tok)||(dg!==null&&+n.split('/').pop()===dg)});
  if(!x)return 'No invoice matches "'+tok+'". Try the number as printed on the bill.';
  const md=Object.entries(x.modes).map(([k,v])=>k[0]+k.slice(1).toLowerCase()+' '+m(v)).join(' · ');
  return `Invoice ${x.no}\nDate: ${fT(x.t)}\nBilled by: ${x.by}\nCustomer: ${x.cn||x.cp?(x.cn+' '+(x.cp||'')).trim():'Walk-in'}\nPayment: ${md}\nItems:\n${x.items.map(i=>`• ${i.n} × ${i.q} = ${m(i.a)}`).join('\n')}\nTotal: ${m(x.total)}`}
 const ml=/(last|latest|recent)\s*(\d+)?\s*(invoice|bill|sale|receipt)/.exec(s)||(/invoice number|bill number/.test(s)?[0,0,'']:null);
 if(ml){const n=Math.min(20,+ml[2]||5),l=all.slice(-n).reverse();return l.length?(`Latest ${l.length} invoice${l.length>1?'s':''}:\n`+l.map(fmtBill).join('\n')):'No bills yet.'}
 const accs=DB.acc.filter(a=>a.biz===U.biz);
 if(/(using|active|logged|login|sign.?in|users|staff list|team|employees|logins)/.test(s)&&!/sold|sales by|billed by/.test(s)){
  if(!owner)return 'Only the owner can see staff logins and activity.';const td=all.filter(x=>x.t>=t0());
  return 'People with access to this business:\n'+accs.map(a=>{const n=td.filter(x=>x.by===a.name);return `• ${a.name} (${ROLE_L[a.role]||a.role}) · login ${a.id} · last active ${a.lastIn?fT(a.lastIn):'not recorded yet'} · today ${n.length} bills, ${m(sum(n))}`}).join('\n')}
 if(/(staff|cashier|employee|user|who|team)/.test(s)&&/(sold|sale|sales|bill|billed|made|most|top|best|by|per)/.test(s)){
  if(!mgr)return 'You do not have permission to view sales by staff.';const g={};inP.forEach(x=>{const o=g[x.by]||(g[x.by]={n:0,t:0});o.n++;o.t+=x.total});const r=Object.entries(g).sort((a,b)=>b[1].t-a[1].t);
  return r.length?`Sales by staff ${pl}:\n`+r.map(([k,v])=>`• ${k}: ${v.n} bills, ${m(v.t)}`).join('\n'):'No sales '+pl+'.'}
 if(/payment|cash|upi|card|mode/.test(s)&&!/invoice|bill no/.test(s)){const g={};inP.forEach(x=>Object.entries(x.modes).forEach(([k,v])=>g[k]=(g[k]||0)+v));const r=Object.entries(g).sort((a,b)=>b[1]-a[1]);return r.length?`Payments ${pl}:\n`+r.map(([k,v])=>`• ${k[0]+k.slice(1).toLowerCase()}: ${m(v)}`).join('\n')+`\nTotal ${m(sum(inP))} from ${inP.length} bill${inP.length>1?'s':''}.`:'No sales '+pl+'.'}
 if(/gst|tax|cgst|sgst/.test(s)){if(!fin&&!mgr)return 'You do not have permission to view tax totals.';const cg=inP.reduce((a,x)=>a+x.cg,0),sg=inP.reduce((a,x)=>a+x.sg,0);return cg+sg>0?`GST collected ${pl} (included in prices): CGST ${m(cg)} + SGST ${m(sg)} = ${m(cg+sg)} on sales of ${m(sum(inP))}.`:'No GST recorded '+pl+'. Set a GST % in Settings to record it on bills.'}
 if(/customer|client|buyer/.test(s)){const l=ph?PH().cust.map(c=>({n:c.name,p:c.mobile,v:c.visits||0,s:(c.spent||0)/100,d:(c.bal||0)/100})):B().customers.map(c=>({n:c.name,p:c.phone,v:c.visits||0,s:c.spent||0,d:0}));
  if(!l.length)return 'No customers saved yet. Enter a name or mobile at billing.';const top=[...l].sort((a,b)=>b.s-a.s).slice(0,5),due=l.filter(c=>c.d>0);
  return `${l.length} customers saved.\nTop spenders:\n`+top.map(c=>`• ${c.n}${c.p?' ('+c.p+')':''}: ${m(c.s)} over ${c.v} visits`).join('\n')+(due.length?`\nOwing you: ${due.map(c=>c.n+' '+m(c.d)).join(', ')}`:'')}
 if(!ph&&/expense|profit|loss|spend|spent/.test(s)){if(!fin)return 'You do not have permission to view expenses and profit.';const ex=B().expenses.filter(e=>e.t>=from&&e.t<to).reduce((a,e)=>a+e.amt,0),sl=sum(inP);return `${pl[0].toUpperCase()+pl.slice(1)}: sales ${m(sl)}, expenses ${m(ex)}, difference ${m(sl-ex)} (sales minus recorded expenses; not an accounting profit).`}
 if(/dead|stuck|slow|aging|ageing|old stock|locked|stock age|capital/.test(s)){
  if(ph){if(!can('cost'))return 'You do not have permission to view stock value.';const D=phInsData();return `Stuck capital in dead stock: ${rp(D.stuck)} in ${D.dead.length} batch(es) older than ${DEAD_DAYS} days that have not sold.\n`+D.dead.slice(0,5).map(r=>`• ${r.m.brand} batch ${r.b.no}: ${r.b.qty} packs, ${r.age} days, ${rp(r.locked)}`).join('\n')+`\nTotal inventory at cost: ${rp(D.inv)}.`}
  if(!CF().ins||!mgr)return CF().ins?'You do not have permission to view stock value.':'Stock insights are available for businesses that track stock.';const D=insData();return `Stuck capital in dead stock: ${m(D.stuck)} in ${D.dead.length} lot(s) older than ${DEAD_DAYS} days with no sale.\n`+D.dead.slice(0,5).map(r=>`• ${r.it.n}: ${r.x.l} left, ${r.age} days, ${m(r.locked)}`).join('\n')+`\nTotal inventory at cost: ${m(D.inv)}.`}
 if(/fast|trend|moving|categor/.test(s)){const D=ph?phInsData():(CF().ins?insData():null);if(D)return D.fort.length?'Fast-moving categories (last 14 days):\n'+D.fort.map(x=>`• ${x[0]}: ${x[1]} sold`).join('\n'):'No sales in the last 14 days.'}
 if(/top|best|popular|selling|item|product|medicine/.test(s)&&!/staff|cashier/.test(s)){const g={};inP.forEach(x=>x.items.forEach(i=>{const o=g[i.n]||(g[i.n]={q:0,a:0});o.q+=i.q;o.a+=i.a}));const r=Object.entries(g).sort((a,b)=>b[1].a-a[1].a).slice(0,5);return r.length?`Top items ${pl}:\n`+r.map(([k,v])=>`• ${k}: ${v.q} sold, ${m(v.a)}`).join('\n'):'No sales '+pl+'.'}
 const mm=/(upi|cash|card|credit)/.exec(s);if(mm){const k=mm[1].toUpperCase(),v=inP.reduce((a,x)=>a+(x.modes[k]||0),0),n=inP.filter(x=>x.modes[k]).length;return `${k[0]+k.slice(1).toLowerCase()} sales ${pl}: ${m(v)} across ${n} bills.`}
 if(/refund|return/.test(s)){const b=B();if(ph){const r=PH().returns.filter(x=>x.t>=from&&x.t<to);return r.length?`${r.length} return(s) ${pl}, refunded ${rp(r.reduce((a,x)=>a+x.refund,0))}.`:'No returns '+pl+'.'}const r=b.sales.filter(x=>x.st==='refunded'&&x.t>=from&&x.t<to);return r.length?`${r.length} refunded bill(s) ${pl}: ${r.map(x=>'#'+x.no).join(', ')}, total ${m(r.reduce((a,x)=>a+x.total,0))}.`:'No refunds '+pl+'.'}
 if(ph&&/audit|activity|changes|log/.test(s)){if(!can('audit'))return 'You do not have permission to view the audit log.';const a=PH().audit.slice(0,8);return a.length?'Recent activity:\n'+a.map(x=>`• ${fT(x.t)} · ${x.by} · ${x.act}: ${x.detail}`).join('\n'):'No audited actions yet.'}
 const bill=()=>{const n=inP.length;return n?`${m(sum(inP))} from ${n} bill${n>1?'s':''}. Invoice numbers ${inP[0].no} to ${inP[n-1].no}. Average bill ${m(sum(inP)/n)}.`:'No bills '+pl+'.'};
 if(/summary|overview|digest|everything|how (is|am|are).*(business|doing|going|store|shop)/.test(s)){
  const L=[`Summary ${pl}:`,'• Sales: '+bill()],md={};inP.forEach(x=>Object.entries(x.modes).forEach(([k,v])=>md[k]=(md[k]||0)+v));
  if(Object.keys(md).length)L.push('• Payment modes: '+Object.entries(md).map(([k,v])=>k[0]+k.slice(1).toLowerCase()+' '+m(v)).join(' · '));
  const g={};inP.forEach(x=>{g[x.by]=(g[x.by]||0)+x.total});const bs=Object.entries(g).sort((a,b)=>b[1]-a[1])[0];if(bs&&mgr)L.push(`• Top biller: ${bs[0]} (${m(bs[1])})`);
  const cg=inP.reduce((a,x)=>a+x.cg+x.sg,0);if(cg>0&&(fin||mgr))L.push('• GST included: '+m(cg));
  const it={};inP.forEach(x=>x.items.forEach(i=>it[i.n]=(it[i.n]||0)+i.q));const ti=Object.entries(it).sort((a,b)=>b[1]-a[1])[0];if(ti)L.push(`• Best seller: ${ti[0]} (${ti[1]})`);
  if(ph){if(can('cost')){const D=phInsData();L.push('• Stuck capital in dead stock: '+rp(D.stuck))}L.push('• Low-stock medicines: '+lowList().length)}
  else{if(CF().ins&&mgr){const D=insData();L.push('• Stuck capital in dead stock: '+m(D.stuck))}L.push('• Low-stock items: '+B().items.filter(i=>i.stock!=null&&i.stock<=B().low).length)}
  return L.join('\n')}
 if(/sale|sold|revenue|made|bills|invoice|earn|collect|today|yesterday|week|month|report/.test(s))return `Sales ${pl}: ${bill()}`;
 if(!ph&&/low|stock|running|inventory/.test(s)){const b=B(),l=b.items.filter(i=>i.stock!=null&&i.stock<=b.low);return l.length?'Running low:\n'+l.map(i=>`• ${i.n}: ${i.stock} left`).join('\n'):'Nothing is low right now.'}
 return help}
V.ai=()=>{const ex=['Show me today\'s sales','Last 5 invoices','Invoice 1','Sales by staff this week','Who is using KIRO?','GST collected this month','Top items this week','Stuck capital in dead stock','Forecast next week','Anything unusual?','ABC analysis','What sells together?','Customer segments','What should I reorder?','Give me a summary'];return h2('Ask KIRO')+bx('',`<p class="text-xs text-ink/60 mb-3">Answers come from this business's data and your permissions only. KIRO never changes records from here.</p><div class="flex gap-2"><input id="aiQ" value="${esc(S.c.aiq||'')}" placeholder="Ask about sales, invoice numbers, staff, GST, stock…" aria-label="Ask KIRO" class="${IN} text-base py-3">${bt('askGo','Ask')}</div><div class="flex flex-wrap gap-2 mt-3">${ex.map(x=>`<button data-act="askEx" data-a="${esc(x)}" class="text-xs border border-black/15 rounded-full px-3 py-1.5 hover:border-kate hover:text-kate">${esc(x)}</button>`).join('')}</div><div class="mt-4 rounded-2xl bg-mist p-4 text-sm whitespace-pre-line min-h-[80px]">${esc(S.aiA||'Pick a question or type your own.')}</div><p class="text-[11px] text-ink/40 mt-2">Preview: keyword-based answers from your saved data. A language model connected through the server will understand free-form questions.</p>`)};
function askKiro(q){const ph=PH(),s=q.toLowerCase(),now=Date.now(),mth=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();
 const per=/yesterday/.test(s)?[t0()-864e5,t0()]:/week/.test(s)?[t0()-6*864e5,now+1]:/month/.test(s)?[mth,now+1]:[t0(),now+1],pl=/yesterday/.test(s)?'yesterday':/week/.test(s)?'in the last 7 days':/month/.test(s)?'this month':'today',sl=liveSales().filter(x=>x.t>=per[0]&&x.t<per[1]);
 if(/store\s*\d/.test(s))return 'Multi-store reports arrive with the multi-store module. This workspace has one store.';
 if(/reorder|restock|order/.test(s)||/low|running/.test(s)){const sold={};liveSales().filter(x=>x.t>=now-30*864e5).forEach(x=>x.lines.forEach(l=>sold[l.med]=(sold[l.med]||0)+l.qty));const r=ph.meds.filter(m=>m.st!=='off').map(m=>({m,a:avail(m.id),v:sold[m.id]||0})).filter(x=>x.a<=x.m.min||x.a<x.v/2);
  if(!r.length)return 'Nothing is low right now.';const ro=/reorder|restock|order/.test(s);return (ro?'Suggested to reorder:\n':'Running low:\n')+r.map(x=>{const need=Math.max(0,Math.max(x.m.min*2,x.v)-x.a);return `• ${x.m.brand} ${x.m.strength}: ${x.a} in stock, ${x.v} sold in 30 days`+(ro?` → order about ${need}`:'')}).join('\n')}
 if(/expir/.test(s)){const bs=ph.batches.filter(b=>b.qty>0),mine=bs.filter(b=>/month/.test(s)?b.exp.slice(0,7)===new Date().toISOString().slice(0,7):dd(b.exp)<=90),nm=b=>(ph.meds.find(m=>m.id===b.med)||{}).brand;return mine.length?(/month/.test(s)?'Expiring or expired this month:\n':'Expired or expiring within 90 days:\n')+mine.sort((a,b)=>a.exp<b.exp?-1:1).map(b=>`• ${nm(b)} batch ${b.no}: ${b.qty} packs, ${fx(b.exp)}${dd(b.exp)<0?' (expired)':''}`).join('\n'):'No batches match.'}
 if(/margin|profit/.test(s)){if(!can('cost'))return 'You do not have permission to view margins.';const m={};sl.forEach(x=>x.lines.forEach(l=>m[l.name]=(m[l.name]||0)+mg(l)));const t=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);return t.length?'Highest margin '+pl+':\n'+t.map(x=>`• ${x[0]}: ${rp(x[1])}`).join('\n')+'\nTotal margin: '+rp(Object.values(m).reduce((a,b)=>a+b,0)):'No sales '+pl+'.'}
 const mm=/(upi|cash|card|credit)/.exec(s);if(mm){const k=mm[1].toUpperCase(),v=sl.reduce((a,x)=>a+x.payments.filter(p=>p.m===k).reduce((y,p)=>y+p.a,0),0);return k+' sales '+pl+': '+rp(v)}
 if(/sale|sold|revenue|made|bills/.test(s))return `Sales ${pl}: ${rp(sl.reduce((a,x)=>a+x.pay,0))} from ${sl.length} bills.`;
 return 'I can answer questions about sales, payment modes, low stock, reorder suggestions, expiry and margin. Try: "What expired this month?"'}
const NW={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
function voiceParse(t){const ph=PH(),out=[];t.toLowerCase().replace(/[.,]/g,' ').split(/\band\b|\bplus\b/).forEach(seg=>{let q=1;const w=seg.replace(/\b(strips?|packs?|tablets?|bottles?|of)\b/g,' ').split(/\s+/).filter(Boolean).filter(x=>{if(NW[x]){q=NW[x];return false}return true}),key=w.join('').replace(/[^a-z0-9]/g,'');if(!key)return;let best=null,bs=0;ph.meds.forEach(m=>{if(m.st==='off')return;const n=(m.brand+m.strength).toLowerCase().replace(/[^a-z0-9]/g,''),b=m.brand.toLowerCase().replace(/[^a-z0-9]/g,'');let sc=0;if(n===key||b===key)sc=3;else if(n.startsWith(key)||b.startsWith(key)||(b&&key.startsWith(b)))sc=2;else if(n.includes(key))sc=1;if(sc>bs){bs=sc;best=m}});if(best)out.push({m:best,q})});return out}
function voiceApply(t){const got=voiceParse(t);got.forEach(x=>{const l=S.cart.find(y=>y.med===x.m.id),q=Math.min((l?l.qty:0)+x.q,avail(x.m.id));if(q>0)l?l.qty=q:S.cart.push({med:x.m.id,qty:q,pick:''})});
 if(!got.length)S.vmsg='Heard "'+t+'" but found no matching medicine.';else{const c=cartCalc();S.vmsg='Heard "'+t+'". Added '+got.map(x=>x.m.brand+' × '+x.q).join(', ')+'. Total is '+rp(c.pay)+'. Complete payment?';try{speechSynthesis.speak(new SpeechSynthesisUtterance('Total is '+Math.round(c.pay/100)+' rupees. Complete payment?'))}catch(e){}}render()}
function phSample(){const ph=PH();const add=(brand,generic,strength,form,pack,mfr,sch,hsn,gst,mrp,min,bs)=>{const m={id:uid(),brand,generic,strength,form,pack,mfr,sched:sch,hsn,gst,mrp:toP(mrp),cost:0,min,barcode:genEan(ph,ph.meds),st:'on'};ph.meds.push(m);bs.forEach(([no,mo,qty,cost])=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+mo+1,0);const e=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),b={id:uid(),med:m.id,no,exp:e,mrp:toP(mrp),cost:toP(cost),qty:0,st:'active',recv:Date.now()-(mo+30)*1000,sup:''};ph.batches.push(b);move(b.id,'OPENING',qty,'sample','Sample opening stock')})};
 add('Dolo 650','Paracetamol','650mg','Tablet','15 tablets','Sample Pharma','OTC','30049099',5,30,20,[['DL21A',2,50,22],['DL22B',14,100,23]]);
 add('Pan-D','Pantoprazole + Domperidone','40mg+30mg','Capsule','15 capsules','Sample Pharma','H','30049099',5,118,10,[['PD77',9,40,95]]);
 add('Amoxicillin 500','Amoxicillin','500mg','Capsule','10 capsules','Sample Pharma','H','30042019',5,95,10,[['AM05',-1,12,60],['AM06',11,30,62]]);
 add('Cetirizine 10','Cetirizine','10mg','Tablet','10 tablets','Sample Pharma','OTC','30049099',5,25,10,[['CT11',0,25,10]]);
 add('ORS Sachet','Oral rehydration salts','21.8g','Powder','1 sachet','Sample Pharma','OTC','30049099',5,21,20,[['OR3',18,80,14]]);
 add('Cough Syrup','Dextromethorphan','100ml','Syrup','100 ml','Sample Pharma','OTC','30049099',5,98,10,[['CS9',6,8,70]]);
 add('Vitamin C 500','Ascorbic acid','500mg','Tablet','20 chewables','Sample Pharma','OTC','21069099',18,45,10,[['VC2',20,60,30]]);
 add('Digital Thermometer','Device','—','Device','1 piece','Sample Devices','OTC','90251190',18,249,3,[['TH1',30,15,150]]);
 audit('SAMPLE_DATA','Sample medicines loaded');save();flash('Sample medicines loaded. Edit or disable them any time. Check GST rates before real use.');render()}
Object.assign(ACT,{
 phAdd(id){phAdd(id)},
 phQty(a){const[id,d]=a.split(':'),l=S.cart.find(x=>x.med===id);if(!l)return;const q=l.qty+(+d);if(q<=0)S.cart=S.cart.filter(x=>x!==l);else if(q>avail(id)){flash('Only '+avail(id)+' in stock.')}else l.qty=q;render()},
 phPm(m){const c=cartCalc(),k={CASH:'pcash',UPI:'pupi',CARD:'pcard'};['pcash','pupi','pcard','pcredit'].forEach(x=>S.c[x]='');S.c[k[m]]=(c.pay/100).toFixed(2);render()},
 phPay,phVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){flash('Voice input is not supported in this browser. Try Chrome.');return render()}const r=new SR();r.lang='en-IN';r.interimResults=false;r.onresult=e=>voiceApply(e.results[0][0].transcript);r.onerror=()=>{S.vmsg='Could not hear you. Try again.';render()};S.vmsg='Listening… say, for example, "Dolo 650 two strips and Pan-D one".';render();try{r.start()}catch(e){}},
 camBill(){camStart(c=>phScan(c))},camFill(){camStart(c=>{beep();const i=$('#mBc');if(i)i.value=c.replace(/\D/g,'');camClose()})},
 phView(id){const s=PH().sales.find(x=>x.id===id);if(s)showDoc(invoiceHtml(s))},phRet(id){S.ret=id;render()},phRetX(){S.ret=null;render()},phRetDo,phCancel,
 medAdd(){const ph=PH();if(!can('editMed'))return;const brand=val('mB').trim(),mrp=toP(val('mR'));if(!brand||!(mrp>0)){flash('Enter the brand name and MRP.');return render()}const bc=val('mBc').replace(/\s/g,'');if(bc&&!/^\d{8,14}$/.test(bc)){flash('Barcode must be 8–14 digits.');return render()}if(bc&&ph.meds.some(x=>x.barcode&&cn(x.barcode)===cn(bc))){flash('That barcode already belongs to another medicine.');return render()}
  ph.meds.push({id:uid(),brand,generic:val('mG').trim(),strength:val('mS').trim(),form:val('mF'),pack:val('mP').trim(),mfr:val('mM').trim(),sched:val('mC'),hsn:val('mH').trim(),gst:val('mT')===''?5:(+val('mT')||0),mrp,cost:0,min:+val('mN')||0,barcode:bc||genEan(ph,ph.meds),st:'on'});audit('MEDICINE_ADD',brand);save();flash(brand+' added.');render()},
 medCsv(){const ph=PH();let n=0;(S.c.csv||'').split('\n').forEach(line=>{const f=line.split(',').map(x=>x.trim());if(!f[0]||f[0].toLowerCase()==='brand'||!(+f[9]>0))return;ph.meds.push({id:uid(),brand:f[0],generic:f[1]||'',strength:f[2]||'',form:f[3]||'Tablet',pack:f[4]||'',mfr:f[5]||'',sched:['H','H1','X'].includes((f[6]||'').toUpperCase())?f[6].toUpperCase():'OTC',hsn:f[7]||'',gst:+f[8]||0,mrp:toP(f[9]),cost:0,min:+f[10]||0,barcode:genEan(ph,ph.meds),st:'on'});n++});S.c.csv='';audit('MEDICINE_IMPORT',n+' medicines');save();flash(n+' medicines imported.');render()},
 phSample,medSel(id){S.c.msel=S.c.msel===id?'':id;render()},medTog(id){const m=PH().meds.find(x=>x.id===id);m.st=m.st==='off'?'on':'off';audit('MEDICINE_STATUS',m.brand+' → '+m.st);save();render()},
 lblMed(id){const m=PH().meds.find(x=>x.id===id);if(!bcSvg(m.barcode)){flash('This barcode cannot be drawn. Use a valid EAN-13 / UPC-A code.');return render()}showDoc(labelsHtml([{biz:B().name,name:m.brand+' '+m.strength,code:m.barcode,price:rp(m.mrp)}]))},
 lblAll(){const l=PH().meds.filter(m=>bcSvg(m.barcode)).map(m=>({biz:B().name,name:m.brand+' '+m.strength,code:m.barcode,price:rp(m.mrp)}));if(!l.length){flash('No drawable barcodes yet.');return render()}showDoc(labelsHtml(l))},
 expQ(id){if(!can('stockAdj'))return;const b=PH().batches.find(x=>x.id===id);b.st=b.st==='quarantine'?'active':'quarantine';audit('BATCH_STATUS',b.no+' → '+b.st);save();render()},
 batAdj(){if(!can('stockAdj'))return;const q=Math.trunc(+val('adQ')),r=val('adR').trim(),b=PH().batches.find(x=>x.id===val('adB'));if(!b||!q||!r){flash('Choose a batch, a non-zero change and a reason.');return render()}if(b.qty+q<0){flash('Stock cannot go below zero.');return render()}move(b.id,'ADJUSTMENT',q,'',r);audit('STOCK_ADJUSTMENT',b.no+' '+(q>0?'+':'')+q+' · '+r);save();flash('Stock adjusted.');render()},
 expFlt(a){S.c.eb=a===undefined||a===''?'':a;render()},expClr(id){const b=PH().batches.find(x=>x.id===id);b.clr=!b.clr;audit('CLEARANCE',b.no+(b.clr?' marked':' unmarked'));save();render()},
 expW(id){if(!can('stockAdj'))return;const b=PH().batches.find(x=>x.id===id),q=b.qty;move(id,'EXPIRY_WRITEOFF',-q,'','Write-off');audit('WRITE_OFF',b.no+' · '+q+' packs');save();flash('Written off '+q+' packs.');render()},
 expR(id){const ph=PH(),b=ph.batches.find(x=>x.id===id),m=ph.meds.find(x=>x.id===b.med),sp=ph.sup.find(x=>x.id===b.sup);if(!sp){flash('No supplier linked to this batch.');return render()}const q=b.qty,cr=Math.round(q*b.cost*(1+m.gst/100));move(id,'PURCHASE_RETURN',-q,sp.name,'Return to supplier');sp.bal=(sp.bal||0)-cr;ph.purch.unshift({id:uid(),t:Date.now(),sup:sp.id,inv:'RET-'+b.no,type:'return',total:cr,lines:[]});audit('PURCHASE_RETURN',b.no+' · '+q+' packs · credit '+rp(cr));save();flash('Returned to '+sp.name+'. Credit '+rp(cr)+'.');render()},
 expCsv(){const ph=PH(),rows=['medicine,batch,expiry,qty'].concat(ph.batches.filter(b=>b.qty>0).map(b=>[(ph.meds.find(m=>m.id===b.med)||{}).brand,b.no,fx(b.exp),b.qty].join(',')));try{navigator.clipboard.writeText(rows.join('\n'));flash('Copied CSV to clipboard.')}catch(e){flash('Copy is blocked in this browser.')}render()},
 buyAdd(){const ph=PH(),m=ph.meds.find(x=>x.id===S.c.bmed),exp=pExp(S.c.bexp),qty=+S.c.bqty||0,cost=toP(S.c.bcost);if(!m||!(S.c.bno||'').trim()||!exp||!(qty>0)||!(cost>0)){flash('Choose a medicine and enter batch, expiry (MM/YYYY), quantity and cost.');return render()}if(dd(exp)<0){flash('That expiry date has already passed.');return render()}
  const ex=ph.batches.find(b=>b.med===m.id&&b.no===S.c.bno.trim()&&b.exp!==exp);if(ex){flash('Batch '+ex.no+' already exists with expiry '+fx(ex.exp)+'.');return render()}
  (S.pl=S.pl||[]).push({med:m.id,name:m.brand+' '+m.strength,no:S.c.bno.trim(),exp,qty,free:+S.c.bfree||0,cost,mrp:S.c.bmrp?toP(S.c.bmrp):m.mrp,gst:S.c.bgst!==undefined&&S.c.bgst!==''?+S.c.bgst:m.gst});['bmed','bno','bexp','bqty','bfree','bcost','bmrp','bgst'].forEach(k=>S.c[k]='');render()},
 buyDel(i){S.pl.splice(+i,1);render()},
 buyPost(){if(!can('purchase'))return;const ph=PH(),pl=S.pl||[],sp=ph.sup.find(x=>x.id===S.c.bsup);if(!sp||!(S.c.binv||'').trim()||!pl.length){flash('Select a supplier, enter the invoice number and add at least one line.');return render()}
  let tot=0;pl.forEach(l=>{let b=ph.batches.find(x=>x.med===l.med&&x.no===l.no&&x.mrp===l.mrp&&x.st!=='quarantine');if(!b){b={id:uid(),med:l.med,no:l.no,exp:l.exp,mrp:l.mrp,cost:l.cost,qty:0,st:'active',recv:Date.now(),sup:sp.id};ph.batches.push(b)}else{b.cost=l.cost;b.sup=sp.id}move(b.id,'PURCHASE',l.qty+l.free,S.c.binv,sp.name);tot+=Math.round(l.qty*l.cost*(1+l.gst/100));const m=ph.meds.find(x=>x.id===l.med);m.cost=l.cost});
  const paid=Math.min(toP(S.c.bpaid),tot);sp.bal=(sp.bal||0)+tot-paid;const pr={id:uid(),t:Date.now(),sup:sp.id,inv:S.c.binv.trim(),type:'purchase',total:tot,paid,lines:pl};ph.purch.unshift(pr);billAttach(pr);audit('PURCHASE_POSTED',S.c.binv+' · '+sp.name+' · '+rp(tot));S.pl=[];['bsup','binv','bdate','bpaid'].forEach(k=>S.c[k]='');save();flash('Purchase posted. Stock and supplier balance updated.');render()},
 supAdd(){const n=val('suN').trim();if(!n){flash('Enter the supplier name.');return render()}PH().sup.push({id:uid(),name:n,gstin:val('suG').trim().toUpperCase(),phone:val('suP').trim(),bal:0});save();render()},
 supPay(id){const s=PH().sup.find(x=>x.id===id),a=toP(val('sp_'+id));if(!(a>0)){flash('Enter an amount.');return render()}s.bal=(s.bal||0)-a;audit('SUPPLIER_PAYMENT',s.name+' · '+rp(a));save();flash('Payment recorded.');render()},
 custAdd2(){const n=val('cuN').trim(),m=val('cuM').replace(/\D/g,'');if(!n||m.length!==10){flash('Enter a name and a 10-digit mobile number.');return render()}if(PH().cust.some(c=>c.mobile===m)){flash('That mobile number already exists.');return render()}PH().cust.push({id:uid(),name:n,mobile:m,consent:!!($('#cuO')||{}).checked,visits:0,spent:0,bal:0});save();render()},
 custRec(id){const c=PH().cust.find(x=>x.id===id),a=toP(val('cr_'+id));if(!(a>0)){flash('Enter an amount.');return render()}c.bal=Math.max(0,c.bal-a);audit('PAYMENT_RECEIVED',c.name+' · '+rp(a));save();flash('Payment received.');render()},
 custAnon(id){const c=PH().cust.find(x=>x.id===id);audit('CUSTOMER_ANONYMIZED',c.name);c.name='Anonymized customer';c.mobile='';c.consent=false;c.anon=true;save();render()},
 phSetSave(){const ph=PH(),b=B();b.name=val('stN').trim()||b.name;ph.gstin=val('stG').trim().toUpperCase();ph.dl=val('stD').trim();ph.addr=val('stA').trim();ph.phone=val('stP').trim();ph.prefix=(val('stX').trim()||'INV').toUpperCase();ph.warn=Math.max(0,+val('stW')||30);{const u=val('stU').trim();if(u&&!UPI_RE.test(u)){flash('That UPI ID looks wrong. It should look like name@bank.');return render()}ph.upi=u}ph.ownerWa=val('stO').replace(/\D/g,'').slice(-10);document.querySelectorAll('[data-rule]').forEach(i=>ph.rules[i.dataset.rule]=i.checked);audit('SETTINGS','Store settings updated');save();flash('Settings saved.');render()},
 askGo(){S.c.aiq=val('aiQ');S.aiId=(S.aiId||0)+1;const a=askAll(S.c.aiq||'');if(aiWillRun(S.c.aiq))aiRun(S.c.aiq,a);else{S.aiA=a;render()}},askEx(q){S.c.aiq=q;S.aiId=(S.aiId||0)+1;const a=askAll(q);if(aiWillRun(q))aiRun(q,a);else{S.aiA=a;render()}}
});
app.addEventListener('input',e=>{if(e.target.id==='bq'){S.c.bq=e.target.value;h($('#bRes'),bRes())}});
app.addEventListener('keydown',e=>{const t=e.target;if(e.key==='Enter'&&t.id==='bq'){e.preventDefault();const v=t.value.trim(),m=PH().meds.find(x=>x.barcode&&cn(x.barcode)===cn(v)&&x.st!=='off');if(m&&cn(v))return phScan(v);const r=PH().meds.find(x=>x.st!=='off'&&avail(x.id)>0&&(x.brand+' '+x.generic).toLowerCase().includes(v.toLowerCase()));if(r&&v)phAdd(r.id)}if(e.key==='Enter'&&t.id==='aiQ')ACT.askGo()});
app.addEventListener('change',e=>{const t=e.target;
 if(t.dataset.pick!==undefined){const l=S.cart.find(x=>x.med===t.dataset.pick);if(l)l.pick=t.value;render()}
 else if(t.dataset.chk!==undefined){S.c[t.dataset.chk]=t.checked;if(t.dataset.amt)S.c.upiokA=t.checked?t.dataset.amt:''}
 else if(t.dataset.pe){const[k,id,f]=t.dataset.pe.split(':');if(!can('editMed'))return;const ph=PH();if(k==='med'){const m=ph.meds.find(x=>x.id===id),o=m.mrp;m.mrp=toP(t.value);audit('PRICE_CHANGE',m.brand+' MRP '+rp(o)+' → '+rp(m.mrp))}else{const b=ph.batches.find(x=>x.id===id),o=b.mrp;b.mrp=toP(t.value);audit('PRICE_CHANGE','Batch '+b.no+' MRP '+rp(o)+' → '+rp(b.mrp))}save();flash('Saved. Change recorded in the audit log.');render()}});

/* ===== retail barcode actions ===== */
function setCode(it,v){v=(v||'').replace(/\s/g,'');if(v===''){it.code='';return 1}if(!/^\d{8,14}$/.test(v)){flash('Barcode must be 8–14 digits.');return 0}if(B().items.some(x=>x!==it&&x.code&&cn(x.code)===cn(v))){flash('That barcode is already used by another item.');return 0}it.code=v;return 1}
const rScanMsg=code=>{const k=cn(code);if(!k)return '';const it=B().items.find(i=>i.code&&cn(i.code)===k);if(!it){const m='No item with barcode '+code;flash(m);render();return m}beep();ACT.add(it.id);return 'Added: '+it.n};
Object.assign(ACT,{scan:rScanMsg,rCam(){camStart(rScanMsg)},
 rGen(id){const b=B(),it=b.items.find(i=>i.id===id);if(it){it.code=genEan(b,b.items);save();flash('Barcode created for '+it.n+'.')}render()},
 rGenAll(){const b=B();let n=0;b.items.forEach(i=>{if(!i.code){i.code=genEan(b,b.items);n++}});save();flash(n?n+' barcode(s) created.':'All items already have barcodes.');render()},
 rScan(id){camStart(code=>{const it=B().items.find(i=>i.id===id);if(!it)return;if(!/^\d{8,14}$/.test(code))return 'Unsupported code '+code;if(B().items.some(x=>x.id!==id&&x.code&&cn(x.code)===cn(code)))return 'That barcode is used by another item.';it.code=code;save();beep();camClose();flash('Barcode saved for '+it.n+'.');render()})},
 rLbl(id){const it=B().items.find(i=>i.id===id);showDoc(labelsHtml([{biz:B().name,name:it.n,code:it.code,price:rs(it.p)}]))},
 rLblAll(){const l=B().items.filter(i=>bcSvg(i.code)).map(i=>({biz:B().name,name:i.n,code:i.code,price:rs(i.p)}));if(!l.length){flash('No drawable barcodes yet.');return render()}showDoc(labelsHtml(l))}});
app.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='scanIn'){e.preventDefault();const v=e.target.value;ACT.scan(v);setTimeout(()=>{const i=$('#scanIn');if(i)i.focus()},0)}});
V.account=()=>h2('Password & account')+`<p class="text-sm text-ink/60 mb-2">Signed in as ${esc(U.name)} (${esc(U.id)})</p>`+securityBox();

/* ===== simple billing, simple inventory, WhatsApp owner reports ===== */
V.phBill=()=>{const ph=PH(),c=cartCalc(),pm=S.c.pm||'CASH',mob=(S.c.cm||'').replace(/\D/g,''),exc=mob.length===10&&ph.cust.find(x=>x.mobile===mob);
 const lines=S.cart.map(l=>{const m=ph.meds.find(x=>x.id===l.med),mine=c.lines.filter(x=>x.med.id===m.id),bats=ph.batches.filter(b=>b.med===m.id&&b.st==='active'&&b.qty>0&&dd(b.exp)>=0).sort((a,b)=>a.exp<b.exp?-1:1);
  return `<div class="py-3 border-t border-black/5 first:border-0"><div class="flex items-center gap-3"><div class="flex-1 min-w-0"><p class="font-semibold">${esc(m.brand)} ${esc(m.strength)} ${needsRx(m)?'<span class="text-[10px] bg-red-100 text-red-700 rounded px-1.5 py-0.5">Rx</span>':''}</p><p class="text-xs text-ink/50">${mine.map(x=>'Batch '+esc(x.bt.no)+' · exp '+fx(x.bt.exp)+' × '+x.qty).join(' · ')}</p></div><div class="flex items-center gap-2"><button data-act="phQty" data-a="${m.id}:-1" class="w-9 h-9 rounded-full bg-mist text-lg" aria-label="Less">−</button><b class="w-7 text-center">${l.qty}</b><button data-act="phQty" data-a="${m.id}:1" class="w-9 h-9 rounded-full bg-mist text-lg" aria-label="More">+</button></div><b class="w-24 text-right">${rp(mine.reduce((a,x)=>a+x.amt,0))}</b><button data-act="phDel" data-a="${m.id}" class="text-ink/40 hover:text-red-600 px-1" aria-label="Remove">✕</button></div>${bats.length>1?`<details class="mt-1 text-xs text-ink/60"><summary class="cursor-pointer">Change batch</summary><select data-pick="${m.id}" aria-label="Batch" class="border border-black/15 rounded-lg px-2 py-1 mt-1 bg-white"><option value="">Automatic (earliest expiry first)</option>${bats.map(b=>`<option value="${b.id}" ${l.pick===b.id?'selected':''}>${esc(b.no)} · exp ${fx(b.exp)} · ${b.qty} left</option>`).join('')}</select></details>`:''}</div>`}).join('');
 const rxbox=c.rx?`<div class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm"><p class="font-semibold text-red-700">Prescription needed</p><p class="text-xs text-red-700/80 mb-2">${can('approve_rx')?'Enter the doctor and patient name.':'Only a pharmacist or manager can complete this bill.'}</p><div class="grid grid-cols-2 gap-2"><input data-c="rxd" value="${esc(S.c.rxd||'')}" placeholder="Doctor name" aria-label="Doctor name" class="${IN}"><input data-c="rxp" value="${esc(S.c.rxp||'')}" placeholder="Patient name" aria-label="Patient name" class="${IN}"></div></div>`:'';
 const pb=[['CASH','💵 Cash'],['UPI','📱 UPI'],['CARD','💳 Card']].map(([k,l])=>`<button data-act="phPm" data-a="${k}" class="rounded-2xl py-3 font-bold ${pm===k&&!['pcash','pupi','pcard','pcredit'].some(x=>S.c[x])?'bg-ink text-white':'bg-white border border-black/15'}">${l}</button>`).join('');
 return h2('Billing')+`<div class="grid xl:grid-cols-[1fr_440px] gap-4"><div><p class="text-xs font-bold tracking-widest text-ink/50 mb-2">1 · FIND MEDICINE</p><div class="flex gap-2 mb-3"><input id="bq" value="${esc(S.c.bq||'')}" placeholder="🔍 Type medicine name, or scan the barcode" aria-label="Search medicine" autocomplete="off" class="${IN} text-lg py-4 flex-1">${bt('camBill','📷','','border border-black/15 bg-white !px-4')}${bt('phVoice','🎤','','border border-black/15 bg-white !px-4')}</div><div id="bRes" class="bg-white rounded-2xl border border-black/5">${bRes()}</div><p id="vMsg" class="text-xs text-ink/60 mt-2">${esc(S.vmsg||'')}</p></div>`
 +`<div class="bg-white rounded-2xl border border-black/5 p-4 h-fit"><p class="text-xs font-bold tracking-widest text-ink/50 mb-2">2 · BILL AND PAYMENT</p>${lines||'<p class="text-sm text-ink/50 py-4">Cart is empty. Search a medicine on the left and tap Add.</p>'}${c.warn.map(w=>`<p class="text-sm text-red-600 mt-1">⛔ ${esc(w)}</p>`).join('')}${c.info.slice(0,2).map(w=>`<p class="text-xs text-orange-700 mt-1">⚠ ${esc(w)}</p>`).join('')}${rxbox}
 <div class="mt-4 flex justify-between items-end"><span class="text-ink/60">Total to pay</span><span class="text-4xl font-extrabold">${rp(c.pay)}</span></div><p class="text-xs text-ink/50 text-right">GST included${c.disc?' · discount '+rp(c.disc):''}</p>
 <div class="mt-3 grid grid-cols-3 gap-2">${pb}</div>
 <details class="mt-3 text-sm"><summary class="cursor-pointer font-semibold text-ink/70">Customer (optional)</summary><div class="grid grid-cols-2 gap-2 mt-2"><input data-c="cm" data-re value="${esc(S.c.cm||'')}" placeholder="Mobile number" aria-label="Customer mobile" class="${IN}"><input data-c="cn" value="${esc(S.c.cn||'')}" placeholder="Name" aria-label="Customer name" class="${IN}"></div>${exc?`<p class="text-xs text-green-700 mt-1">Existing customer: ${esc(exc.name)}${exc.bal>0?' · owes '+rp(exc.bal):''}</p>`:''}<label class="flex items-center gap-2 text-xs text-ink/60 mt-2"><input type="checkbox" data-chk="opt" ${S.c.opt?'checked':''}> Customer agrees to receive the invoice on WhatsApp</label></details>
 <details class="mt-2 text-sm"><summary class="cursor-pointer font-semibold text-ink/70">Discount</summary><div class="mt-2 flex items-center gap-2"><span>₹</span><input data-c="disc" data-re type="number" min="0" value="${esc(S.c.disc||'')}" aria-label="Discount" class="${IN} w-28"></div></details>
 <details class="mt-2 text-sm"><summary class="cursor-pointer font-semibold text-ink/70">Split payment or credit</summary><p class="text-xs text-ink/50 my-2">Leave empty to pay the full amount with the method chosen above. If you type amounts here, they must add up to the total.</p><div class="grid grid-cols-4 gap-2">${[['Cash','pcash'],['UPI','pupi'],['Card','pcard'],['Credit','pcredit']].map(x=>`<label class="text-[11px] font-semibold text-ink/60">${x[0]}<input data-c="${x[1]}" data-re type="number" min="0" step="0.01" value="${esc(S.c[x[1]]||'')}" class="${IN} font-normal"></label>`).join('')}</div></details>
 ${(()=>{const sp=['pcash','pupi','pcard','pcredit'].some(x=>S.c[x]),ua=toP(S.c.pupi)>0?toP(S.c.pupi):(!sp&&pm==='UPI'?c.pay:0);return upiPanel(ph.upi,B().name,ua/100,'Bill '+(ph.seq+1))})()}
 <div class="mt-4 flex gap-2">${bt('phPay','COMPLETE BILL '+rp(c.pay),'','bg-kate text-white hover:bg-ink flex-1 !py-4 text-lg')}${bt('clear','Clear','','border border-black/15')}</div></div></div>`};
const stOf=m=>{const ph=PH(),a=avail(m.id),ne=nearest(m.id),d=ne?dd(ne):999;if(m.st==='off')return['Off','bg-black/10 text-ink/60','off'];if(ph.batches.some(b=>b.med===m.id&&b.qty>0&&dd(b.exp)<0))return['Expired stock','bg-red-100 text-red-700','exp'];if(a<=0)return['Out of stock','bg-red-100 text-red-700','out'];if(a<=m.min)return['Low','bg-orange-100 text-orange-700','low'];if(d<=30)return['Expiring soon','bg-yellow-100 text-yellow-800','soon'];return['OK','bg-green-100 text-green-700','ok']};
V.phStock=()=>{const ph=PH(),f=S.c.sf||'all',q=(S.c.sq||'').toLowerCase(),ed=can('editMed'),canAdd=can('editMed')||can('purchase'),all=ph.meds.map(m=>({m,s:stOf(m)})),cnt=k=>all.filter(x=>x.s[2]===k).length;
 const list=all.filter(x=>(f==='all'||x.s[2]===f)&&(x.m.brand+' '+x.m.generic+' '+(x.m.barcode||'')).toLowerCase().includes(q)).slice(0,100),sm=ph.meds.find(m=>m.id===S.c.msel);
 const chips=[['all','All ('+ph.meds.length+')'],['low','Low stock ('+cnt('low')+')'],['soon','Expiring soon ('+cnt('soon')+')'],['exp','Expired ('+cnt('exp')+')'],['out','Out of stock ('+cnt('out')+')']].map(([k,l])=>`<button data-act="stFlt" data-a="${k}" class="rounded-full px-3 py-1.5 text-sm font-semibold ${f===k?'bg-ink text-white':'bg-white border border-black/15'}">${l}</button>`).join('');
 const form=ed?`<details class="bg-white rounded-2xl border border-black/5 p-4 mb-4" ${ph.meds.length&&!S.c.addm?'':'open'}><summary class="font-bold cursor-pointer">+ Add a new medicine</summary><div class="grid sm:grid-cols-4 gap-2 mt-3">${fi('mB','Medicine name *')}${fi('mR','Price (MRP) ₹ *','number')}<input id="mT" type="number" value="5" aria-label="GST %" placeholder="GST %" class="${IN}">${sel('mC',[['OTC','No prescription needed'],['H','Prescription (Schedule H)'],['H1','Schedule H1'],['X','Schedule X']])}</div><details class="mt-3"><summary class="text-sm font-semibold text-ink/70 cursor-pointer">More details (optional)</summary><div class="grid sm:grid-cols-4 gap-2 mt-2">${fi('mG','Generic / salt')}${fi('mS','Strength e.g. 650mg')}${sel('mF',['Tablet','Capsule','Syrup','Injection','Cream','Ointment','Drops','Powder','Device','Personal care','Other'])}${fi('mP','Pack size')}${fi('mM','Manufacturer')}${fi('mH','HSN code')}${fi('mN','Low-stock alert at (packs)','number')}<div class="flex gap-1">${fi('mBc','Barcode (blank = create)')}${bt('camFill','📷','','border border-black/15 bg-white')}</div></div></details><div class="mt-3 flex flex-wrap gap-2">${bt('medAdd','Add medicine')}${ph.meds.length?'':bt('phSample','Load sample medicines to try KIRO','','border border-black/15 bg-white')}</div><details class="mt-3"><summary class="text-sm font-semibold text-ink/70 cursor-pointer">Import many from CSV</summary><p class="text-xs text-ink/60 my-2">One per line: name, generic, strength, form, pack, manufacturer, schedule (OTC/H/H1/X), hsn, gst, mrp, low-stock level</p><textarea data-c="csv" rows="4" class="${IN} font-mono" aria-label="CSV">${esc(S.c.csv||'')}</textarea><div class="mt-2">${bt('medCsv','Import')}</div></details></details>`:'';
 let det='';if(sm){const bs=ph.batches.filter(b=>b.med===sm.id).sort((a,b)=>a.exp<b.exp?-1:1),mv=ph.moves.filter(x=>x.med===sm.id).slice(0,10),s=stOf(sm);
  det=`<div class="mt-4">`+bx('',`<div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-xl font-extrabold">${esc(sm.brand)} ${esc(sm.strength)}</p><p class="text-sm text-ink/60">${esc(sm.generic)} · ${esc(sm.form)} ${esc(sm.pack)}</p></div><div class="text-right"><p class="text-3xl font-extrabold">${avail(sm.id)}</p><p class="text-xs text-ink/50">packs you can sell</p></div></div><div class="mt-2 flex flex-wrap items-center gap-3"><span class="rounded-full px-3 py-1 text-xs font-semibold ${s[1]}">${s[0]}</span><label class="text-sm">Price ₹ ${ed?`<input data-pe="med:${sm.id}:mrp" type="number" step="0.01" value="${sm.mrp/100}" aria-label="MRP" class="${IN} w-24 inline-block">`:'<b>'+rp(sm.mrp)+'</b>'}</label>${bt('lblMed','Print barcode label','','border border-black/15 text-xs')}${ed?bt('medTog',sm.st==='off'?'Enable':'Disable',sm.id,'border border-black/15 text-xs'):''}</div><div class="mt-2 w-48">${bcSvg(sm.barcode,36)}</div>`
  +(canAdd?`<div class="mt-4 rounded-2xl bg-mist p-4"><p class="font-bold mb-2">Add stock</p><div class="grid sm:grid-cols-5 gap-2">${fi('qaN','Batch no.')}${fi('qaE','Expiry MM/YYYY')}${fi('qaQ','Packs','number')}${fi('qaC','Cost ₹ (optional)','number')}${bt('stockAdd','Add stock')}</div></div>`:'')
  +`<p class="font-bold mt-4 mb-2">Batches</p>`+tb(['Batch','Expiry','Packs','Status',''],bs.map(b=>[esc(b.no),`<span class="${ec(b.exp)}">${fx(b.exp)}</span>`,b.qty,b.st==='quarantine'?'Quarantined':dd(b.exp)<0?'<span class="text-red-600">Expired</span>':'Sellable',can('stockAdj')?bt('expQ',b.st==='quarantine'?'Release':'Quarantine',b.id,'border border-black/15 text-xs'):'']),'No batches yet. Use Add stock above.')
  +(can('stockAdj')&&bs.length?`<details class="mt-3"><summary class="text-sm font-semibold text-ink/70 cursor-pointer">Correct stock count</summary><div class="grid sm:grid-cols-4 gap-2 mt-2">${sel('adB',bs.map(b=>[b.id,b.no+' · '+fx(b.exp)]))}${fi('adQ','Change (+/−) packs','number')}${fi('adR','Reason *')}${bt('batAdj','Save correction')}</div></details>`:'')
  +`<details class="mt-3"><summary class="text-sm font-semibold text-ink/70 cursor-pointer">Stock history</summary><div class="mt-2">${tb(['When','Type','Packs','Note','By'],mv.map(x=>[fT(x.t),x.type,x.qty>0?'+'+x.qty:x.qty,esc(x.ref+(x.reason?' · '+x.reason:'')),esc(x.by)]),'No movements.')}</div></details>`)+`</div>`}
 return h2('Inventory')+`<div class="mb-3 flex flex-wrap gap-2">${chips}</div><div class="mb-3 flex flex-wrap gap-2 items-center"><input data-c="sq" data-re value="${esc(S.c.sq||'')}" placeholder="🔍 Search medicine, salt or barcode, then Enter" aria-label="Search inventory" class="${IN} max-w-md">${bt('lblAll','Print labels','','border border-black/15 bg-white')}</div>`+form
 +tb(['Medicine','In stock','Status','Oldest stock','Price',''],list.map(x=>[`<b>${esc(x.m.brand)} ${esc(x.m.strength)}</b>${needsRx(x.m)?' <span class="text-[10px] bg-red-100 text-red-700 rounded px-1.5">Rx</span>':''}<br><span class="text-xs text-ink/60">${esc(x.m.generic)}</span>`,`<b>${avail(x.m.id)}</b>`,`<span class="rounded-full px-2.5 py-1 text-xs font-semibold ${x.s[1]}">${x.s[0]}</span>`,phAgeTxt(x.m.id),rp(x.m.mrp),bt('medSel',S.c.msel===x.m.id?'Close':'Open',x.m.id,'border border-black/15 text-xs')]),ph.meds.length?'Nothing in this view.':'No medicines yet. Add one above.')+det};
/* WhatsApp owner reports */
const kd=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
const dm=e=>new Date(e).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
const lim=(a,n)=>a.slice(0,n).concat(a.length>n?['…and '+(a.length-n)+' more']:[]);
const expList=(from,to)=>{const ph=PH();return ph.batches.filter(b=>{const d=dd(b.exp);return b.qty>0&&d>=from&&d<=to}).sort((a,b)=>a.exp<b.exp?-1:1).map(b=>({m:ph.meds.find(x=>x.id===b.med)||{brand:'?'},b}))};
function salesStats(from){const ph=PH(),sl=liveSales().filter(s=>s.t>=from),rt=ph.returns.filter(x=>x.t>=from),by={},prod={};let gross=0,mgn=0;sl.forEach(s=>{gross+=s.pay;s.payments.forEach(p=>by[p.m]=(by[p.m]||0)+p.a);s.lines.forEach(l=>{mgn+=mg(l);const q=l.qty-(l.ret||0);if(q>0)prod[l.name]=(prod[l.name]||0)+q})});const ref=rt.reduce((a,x)=>a+x.refund,0);return{n:sl.length,gross,ref,net:gross-ref,by,mgn,top:Object.entries(prod).sort((a,b)=>b[1]-a[1]).slice(0,5)}}
const modes=by=>({CASH:'Cash',UPI:'UPI',CARD:'Card',CREDIT:'Credit'}),mm=0;const modeTxt=by=>['CASH','UPI','CARD','CREDIT'].filter(k=>by[k]).map(k=>({CASH:'Cash',UPI:'UPI',CARD:'Card',CREDIT:'Credit'}[k])+' '+rp(by[k])).join(' · ')||'none';
const lowList=()=>PH().meds.filter(m=>m.st!=='off'&&avail(m.id)<=m.min);
function dailyMsg(){const b=B(),s=salesStats(t0()),tm=expList(1,1),ex=expList(-99999,-1),low=lowList(),tmd=dm(t0()+864e5);
 const L=['*KIRO Daily Report*',b.name+' · '+new Date().toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}),'','*Sales today*','Bills: '+s.n,'Net sales: '+rp(s.net),'By mode: '+modeTxt(s.by)];if(s.ref)L.push('Refunds: '+rp(s.ref));if(can('cost'))L.push('Gross margin: '+rp(s.mgn));if(s.top.length)L.push('Top sellers: '+s.top.map(x=>x[0]+' ×'+x[1]).join(', '));
 L.push('','*Expiring tomorrow ('+tmd+')*',...(tm.length?lim(tm.map(x=>'• '+x.m.brand+' · batch '+x.b.no+' · '+x.b.qty+' packs'),12):['Nothing expires tomorrow ✅']),'','*Expired stock still on shelf*',...(ex.length?lim(ex.map(x=>'• '+x.m.brand+' · batch '+x.b.no+' · '+x.b.qty+' packs'),8):['None ✅']),'','*Low stock*: '+low.length+' medicine'+(low.length===1?'':'s')+(low.length?' – '+low.slice(0,5).map(m=>m.brand).join(', '):''),'','Sent from KIRO');return L.join('\n')}
function weeklyMsg(){const b=B(),s=salesStats(t0()-6*864e5),w=expList(0,7),m30=expList(8,30),ex=expList(-99999,-1),low=lowList(),cost=can('cost'),val=a=>a.reduce((x,y)=>x+y.b.qty*y.b.cost,0);
 const L=['*KIRO Weekly Report*',b.name+' · '+dm(t0()-6*864e5)+' – '+dm(t0()),'','*Sales (last 7 days)*','Bills: '+s.n,'Net sales: '+rp(s.net),'Average bill: '+rp(s.n?s.gross/s.n:0),'By mode: '+modeTxt(s.by)];if(s.ref)L.push('Refunds: '+rp(s.ref));if(cost)L.push('Gross margin: '+rp(s.mgn));if(s.top.length)L.push('Top sellers: '+s.top.map(x=>x[0]+' ×'+x[1]).join(', '));
 L.push('','*Expiring in the next 7 days*',...(w.length?lim(w.map(x=>'• '+x.m.brand+' · batch '+x.b.no+' · '+x.b.qty+' packs · '+dm(x.b.exp)),15):['Nothing expires this week ✅']),...(w.length&&cost?['Value at cost: '+rp(val(w))]:[]),'','*Expiring in 8–30 days*: '+m30.length+' batch'+(m30.length===1?'':'es')+(m30.length&&cost?' · '+rp(val(m30)):''),'*Expired on shelf*: '+ex.length+' batch'+(ex.length===1?'':'es')+(ex.length&&cost?' · '+rp(val(ex)):''),'*Low stock*: '+low.length+' medicine'+(low.length===1?'':'s')+(low.length?' – '+low.slice(0,5).map(m=>m.brand).join(', '):''),'','Sent from KIRO');return L.join('\n')}
const waUrl=m=>{const n=(PH().ownerWa||'').replace(/\D/g,'');return n.length===10?'https://wa.me/91'+n+'?text='+encodeURIComponent(m):''};
V.phWa=()=>{const ph=PH(),d=dailyMsg(),w=weeklyMsg(),has=(ph.ownerWa||'').length===10;
 const card=(k,t,m,last)=>bx(t,`<pre class="whitespace-pre-wrap text-sm bg-[#E7FFDB] rounded-2xl p-4 font-sans max-h-96 overflow-y-auto">${esc(m)}</pre><div class="mt-3 flex flex-wrap items-center gap-2">${has?`<a data-wasent="${k}" target="_blank" rel="noopener" href="${waUrl(m)}" class="bg-green-600 text-white rounded-full px-5 py-2.5 text-sm font-semibold">Send to owner on WhatsApp</a>`:'<span class="text-sm text-orange-700">Add the owner WhatsApp number first.</span>'}${bt('waCopy','Copy message',k,'border border-black/15')}<span class="text-xs text-ink/50">${last?'Last sent: '+last:'Not sent yet'}</span></div>`);
 return h2('WhatsApp reports')+bx('Owner WhatsApp number',`<div class="flex flex-wrap gap-2 items-center"><input id="waN" value="${esc(ph.ownerWa||'')}" placeholder="10-digit mobile number" aria-label="Owner WhatsApp number" class="${IN} max-w-xs">${bt('waSave','Save number')}</div><p class="text-xs text-ink/50 mt-2">The report opens in WhatsApp addressed to this number, and you tap Send. Automatic sending at 10 PM every night runs from the KIRO server version (it needs the WhatsApp Business API set up; see the server README). This page cannot send by itself while it is closed.</p>`)
 +`<div class="mt-4 grid xl:grid-cols-2 gap-4">${card('daily','Daily report · sales and expiring tomorrow',d,ph.lastDaily)}${card('weekly','Weekly report · sales and expiring this week',w,ph.lastWeekly)}</div>`};
Object.assign(ACT,{
 phPm(m){S.c.pm=m;['pcash','pupi','pcard','pcredit'].forEach(k=>S.c[k]='');render()},
 phDel(id){S.cart=S.cart.filter(x=>x.med!==id);render()},
 stFlt(f){S.c.sf=f;render()},
 stockAdd(){if(!(can('editMed')||can('purchase')))return;const ph=PH(),m=ph.meds.find(x=>x.id===S.c.msel),no=val('qaN').trim(),exp=pExp(val('qaE')),qty=Math.trunc(+val('qaQ')),cost=toP(val('qaC'));
  if(!m||!no||!exp||!(qty>0)){flash('Enter batch number, expiry (MM/YYYY) and packs.');return render()}if(dd(exp)<0){flash('That expiry date has already passed.');return render()}
  const ex=ph.batches.find(b=>b.med===m.id&&b.no===no&&b.exp!==exp);if(ex){flash('Batch '+no+' already exists with expiry '+fx(ex.exp)+'.');return render()}
  let b=ph.batches.find(x=>x.med===m.id&&x.no===no&&x.exp===exp&&x.mrp===m.mrp&&x.st!=='quarantine');if(!b){b={id:uid(),med:m.id,no,exp,mrp:m.mrp,cost:cost||m.cost||0,qty:0,st:'active',recv:Date.now(),sup:''};ph.batches.push(b)}else if(cost)b.cost=cost;
  move(b.id,'PURCHASE',qty,'Quick add','Added from Inventory');audit('STOCK_ADDED',m.brand+' batch '+no+' +'+qty);save();flash('Added '+qty+' packs of '+m.brand+'.');render()},
 waSave(){const n=val('waN').replace(/\D/g,'').slice(-10);if(n.length!==10){flash('Enter a 10-digit mobile number.');return render()}PH().ownerWa=n;audit('SETTINGS','Owner WhatsApp number updated');save();flash('Owner number saved.');render()},
 waCopy(k){try{navigator.clipboard.writeText(k==='daily'?dailyMsg():weeklyMsg());flash('Message copied.')}catch(e){flash('Copy is blocked in this browser. Select the text and copy it.')}render()}});
app.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('[data-wasent]');if(a){const ph=PH();if(a.dataset.wasent==='daily')ph.lastDaily=new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),ph.kdDaily=kd();else ph.lastWeekly=new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),ph.kdWeekly=Date.now();audit('REPORT_SENT',a.dataset.wasent+' report opened in WhatsApp');save()}});

/* auth: sign in / create account */
function enter(a){U=a;try{a.lastIn=Date.now();save()}catch(e){}try{localStorage.setItem(SES,a.uid)}catch(e){}closeLogin();openApp()}
const aerr=m=>{const e=$('#aErr');e.textContent=m;e.classList.remove('hidden')};
async function doSignIn(){const id=normId(val('aId')),a=DB.acc.find(x=>x.id===id),w=locked(id);
 if(w)return aerr('Too many wrong attempts. Try again in '+w+' seconds.');
 if(!a||!await chk(a,val('aPw'))){const f=FAIL[id]||(FAIL[id]={n:0,u:0});f.n++;if(f.n>=5)f.u=Date.now()+30000;return aerr('Wrong login or password. Forgot it? Use “Forgot password”.')}
 delete FAIL[id];if(!a.ph.startsWith('v2:')){a.ph=await hp(val('aPw'),a.salt);save()}enter(a)}
async function doSignUp(){const type=val('sType'),bn=val('sBiz').trim(),nm=val('sName').trim(),id=normId(val('sId')),pw=val('sPw');
 if(!bn||!nm||!id)return aerr('Please fill every field.');
 if(!(id.includes('@')||/^\d{10}$/.test(id)))return aerr('Enter a valid email or a 10-digit mobile number.');
 if(!pwOk(pw))return aerr('Password needs 8+ characters with letters and numbers.');
 if(pw!==val('sPw2'))return aerr('The two passwords do not match.');
 if(DB.acc.some(a=>a.id===id))return aerr('This email or mobile is already registered. Please sign in.');
 const bid=uid(),salt=uid(),code=rcGen(),rs=uid();
 DB.biz[bid]={name:bn,type,seq:0,low:5,comm:30,items:BT[type].items.map(x=>({id:uid(),n:x[0],cat:x[1],p:x[2],stock:x[3],...(x[4]?{cost:x[4]}:{})})),sales:[],customers:[],expenses:[],coupons:[],campaigns:[],waste:[],purch:[]};
 if(type==='pharmacy')DB.biz[bid].ph=newPh();else DB.biz[bid].items.forEach(i=>i.code=genEan(DB.biz[bid],DB.biz[bid].items));
 const a={uid:uid(),id,name:nm,salt,ph:await hp(pw,salt),rs,rh:await hp(code.replace(/-/g,''),rs),biz:bid,role:'owner'};DB.acc.push(a);save();showCode(a,code)}
async function doForgot(){const a=DB.acc.find(x=>x.id===normId(val('fId'))),np=val('fPw'),w=a?locked('rc'+a.id):0;
 if(w)return aerr('Too many wrong attempts. Try again in '+w+' seconds.');
 if(!a||!a.rh||a.rh!==await hp(val('fCode').toUpperCase().replace(/[^A-Z0-9]/g,''),a.rs)){if(a){const k='rc'+a.id,f=FAIL[k]||(FAIL[k]={n:0,u:0});f.n++;if(f.n>=5)f.u=Date.now()+30000}return aerr('Login or recovery code is wrong. Staff should ask the owner to reset their password.')}
 if(!pwOk(np))return aerr('New password needs 8+ characters with letters and numbers.');
 if(np!==val('fPw2'))return aerr('The two passwords do not match.');
 a.salt=uid();a.ph=await hp(np,a.salt);const code=rcGen();a.rs=uid();a.rh=await hp(code.replace(/-/g,''),a.rs);save();showCode(a,code)}
function showCode(a,code){h($('#authBox'),`<h2 class="text-3xl font-extrabold tracking-tight">Save your recovery code</h2><p class="mt-2 text-ink/70">If you forget your password, this code is the only way to reset it. Write it down or store it safely. It is shown only once.</p><div class="mt-5 rounded-2xl bg-mist border border-black/10 p-5 text-center text-2xl font-extrabold tracking-widest select-all">${code}</div><button type="button" id="rcCopy" class="mt-3 text-sm font-semibold text-kate">Copy code</button><label class="mt-4 flex gap-2 text-sm"><input type="checkbox" id="rcOk"> I have saved my recovery code</label><p id="aErr" class="hidden mt-3 text-sm text-red-600" role="alert"></p><button type="button" id="aGo" class="mt-4 w-full bg-ink text-white font-semibold py-3.5 rounded-full hover:bg-kate transition">Continue</button>`);
 $('#rcCopy').onclick=()=>{try{navigator.clipboard.writeText(code);$('#rcCopy').textContent='Copied ✓'}catch(e){}};
 $('#aGo').onclick=()=>{if(!$('#rcOk').checked)return aerr('Tick the box after saving your code.');enter(a)}}
function meterUpdate(p){const sc=pwScore(p),c=['#ef4444','#f97316','#eab308','#22c55e','#16a34a'],t=['Too weak','Weak','Fair','Good','Strong'];$('#pwBar').style.width=p?(sc+1)*20+'%':'0';$('#pwBar').style.background=c[sc];$('#pwTxt').textContent=p?t[sc]+(pwOk(p)?'':' · needs 8+ characters with letters and numbers'):'Use 8+ characters with letters and numbers.'}
function setMode(m){const su=m==='signup',fg=m==='forgot';
 const F=(id,ph,t,ac)=>`<input id="${id}" type="${t||'text'}" placeholder="${ph}" aria-label="${ph}" autocomplete="${ac||'off'}" class="w-full border border-black/15 rounded-xl px-4 py-3">`;
 const PW=(id,ph,ac)=>`<div class="relative"><input id="${id}" type="password" placeholder="${ph}" aria-label="${ph}" autocomplete="${ac}" class="w-full border border-black/15 rounded-xl pl-4 pr-16 py-3"><button type="button" data-eye class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink/60" aria-label="Show or hide password">Show</button></div>`;
 const meter='<div class="h-1.5 rounded-full bg-black/10"><div id="pwBar" class="h-1.5 rounded-full transition-all" style="width:0"></div></div><p id="pwTxt" class="text-xs text-ink/60 -mt-1">Use 8+ characters with letters and numbers.</p>';
 const err='<p id="aErr" class="hidden text-sm text-red-600" role="alert"></p>',go=t=>`<button type="button" id="aGo" class="w-full bg-ink text-white font-semibold py-3.5 rounded-full hover:bg-kate transition">${t}</button>`;
 let b;
 if(su)b=`<h2 class="text-3xl font-extrabold tracking-tight">Create your KIRO account</h2><p class="mt-2 text-ink/70">KIRO sets up the right tools for your business.</p><div class="mt-6 space-y-3"><label class="block text-sm font-semibold">What type of business do you operate?<select id="sType" class="mt-1.5 w-full border border-black/15 rounded-xl px-4 py-3 font-normal">${Object.entries(BT).sort((a,b)=>(b[0]==='pharmacy')-(a[0]==='pharmacy')).map(([k,v])=>`<option value="${k}">${v.i} ${v.n}</option>`).join('')}</select></label>${F('sBiz','Business name')}${F('sName','Your name','text','name')}${F('sId','Email or 10-digit mobile','text','username')}${PW('sPw','Create password','new-password')}${meter}${PW('sPw2','Confirm password','new-password')}${err}${go('Create account')}</div><p class="mt-5 text-sm text-ink/70">Already have an account? <button type="button" data-m="signin" class="text-kate font-semibold">Sign in</button></p>`;
 else if(fg)b=`<h2 class="text-3xl font-extrabold tracking-tight">Reset your password</h2><p class="mt-2 text-ink/70">Enter the recovery code you saved when you created your account.</p><div class="mt-6 space-y-3">${F('fId','Email, mobile or username','text','username')}${F('fCode','Recovery code (XXXX-XXXX-XXXX)')}${PW('fPw','New password','new-password')}${meter}${PW('fPw2','Confirm new password','new-password')}${err}${go('Reset password')}</div><p class="mt-5 text-sm"><button type="button" data-m="signin" class="text-kate font-semibold">← Back to sign in</button></p>`;
 else b=`<h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight">Welcome back.</h2><p class="mt-2 text-ink/70">Sign in to run your business from one place.</p><div class="mt-6 space-y-3">${F('aId','Email, mobile or username','text','username')}${PW('aPw','Password','current-password')}<div class="text-right"><button type="button" data-m="forgot" class="text-sm text-kate font-semibold">Forgot password?</button></div>${err}${go('Sign In')}</div><p class="mt-5 text-sm text-ink/70">New to KIRO? <button type="button" data-m="signup" class="text-kate font-semibold">Create an account</button></p>`;
 h($('#authBox'),b+'<p class="mt-6 text-xs text-ink/50">Prototype note: accounts and business data are saved in this browser only. A server database is needed for multi-device use.</p>');
 $('#aGo').onclick=su?doSignUp:fg?doForgot:doSignIn;
 const bx2=$('#authBox');
 bx2.querySelectorAll('input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')(su?doSignUp:fg?doForgot:doSignIn)()}));
 bx2.querySelectorAll('[data-m]').forEach(x=>x.onclick=()=>setMode(x.dataset.m));
 bx2.querySelectorAll('[data-eye]').forEach(x=>x.onclick=()=>{const i=x.previousElementSibling,sh=i.type==='password';i.type=sh?'text':'password';x.textContent=sh?'Hide':'Show'});
 const pw=$('#sPw')||$('#fPw');if(pw)pw.addEventListener('input',()=>meterUpdate(pw.value))}
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a');if(a&&a.textContent.trim()==='Get Started'){e.preventDefault();if(U){openApp();return}openLogin();setMode('signup')}});

/* ---------- PAGES / ROUTER ---------- */
const PF={'kiro-pos':['Bill on desktop, tablet or mobile','Screens shaped by your business: tables, stylists, barcodes, serial numbers','UPI, cards and cash','Receipts by print, WhatsApp or SMS'],
 'kiro-business':['Orders, staff and expenses in one dashboard','Accounts and GST-ready reports','Owner and supervisor approvals','Multi-store view'],
 'kiro-inventory':['Barcode, SKU and variants','Purchase orders and suppliers','Ingredient and recipe tracking','Low-stock alerts'],
 'kiro-payments':['UPI, cards and cash reconciled','Daily settlement reports','Refunds and split bills','Payment links'],
 'kiro-marketing':['Segments built from POS data','WhatsApp, SMS and email','Coupons and loyalty','Win-back campaigns'],
 'kiro-ai':['Ask questions in plain language','Reorder and pricing suggestions','Campaign drafts','Daily business summary'],
 'kiro-website':['Website generated from your catalog','Online ordering and appointments','Prices sync automatically','Gallery, reviews, hours and location']};
const RES=[['📘','Guides','Step-by-step setup guides for each business type.'],['❓','Help Centre','Answers to common questions about billing and stock.'],['📝','Blog','Ideas for running and growing a small business.'],['🎥','Webinars','Live walkthroughs of KIRO for your industry.'],['🆕','What’s New','Product updates and releases.'],['🤝','Partners','Accountants and consultants who work with KIRO.']];
const grid=(a,c='sm:grid-cols-2 lg:grid-cols-3')=>`<div class="grid ${c} gap-5">${a.join('')}</div>`;
const cardA=(href,ico,t,d)=>`<a href="${href}" class="card block rounded-3xl border border-black/10 bg-white p-6"><div class="text-3xl">${ico}</div><h3 class="mt-3 font-bold text-lg">${t}</h3><p class="mt-1 text-sm text-ink/70">${d}</p><span class="mt-3 inline-block text-sm font-semibold text-kate">Open →</span></a>`;
const sec=(t,b)=>`<h2 class="text-2xl font-extrabold mt-12 mb-5 first:mt-0">${t}</h2>${b}`;
const caps=a=>`<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">${a.map(x=>`<div class="flex gap-2 bg-mist rounded-xl p-3"><span class="text-kate">✓</span>${x}</div>`).join('')}</div>`;
const crumbs=a=>`<a href="#" class="hover:text-kate">Home</a>`+a.map(x=>` / ${x[1]?`<a href="${x[1]}" class="hover:text-kate">${x[0]}</a>`:x[0]}`).join('');
function shell(cr,kick,title,sub,body){
 document.title=title+' — KIRO';
 return `<section class="bg-mist"><div class="max-w-7xl mx-auto px-5 py-14"><p class="text-sm text-ink/60">${crumbs(cr)}</p><p class="mt-5 text-kate font-bold text-xs tracking-widest">${kick}</p><h1 class="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl">${title}</h1><p class="mt-4 text-lg text-ink/70 max-w-2xl">${sub}</p><div class="mt-7 flex flex-wrap gap-3"><a href="#start" class="bg-kate text-white font-semibold px-6 py-3 rounded-full hover:bg-ink transition">Get Started</a><a href="#" data-signin class="border border-ink/20 font-semibold px-6 py-3 rounded-full hover:bg-white transition">Sign In</a></div></div></section><div class="max-w-7xl mx-auto px-5 py-14">${body}</div><section class="bg-ink text-white"><div class="max-w-7xl mx-auto px-5 py-14 flex flex-wrap items-center justify-between gap-4"><h2 class="text-2xl font-extrabold">Ready to run your business on KIRO?</h2><a href="#start" class="bg-kate font-semibold px-6 py-3 rounded-full">Get Started</a></div></section>`;
}
function build(hsh){
 const [r,a,b]=hsh.slice(2).split('/');
 if(r==='category'&&CATS[a]){const c=CATS[a];
  return shell([[c.n]],'BUSINESS TYPES',c.n,c.d,sec('Business types',grid(c.t.map(t=>cardA(`#/type/${a}/${sl(t)}`,c.i,t,`KIRO set up for ${t.toLowerCase()}.`))))+sec('Capabilities',caps(c.c)))}
 if(r==='type'&&CATS[a]){const c=CATS[a],t=c.t.find(x=>sl(x)===b);if(t){
  return shell([[c.n,'#/category/'+a],[t]],c.n.toUpperCase(),'KIRO for '+t,`Tell KIRO you run ${t.toLowerCase()} and it switches on the tools that matter, with nothing extra to set up.`,
   sec('How it works',grid([['1','Choose your business type',`Select “${t}” when you sign up.`],['2','KIRO configures itself','Menus, screens and reports are enabled automatically.'],['3','Start selling','Bill, track stock and reach customers from one place.']].map(x=>`<div class="rounded-3xl border border-black/10 p-6"><div class="w-9 h-9 rounded-full bg-kate text-white grid place-items-center font-bold">${x[0]}</div><h3 class="mt-3 font-bold">${x[1]}</h3><p class="text-sm text-ink/70 mt-1">${x[2]}</p></div>`)))+sec('What you get',caps(c.c))+sec('Related business types',`<div class="flex flex-wrap gap-2">${lchips(TYPES.filter(x=>x.k===a&&x.s!==b))}</div>`))}}
 if(r==='all')return shell([['All Business Types']],'BUSINESS TYPES','All Business Types','Find your industry. The same platform supports hundreds of future categories.',`<input id="pq" placeholder="Search industries…" aria-label="Search industries" class="w-full max-w-md border border-black/15 rounded-xl px-4 py-3 mb-6"><div id="pg" class="flex flex-wrap gap-2">${lchips(TYPES)}</div>`);
 if(r==='products')return shell([['Products']],'PRODUCTS','One connected platform','Every KIRO product runs on the same business data.',grid(P.map(x=>cardA('#/product/'+sl(x[1]),x[0],x[1],x[2]))));
 if(r==='product'&&PF[a]){const x=P.find(y=>sl(y[1])===a);return shell([['Products','#/products'],[x[1]]],'PRODUCT',x[1],x[2],sec('What it does',caps(PF[a])))}
 if(r==='solutions')return shell([['Solutions']],'SOLUTIONS','Solutions by business type','Pick your industry to see how KIRO fits.',grid(Object.entries(CATS).map(([k,c])=>cardA('#/category/'+k,c.i,c.n,c.d)),'sm:grid-cols-2'));
 if(r==='marketing')return shell([['KIRO Marketing']],'KIRO MARKETING','Turn Every Sale Into Your Next Customer.','KIRO Marketing works directly from your POS data.',sec('From sale to repeat sale',`<ol class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">${['Sale','Customer data','Segment','KIRO AI','Campaign','Customer','Repeat sale'].map((x,i)=>`<li class="rounded-2xl p-4 text-center text-sm font-bold ${i===3?'bg-kate text-white':'bg-mist'}">${x}</li>`).join('')}</ol>`)+sec('Features',caps(['Customer segmentation','Campaigns','Offers','Coupons','Loyalty','Customer win-back','Repeat purchase campaigns','Birthday offers','WhatsApp','SMS','Email','Customer reminders','Marketing analytics','AI-generated campaigns'])));
 if(r==='ai')return shell([['KIRO AI']],'KIRO AI','A business assistant, not just a chatbot.','Ask about sales, stock, customers, expenses, profit, staff and products.',sec('Try asking',grid(Object.entries(AI).map(([q,an])=>`<div class="rounded-3xl border border-black/10 p-6"><p class="font-bold">${q}</p><p class="mt-3 text-sm bg-mist rounded-xl p-3">✦ ${an}</p></div>`))));
 if(r==='pricing')return shell([['Pricing']],'PRICING','Simple plans that grow with you','Sample pricing for this prototype. Final plans will be announced.',grid([['Starter','₹499 / month','One store, POS, basic reports'],['Growth','₹1,499 / month','Inventory, marketing, KIRO AI'],['Scale','Custom','Multi-store, ERP accounts, priority support']].map((x,i)=>`<div class="rounded-3xl border ${i===1?'border-kate shadow-xl':'border-black/10'} p-6"><h3 class="font-bold text-lg">${x[0]}</h3><p class="mt-2 text-3xl font-extrabold">${x[1]}</p><p class="mt-2 text-sm text-ink/70">${x[2]}</p><a href="#start" class="mt-5 block text-center bg-ink text-white rounded-full py-2.5 font-semibold">Get Started</a></div>`)));
 if(r==='resources')return shell([['Resources']],'RESOURCES','Resources','Learn, get help and stay up to date.',grid(RES.map(x=>cardA('#/resource/'+sl(x[1]),x[0],x[1],x[2]))));
 if(r==='resource'){const x=RES.find(y=>sl(y[1])===a);if(x)return shell([['Resources','#/resources'],[x[1]]],'RESOURCES',x[1],x[2],`<p class="text-ink/70">This section is on the KIRO roadmap. Content will appear here soon.</p>`)}
 return shell([['Page not found']],'404','Page not found','That page does not exist yet.','<a href="#" class="text-kate font-semibold">← Back to home</a>');
}
function route(){
 const hsh=location.hash,pg=$('#page'),home=$('#home');document.querySelector('footer').classList.toggle('hidden',!hsh.startsWith('#/'));
 setMega(false);mob.classList.add('hidden');bg.setAttribute('aria-expanded','false');bg.textContent='☰';
 if(!hsh.startsWith('#/')){pg.classList.add('hidden');home.classList.remove('hidden');document.title='KIRO — Business Operating System for MSMEs';
  const el=hsh.length>1&&document.getElementById(hsh.slice(1));if(el)el.scrollIntoView();else window.scrollTo(0,0);return}
 h(pg,`<div class="fade">${build(hsh)}</div>`);
 pg.classList.remove('hidden');home.classList.add('hidden');window.scrollTo(0,0);
 pg.querySelectorAll('[data-signin]').forEach(a=>a.onclick=openLogin);
 const pq=$('#pq');if(pq)pq.oninput=()=>h($('#pg'),lchips(TYPES.filter(t=>t.n.toLowerCase().includes(pq.value.toLowerCase()))));
}
mega.addEventListener('click',e=>{if(e.target.closest('a'))setMega(false)});
mob.addEventListener('click',e=>{if(e.target.closest('a')){mob.classList.add('hidden');bg.textContent='☰'}});
addEventListener('hashchange',route);route();

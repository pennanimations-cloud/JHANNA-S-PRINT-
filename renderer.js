const KEY = "tagasulat_state_v1";
const seed = {
  session: null,
  sessions: [],
  products: [
    {id:"P001", sku:"A-101", name:"Pink Mystery Box", price:29},
    {id:"P002", sku:"B-202", name:"Gold Charm Set", price:19},
    {id:"P003", sku:"C-303", name:"Surprise Bundle", price:39}
  ],
  buyers: {},
  blacklist: [],
  joy: [],
  keep: [],
  feed: []
};

let state = JSON.parse(localStorage.getItem(KEY) || "null") || structuredClone(seed);
let currentView = "live";

function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function money(n){ return "SAR " + Number(n||0).toFixed(2); }
function toast(msg){ const el=document.getElementById("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),1800); }
function titleFor(v){ return ({live:"Live Session",buyers:"Buyer Board",products:"Products",keep:"Keep Items",blacklist:"Blacklist",joy:"Joy Miner",history:"Session History",settings:"Settings"})[v]; }

function render(){
  document.getElementById("pageTitle").textContent=titleFor(currentView);
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
  document.getElementById("content").innerHTML = views[currentView]();
  bind();
}

function newSession(){
  if(state.session) finishSession();
  state.session={id:"S"+Date.now(),startedAt:new Date().toISOString(),status:"LIVE",orders:0,total:0};
  state.feed=[]; save(); render(); toast("New live session started");
}
function finishSession(){
  if(!state.session) return;
  state.session.status="FINISHED"; state.session.endedAt=new Date().toISOString();
  state.sessions.unshift(state.session); state.session=null; save();
}
function addFeed(buyer, text, productId, qty=1){
  const product=state.products.find(p=>p.id===productId) || state.products[0];
  if(!state.session) newSession();
  const row={id:"F"+Date.now()+Math.random(),time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),buyer,text,productId:product.id,product:product.name,qty};
  state.feed.unshift(row);
  const b=state.buyers[buyer] ||= {name:buyer,orders:0,total:0,lastSeen:new Date().toISOString()};
  b.orders+=qty; b.total+=product.price*qty; b.lastSeen=new Date().toISOString();
  state.session.orders+=qty; state.session.total+=product.price*qty;
  save(); render();
}
function printOrder(row){
  const html=`<html><style>body{font-family:Arial;width:72mm;margin:4mm;font-size:12px}h2{margin:0 0 8px}.line{border-top:1px dashed #000;margin:8px 0;padding-top:8px}</style><h2>TAGASULAT</h2><div>Buyer: <b>${esc(row.buyer)}</b></div><div class="line">Item: <b>${esc(row.product)}</b><br>Qty: ${row.qty}</div><div class="line">Session: ${esc(state.session?.id||"")}</div><div>Printed: ${new Date().toLocaleString()}</div></html>`;
  if(window.tagasulat?.printLabel) {
    window.tagasulat.printLabel(html).then(r=>toast(r.success?"Sent to printer":"Print cancelled"));
  } else {
    const w = window.open("", "_blank");
    if (w) { w.document.write(html + "<script>window.onload=()=>window.print()<\\/script>"); w.document.close(); }
    else toast("Allow pop-ups to print");
  }
}

const views={
live:()=>`
  <div class="hero">
    <h2>${state.session?"Live session is running":"Ready for your next live"}</h2>
    <p>${state.session?"Orders are being stored locally on this PC. You can continue recording even if the internet/server connection drops.":"Start a session to begin capturing buyers. Demo Feed lets you test the workflow before connecting TikTok."}</p>
    ${state.session?`<button class="secondary" id="finishBtn">Finish Session</button>`:`<button class="primary" id="startBtn">Start Live Session</button>`}
  </div>
  <div class="card">
  <h2>TikTok LIVE Checker</h2>
  <div class="form">
    <label>TikTok Username
      <input id="tiktokUsername" placeholder="@username">
    </label>
    <button class="primary" id="checkTikTokBtn">Check LIVE</button>
  </div>
  <div id="tiktokLiveResult" class="notice">Enter a TikTok username to check.</div>
</div>
  <div class="grid three">
    <div class="card"><div class="muted">Orders</div><div class="metric">${state.session?.orders||0}</div><span class="pill green">Local</span></div>
    <div class="card"><div class="muted">Live value</div><div class="metric">${money(state.session?.total||0)}</div><span class="pill pink">SAR</span></div>
    <div class="card"><div class="muted">Buyers</div><div class="metric">${Object.keys(state.buyers).length}</div><span class="pill amber">Tracked</span></div>
  </div>
  <div class="grid two section-gap">
    <div class="card">
      <div class="live-head"><h2>Buyer feed</h2><span class="live-dot">● ${state.session?"LIVE":"OFFLINE"}</span></div>
      <div class="feed">${state.feed.length?state.feed.map(r=>`<div class="feed-row"><div class="buyer">${esc(r.buyer)}</div><div class="comment">${esc(r.text)}</div><div class="item">${esc(r.product)}</div><div class="pin">PIN ×${r.qty}</div></div>`).join(""):`<div class="empty">No buyer activity yet. Run Demo Feed to test.</div>`}</div>
    </div>
    <div class="card">
      <h2>Manual capture</h2>
      <div class="notice">This MVP keeps the capture engine separate from TikTok. Once your approved TikTok integration is available, it can feed buyer events into the same processor.</div>
      <div class="form section-gap">
        <label>Buyer name<input id="buyerInput" placeholder="@buyername"></label>
        <label>Buyer message<input id="commentInput" placeholder="e.g. PIN A-101 x2"></label>
        <label>Item<select id="productInput">${state.products.map(p=>`<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`).join("")}</select></label>
        <label>Quantity<input id="qtyInput" type="number" min="1" value="1"></label>
        <button class="primary" id="captureBtn">Capture Buyer Pin</button>
      </div>
    </div>
  </div>`,

buyers:()=>`
  <div class="card"><div class="statline"><h2>Buyer Board</h2><span class="pill green">${Object.keys(state.buyers).length} buyers</span></div>
  ${Object.keys(state.buyers).length?`<table class="table"><thead><tr><th>Buyer</th><th>Orders</th><th>Value</th><th>Last Seen</th><th></th></tr></thead><tbody>${Object.values(state.buyers).sort((a,b)=>b.total-a.total).map(b=>`<tr><td><b>${esc(b.name)}</b></td><td>${b.orders}</td><td>${money(b.total)}</td><td>${new Date(b.lastSeen).toLocaleString()}</td><td><button class="secondary small" data-black="${esc(b.name)}">Blacklist</button></td></tr>`).join("")}</tbody></table>`:`<div class="empty">Buyer records appear here during live sessions.</div>`}</div>`,

products:()=>`
  <div class="grid two"><div class="card"><h2>Product catalog</h2><table class="table"><thead><tr><th>SKU</th><th>Item</th><th>Price</th></tr></thead><tbody>${state.products.map(p=>`<tr><td>${p.sku}</td><td><b>${esc(p.name)}</b></td><td>${money(p.price)}</td></tr>`).join("")}</tbody></table></div>
  <div class="card"><h2>Add product</h2><div class="form"><label>SKU<input id="sku" placeholder="A-404"></label><label>Name<input id="pname" placeholder="New item"></label><label>Price<input id="price" type="number" step=".01" placeholder="25"></label><button class="primary" id="addProduct">Add Product</button></div></div></div>`,

keep:()=>`<div class="card"><h2>Keep Items</h2><div class="notice">Reserve items for a buyer so they can be consolidated later.</div><div class="form section-gap"><label>Buyer<input id="keepBuyer" placeholder="@buyername"></label><label>Item<select id="keepProduct">${state.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label><button class="primary" id="addKeep">Keep Item</button></div><div class="section-gap">${state.keep.length?state.keep.map((k,i)=>`<div class="feed-row"><div class="buyer">${esc(k.buyer)}</div><div>${esc(k.product)}</div><div>${new Date(k.at).toLocaleString()}</div><button class="secondary small" data-remove-keep="${i}">Release</button></div>`).join(""):`<div class="empty">No kept items.</div>`}</div></div>`,

blacklist:()=>`<div class="grid two"><div class="card"><h2>Blacklisted Buyers</h2>${state.blacklist.length?state.blacklist.map((b,i)=>`<div class="feed-row"><div class="buyer">${esc(b)}</div><div></div><button class="secondary small" data-remove-black="${i}">Remove</button></div>`).join(""):`<div class="empty">No blacklisted buyers.</div>`}</div><div class="card"><h2>Add to blacklist</h2><div class="form"><label>Buyer<input id="blackInput" placeholder="@buyername"></label><button class="danger" id="addBlack">Blacklist Buyer</button></div></div></div>`,

joy:()=>`<div class="grid two"><div class="card"><h2>Joy Miner Management</h2><div class="notice">Use this list for buyers who need special handling, review, or follow-up.</div><div class="form section-gap"><label>Buyer<input id="joyBuyer" placeholder="@buyername"></label><label>Note<input id="joyNote" placeholder="Reason / note"></label><button class="primary" id="addJoy">Add Joy Miner</button></div></div><div class="card"><h2>Joy Miners</h2>${state.joy.length?state.joy.map((j,i)=>`<div class="feed-row"><div class="buyer">${esc(j.buyer)}</div><div>${esc(j.note)}</div><button class="secondary small" data-remove-joy="${i}">Remove</button></div>`).join(""):`<div class="empty">No Joy Miners added.</div>`}</div></div>`,

history:()=>`<div class="card"><h2>Session History</h2>${state.sessions.length?`<table class="table"><thead><tr><th>Session</th><th>Started</th><th>Ended</th><th>Orders</th><th>Value</th></tr></thead><tbody>${state.sessions.map(s=>`<tr><td><b>${s.id}</b></td><td>${new Date(s.startedAt).toLocaleString()}</td><td>${s.endedAt?new Date(s.endedAt).toLocaleString():"—"}</td><td>${s.orders}</td><td>${money(s.total)}</td></tr>`).join("")}</tbody></table>`:`<div class="empty">Finished sessions will appear here.</div>`}</div>`,

settings:()=>`<div class="grid two"><div class="card"><h2>TikTok Connector</h2><div class="notice">TikTok access is intentionally isolated from the order engine. Configure an approved TikTok developer app and credentials before enabling production capture.</div><div class="section-gap"><span class="pill amber">Connector: NOT CONFIGURED</span></div><p class="muted">The current MVP uses manual/demo events. This prevents the app from depending on an undocumented LIVE endpoint.</p></div><div class="card"><h2>Data</h2><p class="muted">All demo/session data is stored locally in this app.</p><div class="actions"><button class="secondary" id="exportBtn">Export Backup</button><button class="danger" id="clearBtn">Clear Local Data</button></div></div></div>`
};

function bind(){
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;render();});
  document.getElementById("startBtn")?.addEventListener("click",newSession);
  document.getElementById("finishBtn")?.addEventListener("click",()=>{finishSession();render();toast("Session finished");});
  document.getElementById("captureBtn")?.addEventListener("click",()=>{
    const buyer=document.getElementById("buyerInput").value.trim()||"@guest";
    const text=document.getElementById("commentInput").value.trim()||"Manual buyer pin";
    const product=document.getElementById("productInput").value;
    const qty=Math.max(1,Number(document.getElementById("qtyInput").value)||1);
    if(state.blacklist.includes(buyer)) return toast("Buyer is blacklisted");
    addFeed(buyer,text,product,qty); toast("Buyer pin captured");
  });
  document.getElementById("demoBtn").onclick=()=>{
    if(!state.session) newSession();
    const names=["@sarah","@maria","@lina","@jane"];
    const msgs=["PIN please","A-101 x1","I want this","Keep one for me"];
    let i=0; const timer=setInterval(()=>{ addFeed(names[i%4],msgs[i%4],state.products[i%3].id,(i%3)+1); i++; if(i>=8) clearInterval(timer); },500);
  };
  document.getElementById("newSessionBtn").onclick=newSession;
  document.getElementById("addProduct")?.addEventListener("click",()=>{
    const sku=document.getElementById("sku").value.trim(), name=document.getElementById("pname").value.trim(), price=Number(document.getElementById("price").value);
    if(!sku||!name||!price) return toast("Complete all product fields");
    state.products.push({id:"P"+Date.now(),sku,name,price});save();render();toast("Product added");
  });
  document.getElementById("addKeep")?.addEventListener("click",()=>{
    const buyer=document.getElementById("keepBuyer").value.trim(), p=state.products.find(x=>x.id===document.getElementById("keepProduct").value);
    if(!buyer||!p)return toast("Enter buyer and item"); state.keep.unshift({buyer,product:p.name,at:new Date().toISOString()});save();render();
  });
  document.querySelectorAll("[data-remove-keep]").forEach(b=>b.onclick=()=>{state.keep.splice(Number(b.dataset.removeKeep),1);save();render()});
  document.getElementById("addBlack")?.addEventListener("click",()=>{const b=document.getElementById("blackInput").value.trim();if(b&&!state.blacklist.includes(b)){state.blacklist.push(b);save();render();toast("Buyer blacklisted")}});
  document.querySelectorAll("[data-remove-black]").forEach(b=>b.onclick=()=>{state.blacklist.splice(Number(b.dataset.removeBlack),1);save();render()});
  document.querySelectorAll("[data-black]").forEach(b=>b.onclick=()=>{if(!state.blacklist.includes(b.dataset.black))state.blacklist.push(b.dataset.black);save();render();toast("Buyer blacklisted")});
  document.getElementById("addJoy")?.addEventListener("click",()=>{const buyer=document.getElementById("joyBuyer").value.trim(),note=document.getElementById("joyNote").value.trim();if(buyer){state.joy.unshift({buyer,note});save();render()}});
  document.querySelectorAll("[data-remove-joy]").forEach(b=>b.onclick=()=>{state.joy.splice(Number(b.dataset.removeJoy),1);save();render()});
  document.getElementById("exportBtn")?.addEventListener("click",async()=>{
    const json = JSON.stringify(state,null,2);
    if(window.tagasulat?.exportData) {
      const r=await window.tagasulat.exportData(json); if(!r.canceled)toast("Backup exported");
    } else {
      const blob=new Blob([json],{type:"application/json"});
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="tagasulat-backup.json"; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast("Backup downloaded");
    }
  });document.getElementById("checkTikTokBtn")?.addEventListener("click",async()=>{
  const username=document.getElementById("tiktokUsername").value.trim().replace(/^@/,"");
  const result=document.getElementById("tiktokLiveResult");

  if(!username){
    result.textContent="Please enter a TikTok username.";
    return;
  }

  result.textContent="Checking LIVE status...";

  try{
    const response=await fetch(
      "https://tagasulat-tiktok.pennanimations.workers.dev/live?username="+encodeURIComponent(username)
    );

    const data=await response.json();

    if(data.ok && data.live){
      result.textContent="🟢 LIVE — @"+username+" is currently LIVE.";
    }else if(data.ok){
      result.textContent="🔴 OFFLINE — @"+username+" is not currently LIVE.";
    }else{
      result.textContent="⚠️ Unable to check this username.";
    }
  }catch(error){
    result.textContent="⚠️ Connection error. Please try again.";
  }
});
  document.getElementById("clearBtn")?.addEventListener("click",()=>{if(confirm("Delete all local Tagasulat data?")){state=structuredClone(seed);save();render();}});
}
render();

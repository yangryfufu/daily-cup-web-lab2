/* 原生JavaScript：页面交互与浏览器本地存储；不调用任何外部接口。 */
(() => {
  'use strict';
  const DATA = window.CUP_DATA;
  const KEY = 'daily-cup-lab-v1';
  const page = document.body.dataset.page;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {bell:'<path d="M6 9a6 6 0 0 1 12 0v7l2 2H4l2-2V9Zm4 12h4"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 4 4L20 5"/>',arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'};
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.arrow}</svg>`;
  const safeImage = src => typeof src === 'string' && (/^res\/cup-(amber|rose|matcha|orange|coffee|berry)\.svg$/.test(src) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) ? src : 'res/cup-amber.svg';
  const brand = id => DATA.brands.find(b => b.id === id);
  const release = id => DATA.releases.find(r => r.id === id);
  const clone = v => JSON.parse(JSON.stringify(v));
  const defaults = () => ({version:1, follows:[], reminders:[], records:clone(DATA.records), leadMinutes:15});
  const calendar = {year:2026,month:9,day:null,filter:'all'};
  let brandFilter = 'all', selectedBrand = null, journalView = 'grid', imageDraft = null, processingImage = false, toastTimer;
  let badStorage = false;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.records) || !Array.isArray(data.follows) || !Array.isArray(data.reminders)) throw new Error('Invalid data');
      const state = defaults();
      state.follows = [...new Set(data.follows.filter(id => brand(id)))];
      state.reminders = [...new Set(data.reminders.filter(id => release(id)))];
      state.leadMinutes = [0,15,60,1440].includes(data.leadMinutes) ? data.leadMinutes : 15;
      state.records = data.records.filter(r => r && typeof r.id === 'string' && typeof r.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date || '')).map(r => ({id:r.id.slice(0,100),title:r.title.slice(0,40),brand:String(r.brand || '').slice(0,24),date:r.date,mood:['开心','治愈','满足','平静'].includes(r.mood) ? r.mood : '开心',note:String(r.note || '').slice(0,300),image:safeImage(r.image),demo:r.demo === true}));
      return state;
    } catch (_) { badStorage = true; return defaults(); }
  }
  let state = load();

  function toast(message) {
    clearTimeout(toastTimer);
    const el = $('#toast');
    el.textContent = message; el.hidden = false;
    toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
  }
  function save(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); state = next; return true; }
    catch (_) { toast('浏览器未能保存，可能是存储已满或权限受限。请先导出备份或减少照片。'); return false; }
  }
  function update(mutator) {
    const next = clone(state); mutator(next);
    if (!save(next)) return false;
    refresh(); return true;
  }
  function count() {
    $$('[data-follow-count]').forEach(el => el.textContent = state.follows.length);
    $$('[data-reminder-count]').forEach(el => el.textContent = state.reminders.length);
  }
  function empty(title, copy, href = '', label = '') {
    return `<div class="empty-state"><div class="empty-mark">☕</div><h3>${esc(title)}</h3><p>${esc(copy)}</p>${href ? `<a class="button secondary" href="${esc(href)}">${esc(label)} ${icon('arrow')}</a>` : ''}</div>`;
  }
  function displayDate(date, full = false) {
    return new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai',...(full ? {year:'numeric'} : {}),month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(date));
  }
  function today() {
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get = type => parts.find(p => p.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function reminderButton(r) {
    const yes = state.reminders.includes(r.id);
    return `<button class="remind-button ${yes ? 'saved' : ''}" data-toggle-reminder="${esc(r.id)}" aria-pressed="${yes}" aria-label="${yes ? '移出想喝清单' : '加入想喝清单'}：${esc(r.title)}">${icon(yes ? 'check' : 'plus')}${yes ? '已加入' : '想喝'}</button>`;
  }
  function releaseCard(r) {
    const b = brand(r.brandId);
    return `<article class="release-card"><a class="release-image" href="detail.html?type=release&amp;id=${esc(r.id)}"><img src="${safeImage(r.image)}" width="600" height="460" alt="${esc(r.title)}原创茶饮插画" loading="lazy"><span class="card-label">${esc(r.type)}</span></a><p class="card-brand">${esc(b.name)}</p><h3><a href="detail.html?type=release&amp;id=${esc(r.id)}">${esc(r.title)}</a></h3><p class="card-caption">${esc(r.subtitle)}</p><p class="release-date">${esc(displayDate(r.date))} · 示例开售</p><div class="card-bottom"><span data-countdown="${esc(r.date)}"></span>${reminderButton(r)}</div></article>`;
  }
  function renderCalendar() {
    if (!$('#calendar-days')) return;
    $('#calendar-title').textContent = `${calendar.year}年${calendar.month+1}月`;
    const first = (new Date(calendar.year,calendar.month,1).getDay()+6)%7;
    const days = new Date(calendar.year,calendar.month+1,0).getDate();
    const prefix = `${calendar.year}-${String(calendar.month+1).padStart(2,'0')}-`;
    let html = '<span></span>'.repeat(first);
    for (let i=1;i<=days;i++) {
      const date = prefix+String(i).padStart(2,'0');
      const has = DATA.releases.some(r => r.date.startsWith(date));
      html += `<button type="button" data-calendar-day="${i}" class="${has?'has-release ':''}${calendar.day===i?'selected ':''}${date===today()?'today':''}" aria-pressed="${calendar.day===i}" aria-label="${calendar.month+1}月${i}日${has?'，有示例上新':''}">${i}</button>`;
    }
    $('#calendar-days').innerHTML = html;
    let list = DATA.releases.filter(r => r.date.startsWith(prefix));
    if (calendar.day) list = list.filter(r => Number(r.date.slice(8,10))===calendar.day);
    if (calendar.filter==='followed') list = list.filter(r => state.follows.includes(r.brandId));
    $('#release-title').textContent = calendar.day ? `${calendar.month+1}月${calendar.day}日 · 上新` : `${calendar.month+1}月上新清单`;
    $('#release-subtitle').textContent = `${list.length} CUPS TO LOOK FORWARD TO`;
    $('#release-grid').innerHTML = list.length ? list.map(releaseCard).join('') : empty(calendar.filter==='followed' && !state.follows.length ? '还没有关注的品牌' : '这一天，先慢慢喝茶','当前筛选下暂无示例上新，试试查看全月或其他品牌。',calendar.filter==='followed' ? 'brands.html' : '', '去关注品牌');
    countdowns();
  }
  function renderBrands() {
    if (!$('#brand-grid')) return;
    const query = ($('#brand-search')?.value || '').trim().toLowerCase();
    const list = DATA.brands.filter(b => `${b.name} ${b.en} ${b.tags.join(' ')}`.toLowerCase().includes(query) && (brandFilter!=='followed' || state.follows.includes(b.id)));
    $('#brand-grid').innerHTML = list.length ? list.map(b => {
      const yes = state.follows.includes(b.id);
      return `<article class="brand-card"><div class="brand-avatar ${esc(b.color)}">${esc(b.mark)}</div><h2>${esc(b.name)}</h2><p class="brand-en">${esc(b.en)}</p><p class="brand-desc">${esc(b.desc)}</p><div class="tag-row">${b.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><button class="follow-button" data-follow="${esc(b.id)}" aria-pressed="${yes}" aria-label="${yes?'取消关注':'关注'}${esc(b.name)}">${icon(yes?'check':'plus')}${yes?'已关注':'关注品牌'}</button><button class="brand-feed-link" data-brand-feed="${esc(b.id)}">查看上新 ↗</button></article>`;
    }).join('') : empty('暂时没有找到品牌','可以换个关键词，或切换到全部品牌。');
    const releases = DATA.releases.filter(r => !selectedBrand || r.brandId===selectedBrand);
    $('#brand-release-grid').innerHTML = releases.map(releaseCard).join('');
    $('#brand-feed-title').textContent = selectedBrand ? `${brand(selectedBrand).name} · 上新手记` : '品牌上新手记';
    $('#show-all-brands').hidden = !selectedBrand;
    countdowns();
  }
  function sortedRecords() { return [...state.records].sort((a,b) => b.date.localeCompare(a.date)); }
  function recordCard(r) {
    return `<a class="journal-card" href="detail.html?type=record&amp;id=${encodeURIComponent(r.id)}">${r.demo?'<span class="demo-badge">示例手账</span>':''}<img src="${safeImage(r.image)}" width="600" height="460" alt="${esc(r.title)}的手账图片" loading="lazy"><div class="journal-card-content"><div class="journal-card-top"><time datetime="${esc(r.date)}">${esc(r.date.replaceAll('-','.'))}</time><span class="mood-label">${esc(r.mood)}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.note || '今天的这一杯，值得留念。')}</p><p class="card-brand">${esc(r.brand)}　↗</p></div></a>`;
  }
  function renderJournal() {
    if (!$('#journal-grid')) return;
    const query = ($('#journal-search')?.value || '').trim().toLowerCase();
    const list = sortedRecords().filter(r=>`${r.title} ${r.brand} ${r.mood} ${r.note}`.toLowerCase().includes(query));
    $('#journal-total').textContent = state.records.length;
    $('#journal-personal').textContent = state.records.filter(r=>!r.demo).length;
    $('#journal-grid').classList.toggle('timeline', journalView==='timeline');
    $('#journal-grid').innerHTML = list.length ? list.map(recordCard).join('') : empty('这一页，等你来写',query ? '没有匹配的记录，试试其他关键词。' : '点击“记录一杯”，留下今天的味道。');
  }
  function renderDetail() {
    if (!$('#detail-content')) return;
    const params = new URLSearchParams(location.search);
    const type = params.get('type') || 'record';
    const id = params.get('id') || state.records[0]?.id;
    const item = type==='release' ? release(id) : state.records.find(r=>r.id===id);
    if (!item) {
      document.title = '记录未找到 · 今日新杯';
      $('#detail-content').innerHTML = empty('这条记录已经不在这里了','记录可能已被删除，或当前浏览器中尚未保存。','journal.html','返回电子手账');
      return;
    }
    const isRelease = type==='release';
    document.title = `${item.title} · 今日新杯`;
    $('#breadcrumb-title').textContent = isRelease ? '上新详情' : '记录详情';
    const fields = isRelease ? [['品牌',brand(item.brandId).name],['系列',item.type],['示例开售时间',displayDate(item.date,true)],['信息来源','虚构教学示例']] : [['品牌',item.brand],['日期',item.date],['当天心情',item.mood],['记录类型',item.demo?'示例手账':'我的手动记录']];
    $('#detail-content').innerHTML = `<div class="detail-layout"><div class="detail-art"><span class="tape"></span><img src="${safeImage(item.image)}" width="600" height="460" alt="${esc(item.title)}手账大图"><p class="detail-caption">a little moment, a little joy.</p></div><div class="detail-copy"><p class="eyebrow">${isRelease?'A NEW CUP TO LOOK FORWARD TO':'A PAGE FROM YOUR DAYS'}</p><h1>${esc(item.title)}</h1><p class="intro-copy">${isRelease?esc(item.subtitle):'把今天的小确幸，认真收藏。'}</p><dl class="detail-fields">${fields.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="detail-note">${esc(isRelease?item.notes:(item.note || '还没有写下这一杯的小记。'))}</p><div class="detail-actions">${isRelease?`${reminderButton(item)}<button class="button" data-record-release="${esc(item.id)}">记到手账 ${icon('plus')}</button>`:`<button class="button" data-edit-record="${esc(item.id)}">编辑这一页 ${icon('arrow')}</button><button class="text-link danger" data-delete-record="${esc(item.id)}">删除记录</button>`}</div><p class="detail-local">${isRelease?'产品、日期均为教学示例，不代表真实上新资讯。':'记录仅保存在当前浏览器，不会上传或自动同步。'}</p><a href="${isRelease?'index.html#calendar-section':'journal.html'}" class="text-link" style="margin-top:20px">← ${isRelease?'返回上新日历':'返回电子手账'}</a></div></div>`;
  }
  function renderReminders() {
    if (!$('#reminder-list')) return;
    $('#lead-minutes').value = state.leadMinutes;
    const list = state.reminders.map(release).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));
    $('#reminder-list').innerHTML = list.length ? list.map(r => {
      const time = new Date(new Date(r.date).getTime()-state.leadMinutes*60000).toISOString();
      return `<article class="reminder-item"><a href="detail.html?type=release&amp;id=${esc(r.id)}"><img src="${safeImage(r.image)}" width="126" height="125" alt="${esc(r.title)}插画"></a><div class="reminder-info"><p class="eyebrow">${esc(brand(r.brandId).name)} · 示例</p><h3><a href="detail.html?type=release&amp;id=${esc(r.id)}">${esc(r.title)}</a></h3><p>开售：${esc(displayDate(r.date))}</p><p class="remind-time">清单提醒时间：${esc(displayDate(time))}</p></div><div class="reminder-controls"><button class="button secondary" data-download-ics="${esc(r.id)}">${icon('download')} 下载日历</button><button class="text-link danger" data-toggle-reminder="${esc(r.id)}">移出清单</button></div></article>`;
    }).join('') : empty('还没有想喝的新杯','去上新日历点击“想喝”，把期待留在这里。','index.html#calendar-section','发现下一杯');
  }
  function renderProfile() {
    if (!$('#profile-records')) return;
    const list = sortedRecords().filter(r=>!r.demo);
    $('#profile-records').textContent = list.length;
    $('#recent-records').innerHTML = list.length ? list.slice(0,3).map(r=>`<a class="recent-item" href="detail.html?type=record&amp;id=${encodeURIComponent(r.id)}"><img src="${safeImage(r.image)}" width="70" height="65" alt="${esc(r.title)}"><div><h3>${esc(r.title)}</h3><p>${esc(r.date)}　·　${esc(r.mood)}</p></div>${icon('arrow')}</a>`).join('') : empty('你的第一页，正在路上','示例手账不计入个人记录。开始记下属于自己的那一杯。','journal.html?new=1','记录第一杯');
  }
  function countdowns() {
    $$('[data-countdown]').forEach(el => {
      const diff = new Date(el.dataset.countdown).getTime()-Date.now();
      if (diff<=0) {el.textContent='示例已开售';return;}
      const seconds = Math.floor(diff/1000), days=Math.floor(seconds/86400);
      const hh=String(Math.floor(seconds%86400/3600)).padStart(2,'0'),mm=String(Math.floor(seconds%3600/60)).padStart(2,'0'),ss=String(seconds%60).padStart(2,'0');
      el.textContent = `${days?days+'天 ':''}${hh}:${mm}:${ss}`;
    });
  }
  function refresh() { count(); ({index:renderCalendar,brands:renderBrands,journal:renderJournal,detail:renderDetail,reminders:renderReminders,profile:renderProfile}[page] || (()=>{}))(); }

  const dialog = $('#entry-dialog'), form = $('#entry-form');
  function openEntry(record = null, fromRelease = null) {
    form.reset(); $('#form-error').hidden=true; imageDraft=null; processingImage=false;
    $('#photo-preview').hidden=true; $('#entry-dialog-title').textContent=record?'编辑这一页':'记下这一杯';
    form.elements.recordId.value=record?.id || '';
    form.elements.title.value=record?.title || fromRelease?.title || '';
    form.elements.brand.value=record?.brand || (fromRelease?brand(fromRelease.brandId).name:'');
    form.elements.date.value=record?.date || today();
    form.elements.mood.value=record?.mood || '开心';
    form.elements.note.value=record?.note || '';
    imageDraft=record?.image || fromRelease?.image || 'res/cup-amber.svg';
    if (record || fromRelease) {$('#photo-preview').src=safeImage(imageDraft);$('#photo-preview').hidden=false;}
    dialog.showModal();
  }
  async function confirmAction(title, description) {
    const d=$('#confirm-dialog'); $('#confirm-title').textContent=title; $('#confirm-description').textContent=description; d.returnValue='';
    return new Promise(resolve=>{d.addEventListener('close',()=>resolve(d.returnValue==='confirm'),{once:true});d.showModal();});
  }
  function formError(text) {$('#form-error').textContent=text;$('#form-error').hidden=false;}

  $('#entry-photo').addEventListener('change',async event=>{
    const file=event.target.files[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>8*1024*1024) {formError('请选择不超过8MB的JPG、PNG或WebP图片。');event.target.value='';return;}
    processingImage=true;
    try {
      const url=URL.createObjectURL(file);
      try {
        const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});
        const scale=Math.min(1,900/Math.max(image.naturalWidth,image.naturalHeight));
        const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        const ctx=canvas.getContext('2d');ctx.fillStyle='#faf7f0';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
        imageDraft=canvas.toDataURL('image/jpeg',.78);$('#photo-preview').src=imageDraft;$('#photo-preview').hidden=false;$('#form-error').hidden=true;
      } finally {URL.revokeObjectURL(url);}
    } catch (_) {formError('这张图片未能读取，请更换图片后重试。');}
    finally {processingImage=false;}
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if (processingImage) {formError('照片正在处理，请稍等一下。');return;}
    const title=form.elements.title.value.trim(), b=form.elements.brand.value.trim(), date=form.elements.date.value;
    if (!title || !b || !date || !form.reportValidity()) {formError('请填写饮品名称、品牌和有效日期。');return;}
    const id=form.elements.recordId.value || (window.crypto?.randomUUID ? crypto.randomUUID() : 'cup-'+Date.now()+'-'+Math.random().toString(36).slice(2));
    const record={id,title,brand:b,date,mood:form.elements.mood.value,note:form.elements.note.value.trim(),image:safeImage(imageDraft),demo:false};
    const next=clone(state),index=next.records.findIndex(r=>r.id===id);
    if (index>=0) next.records[index]=record;else next.records.unshift(record);
    if (!save(next)) {formError('保存失败，请先备份数据或清理存储后重试。当前内容仍保留在表单内。');return;}
    dialog.close();refresh();toast('这一杯已保存在当前浏览器。');
    if (page==='detail' && new URLSearchParams(location.search).get('type')==='release') location.href=`detail.html?type=record&id=${encodeURIComponent(id)}`;
  });
  $$('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});

  function download(content,type,filename) {
    const url=URL.createObjectURL(new Blob([content],{type}));
    const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function downloadCalendar(id) {
    const r=release(id); if(!r)return;
    const stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const start=new Date(new Date(r.date).getTime()-state.leadMinutes*60000),end=new Date(start.getTime()+15*60000);
    const escapeICS=s=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DailyCup//WEB Lab 2//ZH','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${r.id}-lab@dailycup.example`,`DTSTAMP:${stamp(Date.now())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`SUMMARY:${escapeICS('【教学示例】'+r.title)}`,`DESCRIPTION:${escapeICS('今日新杯课程演示。品牌和时间为虚构示例，不代表真实上新。示例开售时间：'+displayDate(r.date,true))}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
    download(content,'text/calendar;charset=utf-8',`dailycup-${r.id}.ics`);toast('日历文件已下载，可自行导入日历应用。');
  }

  document.addEventListener('click',async event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.matches('[data-new-record]'))openEntry();
    if(target.dataset.calendarDay){calendar.day=Number(target.dataset.calendarDay);renderCalendar();}
    if(target.dataset.releaseFilter){calendar.filter=target.dataset.releaseFilter;$$('[data-release-filter]').forEach(b=>{const on=b===target;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});renderCalendar();}
    if(target.dataset.brandFilter){brandFilter=target.dataset.brandFilter;$$('[data-brand-filter]').forEach(b=>{const on=b===target;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});renderBrands();}
    if(target.dataset.follow){const id=target.dataset.follow;if(!brand(id))return;const had=state.follows.includes(id);if(update(s=>{s.follows=had?s.follows.filter(v=>v!==id):[...s.follows,id];}))toast(had?'已取消关注。':'已关注，首页可筛选这个品牌。');}
    if(target.dataset.brandFeed){selectedBrand=target.dataset.brandFeed;renderBrands();$('#brand-feed-title').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
    if(target.dataset.toggleReminder){const id=target.dataset.toggleReminder;if(!release(id))return;const had=state.reminders.includes(id);if(update(s=>{s.reminders=had?s.reminders.filter(v=>v!==id):[...s.reminders,id];}))toast(had?'已移出想喝清单。':'已加入想喝清单，可在提醒管理中查看。');}
    if(target.dataset.recordRelease)openEntry(null,release(target.dataset.recordRelease));
    if(target.dataset.editRecord){const r=state.records.find(r=>r.id===target.dataset.editRecord);if(r)openEntry(r);}
    if(target.dataset.deleteRecord){const id=target.dataset.deleteRecord;if(await confirmAction('删除这条手账？','删除后无法撤销，其他记录不受影响。')){if(update(s=>{s.records=s.records.filter(r=>r.id!==id);}))toast('手账已删除。');}}
    if(target.dataset.downloadIcs)downloadCalendar(target.dataset.downloadIcs);
  });
  function changeMonth(step){const date=new Date(calendar.year,calendar.month+step,1);calendar.year=date.getFullYear();calendar.month=date.getMonth();calendar.day=null;renderCalendar();}
  $('#prev-month')?.addEventListener('click',()=>changeMonth(-1));
  $('#next-month')?.addEventListener('click',()=>changeMonth(1));
  $('#clear-date')?.addEventListener('click',()=>{calendar.day=null;renderCalendar();});
  $('#demo-month')?.addEventListener('click',()=>{Object.assign(calendar,{year:2026,month:9,day:null});renderCalendar();});
  $('#brand-search')?.addEventListener('input',renderBrands);
  $('#show-all-brands')?.addEventListener('click',()=>{selectedBrand=null;renderBrands();});
  $('#journal-search')?.addEventListener('input',renderJournal);
  for(const name of ['grid','timeline'])$('#'+name+'-view')?.addEventListener('click',()=>{journalView=name;for(const x of ['grid','timeline']){$('#'+x+'-view').classList.toggle('active',x===name);$('#'+x+'-view').setAttribute('aria-pressed',x===name);}renderJournal();});
  $('#reminder-settings')?.addEventListener('submit',e=>{e.preventDefault();const minutes=Number($('#lead-minutes').value);if([0,15,60,1440].includes(minutes)&&update(s=>{s.leadMinutes=minutes;}))toast('提醒时间已保存在当前浏览器。');});
  $('#export-records')?.addEventListener('click',()=>{download(JSON.stringify({...state,exportedAt:new Date().toISOString(),description:'今日新杯浏览器数据备份。示例数据不代表真实上新。'},null,2),'application/json;charset=utf-8',`dailycup-backup-${today()}.json`);toast('本地数据已导出，请妥善保管照片与记录。');});
  $('#reset-data')?.addEventListener('click',async()=>{if(await confirmAction('重置本网站数据？','将清除当前浏览器中的个人手账、关注与提醒，并恢复三条示例手账。建议先导出备份。')){if(save(defaults())){refresh();toast('本网站数据已重置，其他网站数据不受影响。');}}});
  window.addEventListener('storage',event=>{if(event.key===KEY){state=load();refresh();}});
  refresh();
  if(page==='index'||page==='brands')setInterval(countdowns,1000);
  if(page==='journal'&&new URLSearchParams(location.search).get('new')==='1'){openEntry();history.replaceState(null,'',location.pathname);}
  if(badStorage)toast('本地数据暂时无法读取，当前显示示例内容。保存前请先检查浏览器存储设置。');
})();

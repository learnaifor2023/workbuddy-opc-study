'use strict';
const $=id=>document.getElementById(id);
const KEY='workbuddy-opc-merged-v3';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
let DATA,byId,state,cursor=0,wrongOnly=false,saveOK=true;
const initial=()=>({version:DATA.version,answers:{},revealed:[],wrong:[],mode:'practice',submitted:false,deadline:null,ids:DATA.questions.map(q=>q.id),position:0});
function valid(s){
 if(!s||s.version!==DATA.version||!['practice','exam'].includes(s.mode)||typeof s.answers!=='object'||!s.answers||Array.isArray(s.answers)||typeof s.submitted!=='boolean'||!Number.isInteger(s.position)||s.position<0||s.position>=DATA.questions.length)return false;
 const ids=a=>Array.isArray(a)&&a.every(x=>Number.isInteger(x)&&byId.has(x))&&new Set(a).size===a.length;
 if(!ids(s.ids)||!s.ids.length||!ids(s.wrong)||!ids(s.revealed))return false;
 if(!Object.entries(s.answers).every(([id,a])=>byId.has(Number(id))&&Array.isArray(a)&&a.every(x=>Number.isInteger(x)&&x>=0&&x<4)&&new Set(a).size===a.length&&(byId.get(Number(id)).type==='多选'||a.length<=1)))return false;
 if(s.mode==='exam'&&(!Number.isFinite(s.deadline)||s.ids.length!==60||s.ids.filter(id=>byId.get(id).type==='单选').length!==40))return false;
 return true;
}
function save(){state.position=cursor;try{localStorage.setItem(KEY,JSON.stringify(state));saveOK=true}catch{saveOK=false}}
function isRight(q){return same(state.answers[q.id]||[],q.answer)}
function active(){return state.ids.map(id=>byId.get(id))}
function filtered(){return active().filter(q=>(!Number($('module').value)||q.module===Number($('module').value))&&(!$('type').value||q.type===$('type').value)&&(!$('origin').value||q.origin===$('origin').value)&&(!wrongOnly||state.wrong.includes(q.id)))}
function resetFilters(){$('module').value='0';$('type').value='';$('origin').value='';wrongOnly=false;cursor=0}
function sourceLinks(ids){return ids.map(id=>`<a href="${esc(DATA.sources[id][1])}" target="_blank" rel="noopener">${esc(DATA.sources[id][0])}</a>`).join(' / ')}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function showQuestion(scroll=false){
 const list=filtered();cursor=Math.max(0,Math.min(cursor,list.length-1));const q=list[cursor];
 if(!q){$('question').innerHTML='<div class="panel empty">当前没有符合条件的题目。<br>可调整筛选或回到顺序练习。</div>';updateControls();return}
 const seen=state.submitted||state.revealed.includes(q.id),a=state.answers[q.id]||[];
 $('question').innerHTML=`<article class="panel question" id="currentQuestion" data-id="${q.id}"><div class="questionmeta"><span class="badge">${q.type} · ${cursor+1}/${list.length}</span><span class="note">${esc(DATA.modules[q.module-1][0])} · 题库#${q.id}</span>${q.level!=='core'?`<span class="badge">${q.level==='extension'?'扩展知识':'版本细节'}</span>`:''}</div><h2 class="questiontitle">${esc(q.stem)}</h2><div class="origin">${q.origin==='merged'?'融合补充 · 官方核验后重写':'原有模拟题'}${q.thirdPartyIds.length?' · 原站考点 '+q.thirdPartyIds.map(n=>'#'+n).join('、'):''}</div>${q.options.map((o,i)=>`<label class="option ${seen?(q.answer.includes(i)?'right':a.includes(i)?'wrong':''):a.includes(i)?'selected':''}"><input type="${q.type==='多选'?'checkbox':'radio'}" name="answer" value="${i}" ${a.includes(i)?'checked':''} ${state.submitted?'disabled':''}><span>${'ABCD'[i]}. ${esc(o)}</span></label>`).join('')}${seen?`<div class="analysis ${isRight(q)?'':'bad'}"><strong>${isRight(q)?'答对了':'尚未答对'} · 正确答案 ${q.answer.map(i=>'ABCD'[i]).join('、')}</strong><p>${esc(q.explanation)}</p>${q.revisionNote?`<p class="note">核验修订：${esc(q.revisionNote)}</p>`:''}<div class="note">依据：${sourceLinks(q.sources)}</div></div>`:''}</article>`;
 updateControls();save();if(scroll)$('question').scrollIntoView({behavior:'smooth',block:'start'});
}
function updateControls(){
 const list=filtered(),current=list[cursor],n=active().filter(q=>(state.answers[q.id]||[]).length).length,exam=state.mode==='exam'&&!state.submitted;
 $('bar').style.width=(n/state.ids.length*100)+'%';
 $('status').textContent=`${state.mode==='exam'?'模考':'练习'}${state.submitted?'已提交':''} · 已答${n}/${state.ids.length} · 错题${state.wrong.length}${saveOK?' · 自动保存':' · 保存受限，请备份进度'}`;
 $('prev').disabled=!current||cursor===0;$('next').disabled=!current||cursor===list.length-1;
 $('check').classList.toggle('hidden',exam||state.submitted);$('check').disabled=!current;
 $('submit').textContent=state.mode==='exam'?'交卷':'查看总评';$('submit').disabled=state.submitted;
 for(const id of ['module','type','origin','wrong'])$(id).disabled=exam;
 $('wrong').textContent=wrongOnly?'退出错题':'错题重练';
 $('numbers').innerHTML=list.map(q=>{const reviewed=state.submitted||state.revealed.includes(q.id);return `<button data-jump="${q.id}" class="${reviewed?isRight(q)?'good':'bad':(state.answers[q.id]||[]).length?'done':''} ${current?.id===q.id?'active':''}" aria-label="跳转题库第${q.id}题">${q.id}</button>`}).join('');
}
function showResult(){
 if(!state.submitted){$('result').classList.add('hidden');return}
 const arr=active(),n=arr.filter(isRight).length,s=arr.filter(q=>q.type==='单选'),m=arr.filter(q=>q.type==='多选');
 $('result').classList.remove('hidden');$('result').innerHTML=`<h2>本次结果</h2><div class="statgrid"><div class="stat">正确率<b>${(n/arr.length*100).toFixed(1)}%</b>${n}/${arr.length}题</div><div class="stat">单选<b>${s.filter(isRight).length}/${s.length}</b></div><div class="stat">多选<b>${m.filter(isRight).length}/${m.length}</b></div></div><p class="note">这不是官方考试分数。建议重点回看低正确率模块；点击“错题重练”可重新作答。</p>${DATA.modules.map((mod,i)=>{const a=arr.filter(q=>q.module===i+1),k=a.filter(isRight).length;return `<div class="modulebar"><span>${esc(mod[0])}</span><div class="progress"><span style="width:${a.length?k/a.length*100:0}%"></span></div><span>${k}/${a.length}</span></div>`}).join('')}`;
}
function finish(auto=false){
 if(state.submitted)return;if(!auto&&!confirm(`将按本轮全部${state.ids.length}题提交，未答题计未答对。确认？`))return;
 state.submitted=true;state.wrong=[...new Set([...state.wrong.filter(id=>!state.ids.includes(id)),...active().filter(q=>!isRight(q)).map(q=>q.id)])];state.revealed=[...new Set([...state.revealed,...state.ids])];save();showResult();showQuestion();tick();$('result').scrollIntoView({behavior:'smooth',block:'start'});
}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function examIds(){const quota=[2,2,5,5,4,3,4,3,5,3,4];let s=[];quota.forEach((n,i)=>{s.push(...shuffle(DATA.questions.filter(q=>q.type==='单选'&&q.module===i+1&&q.level!=='extension')).slice(0,n).map(q=>q.id))});const m=shuffle(DATA.questions.filter(q=>q.type==='多选')).slice(0,20).map(q=>q.id);return [...shuffle(s),...m]}
function start(mode){if(!confirm(mode==='exam'?'开始新模考？随机抽取40单选和20多选，90分钟；本轮作答将重置。':'开始新的顺序练习？重置作答，保留错题记录。'))return;const wrong=state.wrong;state=initial();state.mode=mode;state.wrong=wrong;if(mode==='exam'){state.ids=examIds();state.deadline=Date.now()+90*60000}resetFilters();save();showResult();showQuestion(true);tick()}
function tick(){if(!state)return;if(state.mode!=='exam'){$('time').textContent='练习 · 不计时';return}if(state.submitted){$('time').textContent='模考已提交';return}const sec=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));$('time').textContent=`剩余 ${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;if(!sec)finish(true)}
async function init(){
 try{const r=await fetch('./bank.json');if(!r.ok)throw Error('题库读取失败');DATA=await r.json();byId=new Map(DATA.questions.map(q=>[q.id,q]));state=initial();try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(valid(saved))state=saved}catch{saveOK=false}cursor=Number.isInteger(state.position)?state.position:0;
 DATA.modules.forEach((mod,i)=>$('module').insertAdjacentHTML('beforeend',`<option value="${i+1}">${i+1}. ${esc(mod[0])}（${mod[1]}%）</option>`));
 $('mergeSummary').textContent=`原有${DATA.stats.original}题 + 核验重写${DATA.stats.added}题 = ${DATA.stats.total}题；第三方${DATA.stats.sourceReviewed}题已逐题处理。`;
 $('audit').innerHTML=[...DATA.audit].sort((a,b)=>a.sourceNumber-b.sourceNumber).map(a=>`<div class="auditrow"><b>原站#${a.sourceNumber} · ${esc(a.status)}</b><br>${esc(a.note)}${a.questionIds.length?'<br>练习位置：'+a.questionIds.map(id=>`<button data-audit="${id}">题库#${id}</button>`).join(''):''}</div>`).join('');
 $('sources').innerHTML=Object.entries(DATA.sources).map(([id,v])=>`<div class="sourceitem"><a href="${esc(v[1])}" target="_blank" rel="noopener">${esc(id+' '+v[0])}</a></div>`).join('');
 $('app').classList.remove('hidden');$('loadState').classList.add('hidden');bind();showResult();showQuestion();tick();setInterval(tick,1000);window.quizQA={same,isRight,examIds,valid,data:DATA,getState:()=>state,filtered,showQuestion,finish};
 }catch(e){$('loadState').textContent='题库暂时未能加载，请联网刷新重试。'+e.message;}
}
function jump(id){if(state.mode==='exam'&&!state.submitted&&!state.ids.includes(id)){alert('此题不在当前模考中，交卷后可进入练习。');return}if(state.mode==='exam'&&state.submitted&&!state.ids.includes(id)){state.mode='practice';state.submitted=false;state.deadline=null;state.ids=DATA.questions.map(q=>q.id);showResult();tick()}resetFilters();cursor=filtered().findIndex(q=>q.id===id);showQuestion(true)}
function bind(){
 $('question').addEventListener('change',e=>{if(e.target.name!=='answer'||state.submitted)return;const q=filtered()[cursor];state.answers[q.id]=[...$('question').querySelectorAll('input:checked')].map(el=>Number(el.value));state.revealed=state.revealed.filter(id=>id!==q.id);save();showQuestion()});
 $('check').onclick=()=>{const q=filtered()[cursor];if(!q)return;if(!(state.answers[q.id]||[]).length){alert('请先选择答案。');return}if(!state.revealed.includes(q.id))state.revealed.push(q.id);state.wrong=state.wrong.filter(id=>id!==q.id);if(!isRight(q))state.wrong.push(q.id);save();showQuestion();};
 $('prev').onclick=()=>{cursor--;showQuestion(true)};$('next').onclick=()=>{cursor++;showQuestion(true)};
 $('numbers').onclick=e=>{const id=Number(e.target.dataset.jump);if(!id)return;cursor=filtered().findIndex(q=>q.id===id);$('more').open=false;showQuestion(true)};
 $('audit').onclick=e=>{const id=Number(e.target.dataset.audit);if(id)jump(id)};
 for(const id of ['module','type','origin'])$(id).onchange=()=>{cursor=0;showQuestion()};
 $('practice').onclick=()=>start('practice');$('exam').onclick=()=>start('exam');$('submit').onclick=()=>finish();
 $('wrong').onclick=()=>{if(wrongOnly){wrongOnly=false;cursor=0;showQuestion();return}if(!state.wrong.length){alert('还没有错题。先练习并核对答案，或完成一轮模考。');return}const wrong=[...state.wrong];state.mode='practice';state.submitted=false;state.deadline=null;state.ids=DATA.questions.map(q=>q.id);for(const id of wrong)delete state.answers[id];state.revealed=state.revealed.filter(id=>!wrong.includes(id));resetFilters();wrongOnly=true;save();showResult();showQuestion(true);tick()};
 $('backup').onclick=()=>download('OPC备考进度.json',JSON.stringify({kind:'workbuddy-opc-backup',version:DATA.version,savedAt:new Date().toISOString(),state},null,2),'application/json;charset=utf-8');
 $('restore').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('备份文件过大');const b=JSON.parse((await file.text()).replace(/^\ufeff/,''));if(b.kind!=='workbuddy-opc-backup'||!valid(b.state))throw Error('不是当前版本的有效备份');if(!confirm('用备份中的作答与错题替换当前记录？'))return;state=b.state;resetFilters();cursor=state.position||0;save();showResult();showQuestion();tick();alert('进度已导入。')}catch(err){alert('导入失败：'+err.message)}finally{e.target.value=''}};
 $('export').onclick=()=>{const q=DATA.questions.filter(q=>state.wrong.includes(q.id));download('OPC备考错题.txt','WorkBuddy OPC 错题\n'+new Date().toLocaleString()+'\n\n'+q.map(q=>`题库#${q.id} [${DATA.modules[q.module-1][0]}]\n${q.stem}\n${q.options.map((o,i)=>'ABCD'[i]+'. '+o).join('\n')}\n答案：${q.answer.map(i=>'ABCD'[i]).join('、')}\n解析：${q.explanation}\n${q.sources.map(s=>DATA.sources[s][1]).join('\n')}`).join('\n\n'),'text/plain;charset=utf-8')};
 $('reset').onclick=()=>{if(!confirm('删除此浏览器保存的作答、错题与计时？'))return;state=initial();resetFilters();save();showResult();showQuestion();tick()};
}
$('phoneHelp').onclick=()=>$('phonePanel').classList.remove('hidden');$('closePhone').onclick=()=>$('phonePanel').classList.add('hidden');init();

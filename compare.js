(function () {
  "use strict";

  const activities = window.PhysicsClassroom?.activities || [];
  const presets = [
    { id:"lenz", title:"冷次定律：誰在動？", left:"冷次定律(磁鐵動).html", right:"冷次定律(線圈動).html", question:"磁鐵移動與線圈移動，哪些條件相同時會得到相同的感應結果？", hint:"比較相對速度、磁通量變化與感應電流方向。" },
    { id:"machine", title:"發電機 ↔ 電動機", left:"發電機.html", right:"電動機.html", question:"發電機與電動機的能量轉換方向如何相反？哪些結構扮演相似角色？", hint:"對照線圈、磁場、電流、力矩與能量輸入輸出。" },
    { id:"wave", title:"干涉：2D ↔ 3D", left:"波的干涉與雙波源.html", right:"波前與雙狹縫3D.html", question:"同一個干涉現象，在 2D 截面與 3D 波前中各看見哪些資訊？", hint:"找出波源、路徑差、節線與空間波前的對應。" },
    { id:"circle", title:"水平 ↔ 鉛直圓周", left:"等速圓周運動-錐動擺.html", right:"鉛質圓周運動.html", question:"水平與鉛直圓周運動中，提供向心力的合力為什麼不同？", hint:"比較重力是否具有徑向分量，以及速率是否保持不變。" },
    { id:"quantum", title:"黑體 ↔ 光電效應", left:"黑體輻射.html", right:"光電效應.html", question:"溫度改變黑體的能量分布，光頻率改變光電子最大動能；這兩種證據如何連到光量子？", hint:"分開比較峰值波長、光子頻率、輻射強度與逸出電子數量，不把「每個光子的能量」和「光子的數量」混為一談。" }
  ].filter((preset) => activities.some((item) => item.file === preset.left) && activities.some((item) => item.file === preset.right));

  const storage = { get(key,fallback=""){try{return localStorage.getItem(key)??fallback;}catch(_){return fallback;}}, set(key,value){try{localStorage.setItem(key,value);}catch(_){/* private mode */}} };
  const params = new URLSearchParams(location.search);
  const fallbackPreset = presets[0] || { left:activities[0]?.file, right:activities[1]?.file };
  const state = {
    left: activities.some((item) => item.file === params.get("left")) ? params.get("left") : fallbackPreset.left,
    right: activities.some((item) => item.file === params.get("right")) ? params.get("right") : fallbackPreset.right,
    mobilePane:"left"
  };
  const refs = {
    leftSelect:document.getElementById("left-select"), rightSelect:document.getElementById("right-select"),
    leftFrame:document.getElementById("left-frame"), rightFrame:document.getElementById("right-frame"),
    question:document.getElementById("comparison-question-heading"), hint:document.getElementById("comparison-hint"),
    guide:document.querySelector(".comparison-guide"), saveStatus:document.getElementById("compare-save-status"), toast:document.getElementById("compare-toast")
  };
  const fields = ["same","change","left-result","right-result","conclusion"].map((id) => document.getElementById(`compare-${id}`));
  let saveTimer,toastTimer;

  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);}
  function activity(file){return activities.find((item)=>item.file===file);}
  function options(selected){return [...new Set(activities.map((item)=>item.category))].map((category)=>`<optgroup label="${escapeHtml(category)}">${activities.filter((item)=>item.category===category).map((item)=>`<option value="${escapeHtml(item.file)}" ${item.file===selected?"selected":""}>${escapeHtml(item.title)}</option>`).join("")}</optgroup>`).join("");}
  function pairKey(){return `physics-comparison:${[state.left,state.right].sort().join("|")}`;}
  function currentPreset(){return presets.find((preset)=>(preset.left===state.left&&preset.right===state.right)||(preset.left===state.right&&preset.right===state.left));}
  function readSaved(){try{return JSON.parse(storage.get(pairKey(),"{}"));}catch(_){return {};}}

  function render(){
    refs.leftSelect.innerHTML=options(state.left); refs.rightSelect.innerHTML=options(state.right);
    refs.leftFrame.src=`${encodeURI(state.left)}?embed=1&role=student`; refs.rightFrame.src=`${encodeURI(state.right)}?embed=1&role=student`;
    refs.leftFrame.title=`模擬 A：${activity(state.left)?.title||"物理模擬"}`; refs.rightFrame.title=`模擬 B：${activity(state.right)?.title||"物理模擬"}`;
    const preset=currentPreset();
    refs.question.textContent=preset?.question||`比較「${activity(state.left)?.title}」與「${activity(state.right)?.title}」：哪一個變因造成結果不同？`;
    refs.hint.textContent=preset?.hint||"先找兩邊都能控制的物理量，再做公平比較。";
    document.querySelectorAll("#compare-presets button").forEach((button)=>button.classList.toggle("active",button.dataset.preset===preset?.id));
    loadNotes();
    try{const url=new URL(location.href);url.searchParams.set("left",state.left);url.searchParams.set("right",state.right);history.replaceState(null,"",url.href);}catch(_){/* file URL limitation */}
  }

  function loadNotes(){const saved=readSaved();const reversed=saved.leftFile===state.right&&saved.rightFile===state.left;fields.forEach((field)=>{let key=field.id.replace("compare-","");if(reversed&&key==="left-result")key="right-result";else if(reversed&&key==="right-result")key="left-result";field.value=saved[key]||"";});const done=Boolean(saved.completedAt);const button=document.getElementById("complete-comparison");button.classList.toggle("complete",done);button.textContent=done?"✓ 已完成比較":"完成比較探究";refs.saveStatus.textContent="內容只儲存在這台裝置";}
  function saveNotes(){const data={leftFile:state.left,rightFile:state.right,question:refs.question.textContent,updatedAt:new Date().toISOString()};fields.forEach((field)=>data[field.id.replace("compare-","")]=field.value);const old=readSaved();if(old.completedAt)data.completedAt=old.completedAt;storage.set(pairKey(),JSON.stringify(data));refs.saveStatus.textContent="比較紀錄已儲存";}
  function changePair(left,right){window.clearTimeout(saveTimer);saveNotes();state.left=left;state.right=right;render();}

  document.getElementById("compare-presets").innerHTML=presets.map((preset)=>`<button type="button" data-preset="${preset.id}">${escapeHtml(preset.title)}</button>`).join("");
  document.getElementById("compare-presets").addEventListener("click",(event)=>{const preset=presets.find((item)=>item.id===event.target.closest("[data-preset]")?.dataset.preset);if(!preset)return;changePair(preset.left,preset.right);});
  refs.leftSelect.addEventListener("change",()=>changePair(refs.leftSelect.value,state.right));
  refs.rightSelect.addEventListener("change",()=>changePair(state.left,refs.rightSelect.value));
  document.getElementById("swap-simulations").addEventListener("click",()=>changePair(state.right,state.left));
  fields.forEach((field)=>field.addEventListener("input",()=>{window.clearTimeout(saveTimer);saveTimer=window.setTimeout(saveNotes,280);}));
  document.getElementById("complete-comparison").addEventListener("click",(event)=>{saveNotes();const data=readSaved();data.completedAt=new Date().toISOString();storage.set(pairKey(),JSON.stringify(data));event.currentTarget.classList.add("complete");event.currentTarget.textContent="✓ 已完成比較";showToast("比較探究已完成");});
  document.getElementById("guide-collapse").addEventListener("click",(event)=>{const open=refs.guide.classList.toggle("open");event.currentTarget.textContent=open?"收合":"展開";event.currentTarget.setAttribute("aria-expanded",String(open));});
  document.querySelector(".mobile-tabs").addEventListener("click",(event)=>{const button=event.target.closest("[data-mobile-pane]");if(!button)return;state.mobilePane=button.dataset.mobilePane;document.querySelectorAll(".mobile-tabs button").forEach((item)=>{const active=item===button;item.classList.toggle("active",active);item.setAttribute("aria-selected",String(active));});document.querySelectorAll(".simulation-pane").forEach((pane)=>pane.classList.toggle("active-mobile",pane.dataset.pane===state.mobilePane));});
  document.getElementById("fullscreen-comparison").addEventListener("click",()=>document.getElementById("compare-workspace").requestFullscreen?.().catch(()=>showToast("此瀏覽器未允許全螢幕")));

  function comparisonMarkdown(){const left=activity(state.left),right=activity(state.right);return [`# 雙模擬比較｜${left.title} × ${right.title}`,"",`- 日期：${new Date().toLocaleString("zh-TW")}`,`- 核心問題：${refs.question.textContent}`,"",`## 公平比較`,`- 我保持相同：${fields[0].value||"（尚未填寫）"}`,`- 我刻意改變：${fields[1].value||"（尚未填寫）"}`,"",`## 觀察結果`,`- 模擬 A「${left.title}」：${fields[2].value||"（尚未填寫）"}`,`- 模擬 B「${right.title}」：${fields[3].value||"（尚未填寫）"}`,"",`## 比較結論`,fields[4].value||"（尚未填寫）",""].join("\n");}
  document.getElementById("export-comparison").addEventListener("click",()=>{saveNotes();const blob=new Blob(["\uFEFF",comparisonMarkdown()],{type:"text/markdown;charset=utf-8"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="雙模擬比較學習單.md";anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),500);showToast("比較學習單已匯出");});
  window.addEventListener("pagehide",saveNotes);
  function showToast(message){window.clearTimeout(toastTimer);refs.toast.textContent=message;refs.toast.classList.add("show");toastTimer=window.setTimeout(()=>refs.toast.classList.remove("show"),2300);}
  render();
})();

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const wrap=document.querySelector('#canvas-wrap'), loading=document.querySelector('#loading');
const scene=new THREE.Scene(); scene.background=new THREE.Color('#090b18'); scene.fog=new THREE.FogExp2('#090b18',0.026);
const camera=new THREE.PerspectiveCamera(45,1,0.1,100); camera.position.set(0,8.8,13.5);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25; wrap.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.055; controls.minDistance=7; controls.maxDistance=22; controls.maxPolarAngle=Math.PI*.48; controls.target.set(0,0.6,0);
scene.add(new THREE.HemisphereLight(0xaaaaff,0x101326,2.1));
const key=new THREE.DirectionalLight(0xd9d4ff,3.2);key.position.set(4,9,6);scene.add(key);
const cyanLight=new THREE.PointLight(0x57dce8,28,18);cyanLight.position.set(-4,3,1);scene.add(cyanLight);
const purpleLight=new THREE.PointLight(0x8c70ff,25,16);purpleLight.position.set(4,3,-3);scene.add(purpleLight);
const starGeo=new THREE.BufferGeometry(), starPos=[];for(let i=0;i<650;i++){starPos.push((Math.random()-.5)*42,Math.random()*18-1,(Math.random()-.5)*42)}starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xc7c8ff,size:.035,transparent:true,opacity:.8}));scene.add(stars);
const floor=new THREE.Mesh(new THREE.CircleGeometry(10,80),new THREE.MeshBasicMaterial({color:0x0c1026,transparent:true,opacity:.85}));floor.rotation.x=-Math.PI/2;floor.position.y=-.6;scene.add(floor);
const grid=new THREE.GridHelper(20,32,0x45416f,0x262747);grid.position.y=-.57;grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
const world=new THREE.Group();scene.add(world);
const colors=[0x9d8bff,0x6fe2e0,0xffbd91];
let nodes=[], lines=[], selected=0, goalText='Your next chapter', pathData=[];
const defaults=[
 {title:'Start small',subtitle:'Build momentum',description:'Choose one manageable action and learn from doing it. Reduce friction, build momentum, and adjust as you go.',effort:'Low–medium',best:'Getting unstuck',tasks:['Write down the smallest useful next step','Spend 20 minutes making a first attempt','Review what worked and choose the next move']},
 {title:'Learn deeply',subtitle:'Build foundations',description:'Create a stronger foundation before making a big move. Gather useful knowledge, practise deliberately, and make the next decision with more confidence.',effort:'Medium',best:'Building confidence',tasks:['Find one trusted beginner resource','Schedule three short practice sessions','Explain or demonstrate what you learned']},
 {title:'Try in public',subtitle:'Learn by doing',description:'Test your idea in the real world. Share a small version, ask for feedback, and let evidence—not guesswork—shape your next step.',effort:'Medium–high',best:'Learning through action',tasks:['Create a tiny version of your idea','Show it to one relevant person','Record feedback and improve one thing']}
];
function makeMat(color,metal=0,rough=.35){return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:color,emissiveIntensity:.12})}
function clearWorld(){while(world.children.length){const o=world.children.pop();o.traverse?.(x=>{x.geometry?.dispose();if(x.material){if(Array.isArray(x.material))x.material.forEach(m=>m.dispose());else x.material.dispose()}})}nodes=[];lines=[]}
function addIsland(pos,color,index,isGoal=false,title=''){
 const group=new THREE.Group();group.position.set(...pos);group.userData={index,isGoal,title};world.add(group);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(isGoal?1.05:.8,isGoal?1.35:1.05,.55,7,1),makeMat(isGoal?0x344d79:color,.25));base.position.y=0;group.add(base);
 const top=new THREE.Mesh(new THREE.CylinderGeometry(isGoal?.9:.67,isGoal?1.05:.8,.12,7),makeMat(isGoal?0x548eaf:color,.15,.28));top.position.y=.31;group.add(top);
 const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(isGoal?.43:.34,0),new THREE.MeshStandardMaterial({color:isGoal?0x9df6f1:color,emissive:isGoal?0x42d9d5:color,emissiveIntensity:1.5,metalness:.25,roughness:.2}));crystal.position.y=.95;crystal.rotation.y=.3;group.add(crystal);
 const glow=new THREE.Mesh(new THREE.TorusGeometry(isGoal?1.2:.92,.012,5,80),new THREE.MeshBasicMaterial({color:isGoal?0x7de9e5:color,transparent:true,opacity:.7}));glow.rotation.x=Math.PI/2;glow.position.y=.42;group.add(glow);
 for(let i=0;i<5;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.08+Math.random()*.08,0),makeMat(color));rock.position.set((Math.random()-.5)*1.3,.38+Math.random()*.13,(Math.random()-.5)*1.3);group.add(rock)}
 const halo=new THREE.PointLight(isGoal?0x7de9e5:color,isGoal?2.8:1.8,4);halo.position.y=1.1;group.add(halo);
 nodes.push({group,crystal,index,isGoal,glow});return group;
}
function connect(a,b,color){const points=[new THREE.Vector3(...a),new THREE.Vector3((a[0]+b[0])/2,2.4,(a[2]+b[2])/2),new THREE.Vector3(...b)];const curve=new THREE.QuadraticBezierCurve3(...points);const obj=new THREE.Mesh(new THREE.TubeGeometry(curve,36,.018,5,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.62}));world.add(obj);lines.push(obj);const dot=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),new THREE.MeshBasicMaterial({color}));world.add(dot);dot.userData.curve=curve;dot.userData.offset=Math.random();lines.push(dot)}
function buildWorld(){
 clearWorld();
 const positions=[[0,.1,0],[-3.3,0,-1.5],[3.3,0,-1.5],[0,0,3.5]];
 addIsland(positions[0],0x74dfe0,-1,true,goalText);
 for(let i=0;i<3;i++){addIsland(positions[i+1],colors[i],i,false,pathData[i].title);connect([0,1.1,0],[positions[i+1][0],1.1,positions[i+1][2]],colors[i])}
 const ring=new THREE.Mesh(new THREE.TorusGeometry(5.6,.012,5,120),new THREE.MeshBasicMaterial({color:0x7770bc,transparent:true,opacity:.22}));ring.rotation.x=Math.PI/2;ring.position.y=-.38;world.add(ring);
 setSelected(selected);loading.style.display='none';
}
function setSelected(i){selected=i;document.querySelectorAll('.path-button').forEach((b,n)=>b.classList.toggle('active',n===i));const p=pathData[i];if(!p)return;
 document.querySelector('#detailEyebrow').textContent=`PATH ${'ABC'[i]} / ${p.subtitle.toUpperCase()}`;document.querySelector('#detailTitle').textContent=p.title;document.querySelector('#detailDescription').textContent=p.description;document.querySelector('#effort').textContent=p.effort;document.querySelector('#best').textContent=p.best;
 renderTasks();
 nodes.forEach(n=>{if(n.isGoal)return;const active=n.index===i;n.glow.material.opacity=active?1:.4;n.crystal.scale.setScalar(active?1.22:1);n.group.position.y=active?.2:0});
}
function renderTasks(){const key='morrow3d-'+selected;let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{};const tasks=document.querySelector('#tasks');tasks.innerHTML='';pathData[selected].tasks.forEach((t,i)=>{const label=document.createElement('label');label.className='task'+(saved[i]?' done':'');const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!saved[i];cb.addEventListener('change',()=>{saved[i]=cb.checked;localStorage.setItem(key,JSON.stringify(saved));label.classList.toggle('done',cb.checked);updateProgress()});const span=document.createElement('span');span.textContent=t;label.append(cb,span);tasks.append(label)});updateProgress()}
function updateProgress(){const checks=[...document.querySelectorAll('#tasks input')];document.querySelector('#progress').textContent=`${checks.filter(c=>c.checked).length} / ${checks.length}`}
async function generate(){
 const goal=document.querySelector('#goal').value.trim();
 if(!goal){document.querySelector('#goal').focus();return}
 const button=document.querySelector('#create');
 const oldText=button.innerHTML;
 button.disabled=true;button.innerHTML='Thinking with local AI… <span>✦</span>';
 try{
  const response=await fetch('https://morrow-ai.onrender.com/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goal})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'The local AI could not generate a plan.');
  goalText=goal.length>29?goal.slice(0,27)+'…':goal;
  pathData=data.paths;
  buildWorld();setSelected(0);
  document.querySelector('#detailDescription').textContent=pathData[0].description;
 }catch(err){
  alert('MORROW AI could not respond.\\n\\n'+err.message+'\\n\\nCheck that Ollama is running and the qwen2.5:3b model is installed. See README.md for steps.');
 }finally{button.disabled=false;button.innerHTML=oldText}
}
document.querySelectorAll('.path-button').forEach((b,i)=>b.addEventListener('click',()=>setSelected(i)));
document.querySelector('#create').addEventListener('click',generate);
document.querySelector('#goal').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')generate()});
document.querySelector('#reset').addEventListener('click',()=>{camera.position.set(0,8.8,13.5);controls.target.set(0,.6,0);controls.update()});
document.querySelector('#zoom').addEventListener('click',()=>{camera.position.multiplyScalar(.84);controls.update()});
document.querySelector('#export').addEventListener('click',()=>{const p=pathData[selected],checks=[...document.querySelectorAll('#tasks .task')];const data={goal:document.querySelector('#goal').value,path:p.title,description:p.description,tasks:checks.map(x=>({task:x.innerText,done:x.querySelector('input').checked})),createdAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='morrow-action-plan.json';a.click();URL.revokeObjectURL(a.href)});
document.querySelector('#copy').addEventListener('click',async()=>{const p=pathData[selected],summary=`MORROW ACTION PLAN\nGoal: ${document.querySelector('#goal').value||'My next chapter'}\nPath: ${p.title}\n${p.description}\n\n${p.tasks.map((t,i)=>`${document.querySelectorAll('#tasks input')[i]?.checked?'[x]':'[ ]'} ${t}`).join('\n')}`;try{await navigator.clipboard.writeText(summary);document.querySelector('#copy').textContent='Copied to clipboard ✓'}catch{prompt('Copy your plan:',summary)}});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();renderer.domElement.addEventListener('click',e=>{const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(nodes.filter(n=>!n.isGoal).map(n=>n.group),true);if(hits.length){let found=nodes.find(n=>{let p=hits[0].object;while(p&&p!==n.group)p=p.parent;return p===n.group});if(found)setSelected(found.index)}});
const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();stars.rotation.y=t*.008;nodes.forEach((n,i)=>{n.crystal.rotation.y=t*.35+i*.7;n.crystal.position.y=.95+Math.sin(t*1.2+i)*.08;n.group.rotation.y=Math.sin(t*.22+i)*.04});lines.forEach(o=>{if(o.userData.curve){const p=o.userData.curve.getPoint((t*.09+o.userData.offset)%1);o.position.copy(p)}});controls.update();renderer.render(scene,camera)}
function resize(){const w=wrap.clientWidth,h=wrap.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
new ResizeObserver(resize).observe(wrap);
pathData=JSON.parse(JSON.stringify(defaults));buildWorld();resize();animate();

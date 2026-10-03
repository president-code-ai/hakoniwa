import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import snapshot from '../data/map.json';
import gsi from '../data/buildings-gsi.json';
import {project, clipPolygon, clipSegment, polygonArea, readHeight, joinRings, pointInPolygon} from './geo.js';

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {ready:false, moving:!reducedMotion, view:'overview', time:15, buildings:0, estimated:0, fromLevels:0, roads:0, cars:0, frames:0};
const fail = message => { $('loading').hidden = true; $('error').hidden = false; $('error-text').textContent = message; };
$('reload').onclick = () => location.reload();
for (const id of ['about-open','data-open']) $(id).onclick = () => $('about').showModal();
$('about-close').onclick = () => $('about').close();
$('about').addEventListener('click', e => { if (e.target === $('about')) { const b = $('about').getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) $('about').close(); } });

try { await start(); } catch (error) { console.error(error); fail('3Dの読み込みに失敗しました。SafariやChromeで開き直してみてください。'); }

async function start() {
  const container = $('world');
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); fail('3D表示が中断されました。再読み込みしてもう一度開いてください。'); });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4f6f7');
  const camera = new THREE.OrthographicCamera(-500,500,400,-400,1,3500);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .07;
  controls.minZoom = .65; controls.maxZoom = 5;
  controls.minPolarAngle = .02; controls.maxPolarAngle = Math.PI*.47;
  controls.enablePan = false; controls.autoRotateSpeed = .35;
  controls.target.set(0,0,0);
  controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const hemi = new THREE.HemisphereLight('#e4f4ff','#a0a483',1.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d3',2.2); sun.position.set(-220,450,240); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-390,right:390,top:390,bottom:-390,near:10,far:1000});
  sun.shadow.bias=-.0004; sun.shadow.normalBias=.5; scene.add(sun);
  const fill = new THREE.DirectionalLight('#d7eaf7',.7); fill.position.set(250,150,-250); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000,5000), new THREE.ShadowMaterial({opacity:.12}));
  ground.rotation.x=-Math.PI/2; ground.position.y=-16.4; ground.receiveShadow=true; scene.add(ground);

  const groups = new Map();
  const materials = new Map();
  function material(color, options={}) {
    const key=color+JSON.stringify(options);
    if (!materials.has(key)) materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.88,metalness:0,...options}));
    return materials.get(key);
  }
  function add(geometry, color, options={}) {
    if(geometry.index){const expanded=geometry.toNonIndexed();geometry.dispose();geometry=expanded;}
    geometry.deleteAttribute('uv');
    const mat=material(color,options);
    if (!groups.has(mat)) groups.set(mat,[]);
    groups.get(mat).push(geometry);
  }
  function box(x,y,z,w,h,d,color,rotation=0,options={}) {
    const g=new THREE.BoxGeometry(w,h,d); g.rotateY(rotation);g.translate(x,y,z);add(g,color,options);
  }
  function line(a,b,width,y,color,height=.18) {
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.05) return;
    box((a[0]+b[0])/2,y,(a[1]+b[1])/2,width,height,length,color,Math.atan2(dx,dz));
  }
  function shapeGeometry(points,depth=0,holes=[]) {
    const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(p[0],-p[1])));
    for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(p[0],-p[1]))));
    const geo=depth>0?new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}):new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI/2);return geo;
  }
  function polygon(points,color,y=.1,depth=0,holes=[]) { const geo=shapeGeometry(points,depth,holes);geo.translate(0,y,0);add(geo,color); }
  function cylinder(x,y,z,r,h,color) {const g=new THREE.CylinderGeometry(r,r,h,8);g.translate(x,y,z);add(g,color);}
  let seed=20261004;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  box(0,-9,0,500,13,500,'#b6bda7');
  box(0,-2,0,500,3,500,'#d2d5be');
  box(0,-.4,0,500,.8,500,'#e4e4d5');
  // Thin strata give the cut-out tile a physical edge without inventing terrain.
  box(0,-12,0,500.3,.5,500.3,'#a0ac98');
  const bounds=250;
  const asPoints=geometry=>geometry.map(p=>project(p,snapshot.center));
  const clipped=geometry=>clipPolygon(asPoints(geometry),bounds);
  const valid=points=>points.length>=3&&polygonArea(points)>1;
  const elements=snapshot.osm.elements;
  const relationMembers=new Set(elements.filter(e=>e.type==='relation'&&e.tags?.building).flatMap(e=>e.members.map(m=>m.ref)));
  const buildingPolygons=[];
  for(const e of elements) {
    if (!e.tags?.building||e.tags.building==='no') continue;
    if(e.type==='way'&&e.geometry&&!relationMembers.has(e.id)) {
      const points=clipped(e.geometry);if(valid(points)) buildingPolygons.push({e,points,holes:[]});
    } else if(e.type==='relation') {
      const outer=joinRings(e.members.filter(m=>m.role==='outer')).map(clipped).filter(valid);
      const inner=joinRings(e.members.filter(m=>m.role==='inner')).map(clipped).filter(valid);
      for(const points of outer) buildingPolygons.push({e,points,holes:inner.filter(h=>pointInPolygon(h[0],points))});
    }
  }
  const parks=[];
  const osmBuildings=buildingPolygons.splice(0);
  // GSI supplies complete footprints; OSM supplies recorded floors/uses where matched.
  for(const [index,building] of gsi.buildings.entries()) {
    const points=building.outline,holes=building.holes;
    if(!valid(points))continue;
    const center=points.reduce((acc,p)=>[acc[0]+p[0]/points.length,acc[1]+p[1]/points.length],[0,0]);
    const matches=osmBuildings.filter(b=>pointInPolygon(center,b.points)||points.some(p=>pointInPolygon(p,b.points)));
    matches.sort((a,b)=>Math.abs(polygonArea(a.points)-polygonArea(points))-Math.abs(polygonArea(b.points)-polygonArea(points)));
    const match=matches[0];
    buildingPolygons.push({points,holes,e:{id:match?.e.id??100000+index,tags:match?.e.tags??{building:'yes'}}});
  }
  for(const e of elements) {
    if(e.type!=='way'||!e.geometry) continue;
    const t=e.tags||{};
    if(!t.landuse&&!t.leisure&&t.natural!=='water') continue;
    const p=clipped(e.geometry);if(!valid(p))continue;
    let color='#dcdfce';
    if(t.leisure==='park'||['forest','grass','recreation_ground'].includes(t.landuse)) {color='#a9c2a0';parks.push(p);}
    if(t.landuse==='farmland')color='#c2c89a';
    if(t.landuse==='religious')color='#cbc8ad';
    if(t.leisure==='pitch')color='#9faf9d';
    if(t.natural==='water')color='#83b7b4';
    polygon(p,color,.08);
  }
  function tree(x,z,size=1) {
    cylinder(x,1.6*size,z,.28*size,3.2*size,'#857e66');
    const crown=new THREE.IcosahedronGeometry(2.7*size,1);crown.scale(.9,1.3,.9);crown.translate(x,4.6*size,z);add(crown,['#759e77','#6d9277','#88ac7f'][Math.floor(random()*3)]);
  }
  // Decorative trees stay inside mapped parks. No fictitious houses fill data gaps.
  for(const p of parks) {
    const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);
    for(let i=0;i<90;i++) {const x=Math.min(...xs)+random()*(Math.max(...xs)-Math.min(...xs)),z=Math.min(...zs)+random()*(Math.max(...zs)-Math.min(...zs));if(pointInPolygon([x,z],p)&&!buildingPolygons.some(b=>pointInPolygon([x,z],b.points)))tree(x,z,.8+random()*.5);}
  }
  const roadPaths=[];
  const footTypes=new Set(['footway','path','steps','pedestrian','cycleway']);
  const roadWidths={motorway:8,motorway_link:5,trunk:10,trunk_link:5,primary:8,secondary:7,tertiary:6,residential:4.4,unclassified:4.4,service:3.2,living_street:3.5,footway:1.7,path:1.2,steps:1.8,pedestrian:3,cycleway:1.8};
  for(const e of elements) {
    const t=e.tags||{};
    if(!t.highway||!e.geometry||['construction','proposed'].includes(t.highway))continue;
    const points=asPoints(e.geometry),foot=footTypes.has(t.highway);
    const width=Math.min(18,parseFloat(t.width)||roadWidths[t.highway]||4);
    const raised=t.bridge&&t.bridge!=='no';
    const elevation=raised?(foot?5.4:13):.24;
    const thickness=raised?(foot?.6:1.3):.2;
    let visible=false;
    const pathParts=[];let current=[];
    for(let i=0;i<points.length-1;i++) {
      const segment=clipSegment(points[i],points[i+1],bounds-width/2);if(!segment){if(current.length>1)pathParts.push(current);current=[];continue;}
      const [a,b]=segment;visible=true;
      const roadColor=foot?'#c2b8a0':raised?'#8c9995':'#aeb7b0';
      if(!raised)line(a,b,width+1.7,elevation-.05,'#d5d5c4',.12);
      line(a,b,width,elevation,roadColor,thickness);
      const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      if(length<.1)continue;
      const nx=dz/length,nz=-dx/length;
      if(current.length&&Math.hypot(current.at(-1)[0]-a[0],current.at(-1)[1]-a[1])>.1){pathParts.push(current);current=[];}
      if(!current.length)current.push(a);current.push(b);
      if(raised) {
        for(const side of [-1,1])line([a[0]+nx*width/2*side,a[1]+nz*width/2*side],[b[0]+nx*width/2*side,b[1]+nz*width/2*side],.35,elevation+.9,'#c5d0c6',1.3);
        const pillars=Math.floor(length/26);
        for(let j=0;j<pillars;j++){const f=(j+.5)/pillars;box(a[0]+dx*f,elevation/2,a[1]+dz*f,foot?.65:1.7,elevation,foot?.65:1.7,'#bec5b9');}
      }
      if(!foot&&width>=6){for(let dist=3;dist<length-3;dist+=9){const start=dist/length,end=Math.min(dist+3,length)/length;line([a[0]+dx*start,a[1]+dz*start],[a[0]+dx*end,a[1]+dz*end],.18,elevation+thickness/2+.025,'#e7e5cd',.03);}}
    }
    if(current.length>1)pathParts.push(current);
    if(visible)state.roads++;
    if(!foot&&!t.access?.includes('private'))for(const p of pathParts)if(p.length>1)roadPaths.push({points:p,y:elevation+thickness/2,width,oneway:t.oneway==='yes',speed:raised?13:5});
  }

  const windowGeometry=new THREE.BoxGeometry(1.05,1.1,.10);
  const windowTransforms=[];const temp=new THREE.Object3D();
  const walls=['#ece5d4','#e5decb','#e1e4db','#d7e0d9','#f0e8d7','#cbd6cd'];
  const roofs=['#637e79','#7d9296','#82908f','#b28670','#577b76','#a0aaa1'];
  for(const {e,points,holes} of buildingPolygons) {
    const area=polygonArea(points),heightInfo=readHeight(e.tags,area),height=heightInfo.value;
    state.buildings++;if(heightInfo.estimated)state.estimated++;if(heightInfo.fromLevels)state.fromLevels++;
    const roofColor=roofs[e.id%roofs.length];
    polygon(points,walls[e.id%walls.length],.35,height,holes);
    polygon(points,roofColor,height+.36,.5,holes);
    if(area<190&&height<12&&holes.length===0&&points.length<=7) {
      const ring=points.slice(0,-1),center=ring.reduce((a,p)=>[a[0]+p[0]/ring.length,a[1]+p[1]/ring.length],[0,0]);
      if(pointInPolygon(center,points)) {
        const positions=[];
        for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];positions.push(a[0],height+.87,a[1],center[0],height+2.5,center[1],b[0],height+.87,b[1]);}
        const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));roof.computeVertexNormals();add(roof,roofColor,{side:THREE.DoubleSide});
      }
    }
    // Place windows along real footprint edges; they are decorative, not surveyed.
    for(let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      if(length<3)continue;
      const yaw=Math.atan2(-dz,dx);
      const count=Math.floor(length/3.8),floors=Math.min(18,Math.max(1,Math.floor(height/3)));
      for(let floor=0;floor<floors;floor++)for(let w=0;w<count;w++) {
        const t=(w+1)/(count+1);const y=1.9+floor*3;
        if(y+.6>height)continue;
        temp.position.set(a[0]+dx*t,y,a[1]+dz*t);temp.rotation.set(0,yaw,0);temp.scale.set(1,1,1);temp.updateMatrix();windowTransforms.push(temp.matrix.clone());
      }
    }
    if(area>220&&holes.length===0) {
      const center=points.reduce((acc,p)=>[acc[0]+p[0]/points.length,acc[1]+p[1]/points.length],[0,0]);
      if(pointInPolygon(center,points)){box(center[0],height+1.2,center[1],3.2,1.5,2.4,'#d9ddd3');box(center[0],height+2,center[1],3.4,.2,2.6,roofColor);}
    }
  }
  const windowMaterial=new THREE.MeshStandardMaterial({color:'#648881',emissive:'#ffb764',emissiveIntensity:0,roughness:.5});
  const windows=new THREE.InstancedMesh(windowGeometry,windowMaterial,windowTransforms.length);
  windowTransforms.forEach((m,i)=>windows.setMatrixAt(i,m));windows.instanceMatrix.needsUpdate=true;scene.add(windows);

  // Edge ticks are a miniature model's scale marks: 10 ticks, each 50 metres.
  for(let i=-200;i<=200;i+=50){box(i,.06,247,.7,.15,4,'#b2b9a8');box(-247,.06,i,4,.15,.7,'#b2b9a8');}
  for(const [mat,geometries] of groups) {
    const combined=mergeGeometries(geometries,false);
    const mesh=new THREE.Mesh(combined,mat);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
    geometries.forEach(g=>g.dispose());
  }
  const ringMaterial=new THREE.MeshBasicMaterial({color:'#da7046',transparent:true,opacity:.92,depthTest:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(4,5.1,48),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=1.1;ring.renderOrder=9;scene.add(ring);
  const pinMaterial=new THREE.MeshStandardMaterial({color:'#e8855a',roughness:.55,emissive:'#c85a27',emissiveIntensity:.3});
  const pin=new THREE.Group();
  const pinBody=new THREE.Mesh(new THREE.ConeGeometry(2.3,6,20),pinMaterial);pinBody.rotation.z=Math.PI;pinBody.position.y=9;pin.add(pinBody);
  const pinHead=new THREE.Mesh(new THREE.SphereGeometry(2.5,16,12),pinMaterial);pinHead.position.y=12;pin.add(pinHead);
  const centerBuildings=buildingPolygons.filter(b=>pointInPolygon([0,0],b.points));
  pin.position.y=centerBuildings.length?Math.max(...centerBuildings.map(b=>readHeight(b.e.tags,polygonArea(b.points)).value)):0;
  scene.add(pin);

  const cars=[];
  const carColors=['#f3eee0','#dfaa73','#b7745c','#577e7d','#e8d7aa'];
  for(const path of roadPaths) {
    const lengths=[0];for(let i=1;i<path.points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(path.points[i][0]-path.points[i-1][0],path.points[i][1]-path.points[i-1][1]));
    const total=lengths.at(-1);if(total<35)continue;
    const count=Math.min(4,Math.max(1,Math.floor(total/110)));
    for(let i=0;i<count&&cars.length<45;i++) {
      const car=new THREE.Group();
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.65,.95,3.6),material(carColors[cars.length%carColors.length]));body.position.y=.65;body.castShadow=true;car.add(body);
      const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.35,.65,1.7),material('#506d70'));cabin.position.set(0,1.4,-.1);car.add(cabin);
      const direction=path.oneway?1:(i%2===0?1:-1);
      scene.add(car);cars.push({car,path,lengths,total,offset:random()*total,direction});
    }
  }
  state.cars=cars.length;
  $('building-count').textContent=state.buildings;
  $('data-summary').textContent=`地図取得：${new Date(gsi.fetchedAt).toLocaleDateString('ja-JP')} ／ 建物の輪郭 ${state.buildings}件。そのうち高さを推定したもの ${state.estimated}件（階数の記録あり ${state.fromLevels}件）。隣接して接する建物は一体になる場合があります。`;
  document.querySelector('.place-meta').innerHTML='<span class="location-dot"></span>さいたま市中央区・上峰 <strong>500 m 四方</strong>';

  let transition=null, simTime=0,last=performance.now(),frameTimes=[],fps=60,qualityReduced=false;
  function applyView(view, instant=false) {
    state.view=view;
    const positions={overview:new THREE.Vector3(550,550,650),top:new THREE.Vector3(0,950,.1),close:new THREE.Vector3(190,155,250)};
    const zoom=view==='close'?2.35:1;
    const target=positions[view];
    if(instant||reducedMotion){camera.position.copy(target);camera.zoom=zoom;camera.updateProjectionMatrix();controls.update();transition=null;}
    else transition={from:camera.position.clone(),to:target,zoomFrom:camera.zoom,zoomTo:zoom,start:performance.now(),duration:850};
    for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===view));
  }
  function resize(){
    const width=container.clientWidth,height=container.clientHeight,aspect=width/height;
    const span=Math.max(680,790/aspect);
    camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
    camera.clearViewOffset();
    if(width>850)camera.setViewOffset(width,height,-width*.095,0,width,height);
    else if(width<601)camera.setViewOffset(width,height,0,height*.015,width,height);
    camera.updateProjectionMatrix();renderer.setSize(width,height);
    document.querySelector('.gesture-hint').textContent=matchMedia('(pointer:coarse)').matches?'指で回転 · ピンチで拡大':'ドラッグで回転 · スクロールで拡大';
  }
  new ResizeObserver(resize).observe(container);resize();applyView('overview',true);
  for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>applyView(button.dataset.view);
  controls.addEventListener('start',()=>{transition=null;for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed','false');state.view='custom';});
  function zoomBy(multiplier){transition=null;camera.zoom=THREE.MathUtils.clamp(camera.zoom*multiplier,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();}
  $('zoom-in').onclick=()=>zoomBy(1.25);$('zoom-out').onclick=()=>zoomBy(.8);
  $('north').onclick=()=>applyView('top');
  $('rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('rotate').setAttribute('aria-pressed',String(controls.autoRotate));};
  function updateMotionButton(){$('motion').setAttribute('aria-pressed',String(state.moving));$('motion').innerHTML=state.moving?'<span aria-hidden="true">Ⅱ</span> 動きを止める':'<span aria-hidden="true">▷</span> 動かす';}
  $('motion').onclick=()=>{state.moving=!state.moving;updateMotionButton();};updateMotionButton();
  const dayBackground=new THREE.Color('#f4f6f7'),duskBackground=new THREE.Color('#eee5dd'),nightBackground=new THREE.Color('#182a28');
  function setTime(value){
    state.time=value;const t=value/100,night=THREE.MathUtils.smoothstep(t,.40,1);
    const color=t<.5?dayBackground.clone().lerp(duskBackground,t*2):duskBackground.clone().lerp(nightBackground,(t-.5)*2);
    scene.background.copy(color);
    hemi.intensity=1.9*(1-night)+.6*night;
    sun.intensity=2.2*(1-night)+.18*night;
    sun.color.set('#fff0d3').lerp(new THREE.Color('#ffab66'),Math.sin(t*Math.PI)*.7);
    sun.position.set(-220,450-320*t,240);
    fill.intensity=.7-.35*night;
    windowMaterial.color.set('#648881').lerp(new THREE.Color('#ffdd91'),night);
    windowMaterial.emissiveIntensity=night*2;
    renderer.toneMappingExposure=1+.17*night;
    $('time-label').textContent=t<.38?'昼の街':t<.7?'夕暮れの街':'夜の街';
    const hour=13+Math.round(t*7);$('time-value').value=String(hour).padStart(2,'0')+':00';
    document.body.classList.toggle('night',t>.8);
  }
  $('time').oninput=e=>setTime(Number(e.target.value));setTime(state.time);
  function moveCars(){
    for(const vehicle of cars){
      const {car,path,lengths,total,offset,direction}=vehicle;
      const distance=((simTime*path.speed*direction+offset)%total+total)%total;
      let index=1;while(index<lengths.length-1&&lengths[index]<distance)index++;
      const a=path.points[index-1],b=path.points[index],segmentLength=lengths[index]-lengths[index-1],t=segmentLength?(distance-lengths[index-1])/segmentLength:0;
      const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;
      const lane=path.width>4?path.width*.22*direction:0;
      car.position.set(a[0]+dx*t+dz/length*lane,path.y,a[1]+dz*t-dx/length*lane);car.rotation.y=Math.atan2(dx*direction,dz*direction);
    }
  }
  moveCars();renderer.render(scene,camera);$('loading').hidden=true;state.ready=true;
  // Small read-only diagnostics let browser checks verify the actual rendered scene.
  window.hakoniwa={getState:()=>({...state,center:snapshot.center,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fps:Math.round(fps),zoom:camera.zoom,autoRotate:controls.autoRotate,simTime})};
  function animate(now){
    const rawDelta=(now-last)/1000,dt=Math.min(rawDelta,.05);last=now;
    if(document.hidden)return;
    if(state.moving)simTime+=dt;
    if(transition){const t=THREE.MathUtils.clamp((now-transition.start)/transition.duration,0,1),ease=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,ease);camera.zoom=THREE.MathUtils.lerp(transition.zoomFrom,transition.zoomTo,ease);camera.updateProjectionMatrix();if(t===1)transition=null;}
    if(state.moving){moveCars();pin.position.y=(centerBuildings.length?Math.max(...centerBuildings.map(b=>readHeight(b.e.tags,polygonArea(b.points)).value)):0)+Math.sin(simTime*1.6)*.5;ring.scale.setScalar(1+Math.sin(simTime*1.5)*.06);}
    controls.update(dt);
    const angle=Math.atan2(camera.position.x,camera.position.z);$('compass-needle').style.transform=`rotate(${-angle}rad)`;
    renderer.render(scene,camera);state.frames++;
    if(rawDelta>0&&rawDelta<.5)frameTimes.push(rawDelta);
    if(frameTimes.length===120){fps=frameTimes.length/frameTimes.reduce((a,b)=>a+b,0);frameTimes=[];if(fps<27&&!qualityReduced){renderer.setPixelRatio(1);sun.shadow.mapSize.set(1024,1024);sun.shadow.map?.dispose();sun.shadow.map=null;qualityReduced=true;}}
  }
  renderer.setAnimationLoop(animate);
}

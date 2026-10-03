import * as THREE from 'three';
import {PARKING_OUTLINE,SITE_ANGLE,sitePoint} from './site-corrections.js';

export function buildKotobuki({box,polygon,line,cylinder,scene,material,footprints}) {
  const lights=[];
  const localBox=(u,y,v,w,h,d,color)=>{const [x,z]=sitePoint(u,v);box(x,y,z,w,h,d,color,SITE_ANGLE);};
  const localLine=(u1,v1,u2,v2,width,y,color,height=.06)=>line(sitePoint(u1,v1),sitePoint(u2,v2),width,y,color,height);
  function sign(u,y,v,w,h,face,paint,circle=false) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=circle?1024:Math.max(128,Math.round(1024*h/w));
    const ctx=canvas.getContext('2d');paint(ctx,canvas.width,canvas.height);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mat=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.1,roughness:.75,side:THREE.DoubleSide});lights.push(mat);
    const mesh=new THREE.Mesh(circle?new THREE.CircleGeometry(w/2,48):new THREE.PlaneGeometry(w,h),mat);
    const [x,z]=sitePoint(u,v);mesh.position.set(x,y,z);mesh.rotation.y=face==='front'?SITE_ANGLE-Math.PI/2:SITE_ANGLE;
    scene.add(mesh);return mesh;
  }
  const text=(ctx,label,x,y,size,color,maxWidth)=>{ctx.font=`900 ${size}px "Yu Gothic", "Meiryo", sans-serif`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y,maxWidth);};
  const main=footprints.find(b=>b.landmark==='main'),annex=footprints.find(b=>b.landmark==='annex');
  if(main){polygon(main.points,'#e6dac0',.35,11,main.holes);polygon(main.points,'#c3b9a7',11.36,.3,main.holes);}
  if(annex){polygon(annex.points,'#e8ebe4',.35,6.2,annex.holes);polygon(annex.points,'#aebeba',6.56,.3,annex.holes);}
  // Front faces the parking lot; the long cream wall faces the road.
  localBox(.2,5.7,10.5,.45,11.4,21,'#e1a9ba');
  localBox(.15,.9,10.5,.6,1.6,21,'#98b640');
  localBox(.0,2.1,10.4,.7,3.6,7.5,'#eac048');
  for(const v of [2.2,4.2,16.1,18.1])localBox(-.22,2.1,v,.18,3.1,1.6,'#719396');
  for(const v of [.2,20.6])localBox(-.35,5.9,v,.55,11.5,.55,'#e6d8c0');
  localBox(-.5,4.2,10.5,1.3,.3,21.8,'#686f65');
  localBox(17,.95,21,33.7,1.5,.45,'#98af44');
  localBox(17,11.3,21,34,.3,.35,'#b4a991');
  // Rhythm of narrow cladding ribs along the largely windowless side.
  for(let u=1;u<33;u+=1.1)localBox(u,6,21.05,.06,8.7,.08,'#c9bfa9');
  sign(-.08,8.1,10.5,20.5,5.5,'front',(c,w,h)=>{
    c.fillStyle='#dfa8b7';c.fillRect(0,0,w,h);
    c.strokeStyle='#ce98aa';c.lineWidth=3;
    for(let x=-h;x<w+h;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x+h,h);c.stroke();c.beginPath();c.moveTo(x,h);c.lineTo(x+h,0);c.stroke();}
    c.fillStyle='#292c2a';c.beginPath();c.ellipse(w*.71,h*.64,w*.28,h*.27,-.12,0,Math.PI*2);c.fill();
    text(c,'パチンコ',w*.28,h*.61,h*.29,'#347a57',w*.48);
    text(c,'ことぶき',w*.72,h*.60,h*.32,'#fff5df',w*.47);
  });
  sign(-.25,4.85,10.5,20.6,1.6,'front',(c,w,h)=>{
    const colors=['#bd404e','#304f82','#479f9d','#ed913e','#efcb41','#7dac40','#558dc5','#ad5987'];
    colors.forEach((color,i)=>{c.fillStyle=color;c.fillRect(i*w/8,0,w/8+1,h);});
    c.strokeStyle='#fff7d6';c.lineWidth=5;for(let i=0;i<8;i++){c.beginPath();c.moveTo(i*w/8, h);c.lineTo((i+1)*w/8,0);c.stroke();}
    text(c,'PACHINKO  &  SLOT',w/2,h*.5,h*.4,'#fff8db',w*.8);
  });
  // Orange round emblem, simplified from the supplied reference rather than a photo texture.
  sign(-.45,11.8,10.5,4.2,4.2,'front',(c,w,h)=>{
    c.fillStyle='#d87139';c.fillRect(0,0,w,h);
    c.fillStyle='#659a84';c.beginPath();c.ellipse(w*.5,h*.51,w*.28,h*.36,0,0,Math.PI*2);c.fill();
    c.fillStyle='#ebd9a5';c.beginPath();c.ellipse(w*.5,h*.57,w*.24,h*.3,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#714772';c.lineWidth=28;
    for(const x of [.39,.61]){c.beginPath();c.arc(w*x,h*.51,w*.10,0,Math.PI*2);c.stroke();}
    c.beginPath();c.arc(w*.5,h*.66,w*.1,0,Math.PI);c.stroke();
  },true);
  sign(16.7,8.7,21.15,31.5,2.6,'side',(c,w,h)=>{c.fillStyle='#e6dac0';c.fillRect(0,0,w,h);text(c,'パチンコ',w*.16,h*.5,h*.60,'#cd8f38',w*.3);text(c,'スロット',w*.47,h*.5,h*.60,'#62869f',w*.28);text(c,'Kotobuki',w*.81,h*.5,h*.66,'#ae6253',w*.32);});
  sign(18,4.5,21.16,22.5,4,'side',(c,w,h)=>{c.fillStyle='#cfe0b9';c.fillRect(0,0,w,h);for(let i=0;i<9;i++){c.fillStyle=['#de7052','#e8bc47','#718fb3'][i%3];c.beginPath();c.arc(w*(i+.5)/9,h*.38,h*.29,0,Math.PI*2);c.fill();}text(c,'ようこそ ことぶきへ',w*.5,h*.81,h*.25,'#b14e40',w*.85);});
  // Rooftop advertising tower and the low white entrance adjoining the main hall.
  localBox(25,14,10.7,7.5,5.3,7.5,'#d7d3c4');
  const roofSign=(c,w,h)=>{c.fillStyle='#d7d3c4';c.fillRect(0,0,w,h);c.lineWidth=h*.11;for(let i=0;i<4;i++){c.strokeStyle=['#de8861','#e5b649','#8eb68c','#76a9c2'][i];c.beginPath();c.arc(w*.5,h*.95,h*(.72-i*.1),Math.PI,2*Math.PI);c.stroke();}text(c,'パチンコ',w*.5,h*.2,h*.23,'#b96683',w*.9);text(c,'ことぶき',w*.5,h*.7,h*.25,'#4385a4',w*.82);};
  sign(21.2,14,10.7,7.5,5.1,'front',roofSign);sign(25,14,14.48,7.4,5.1,'side',roofSign);
  localBox(-.9,5.5,-5,1.6,.45,9,'#faf5df');
  for(const v of [-8,-5,-2])localBox(-.22,2.6,v,.18,3.5,2.6,'#719491');
  sign(-.18,5.1,-5.3,8.3,1.2,'front',(c,w,h)=>{c.fillStyle='#f4f0df';c.fillRect(0,0,w,h);text(c,'Pachinko ことぶき',w*.5,h*.5,h*.59,'#b5779a',w*.94);});
  for(const v of [-9.1,-1.5])localBox(-.6,2.8,v,.6,5.6,.4,'#f4f1e5');

  polygon(PARKING_OUTLINE,'#727a78',.17);
  for(let i=0;i<PARKING_OUTLINE.length-1;i++)line(PARKING_OUTLINE[i],PARKING_OUTLINE[i+1],.17,.27,'#e6e2d1',.04);
  const rows=[-30.8,-21.1,-16.0,-6.3];let parked=0;
  for(const [row,u] of rows.entries()) {
    for(let space=0;space<17;space++) {
      const v=2.5+space*2.65;
      localLine(u-2.35,v,u+2.35,v,.11,.29,'#f3ebd8');
      if(space===16)continue;
      if((space*7+row*3)%5>1) {
        const vc=v+1.3;
        localBox(u,.83,vc,3.95,.9,1.7,['#e9e6dd','#bcc7c4','#465960','#bc6552'][(space+row)%4]);
        localBox(u,1.45,vc,1.9,.55,1.45,'#607879');parked++;
      }
      const stop=u+(row%2===0?-1.9:1.9);localBox(stop,.31,v+1.3,.15,.18,1.25,'#b8b9aa');
    }
    localLine(u+(row%2===0?-2.35:2.35),2.5,u+(row%2===0?-2.35:2.35),44.9,.11,.29,'#f3ebd8');
  }
  const [px,pz]=sitePoint(-6,47);cylinder(px,2,pz,.13,4,'#b7bcb2');
  sign(-6,4.3,47,2,2,'front',(c,w,h)=>{c.fillStyle='#497896';c.fillRect(0,0,w,h);text(c,'P',w/2,h*.54,h*.75,'#fff8dd',w*.8);},true);
  // Five small banners along the front entrance, as seen in the supplied photos.
  for(let i=0;i<5;i++){const [x,z]=sitePoint(-2.5,3+i*3.6);cylinder(x,1.7,z,.035,3.4,'#c7c7bb');localBox(-2.5,2.6,3.35+i*3.6,.04,1.4,.65,'#d987a1');}
  return {lights,parkedCars:parked};
}

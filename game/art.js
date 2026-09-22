(function(root){
  'use strict';
  const palette={o:'#573e2c',b:'#9c532b',c:'#b56b37',d:'#c98045',e:'#d99557',g:'#28573a',h:'#36764b',i:'#4c9460',j:'#70ad76',p:'#292c2a',q:'#42433c',r:'#b74734',s:'#de7350',w:'#fff8e6',k:'#252e29'};
  // Every head row has an even width and shares the hood's center at x = 13.
  const head=[
    'oooooooo',
    'oooccccccccooo',
    'obccdddddddcccco',
    'obccdddeeddddcccco',
    'obccddeeedddddddccco',
    'obccddddddddddddccbo',
    'obcccdddddddddddccccbo',
    'obccdddddddddddddcccbo',
    'obccwwwddddddddwwwccbo',
    'obcwwkwwddddddwwkwwcbo',
    'obcwwkkwddddddwwkkwcbo',
    'obccwwwccccccccwwwccbo',
    'obccccccccccccccccbo',
    'obccccccckkcccccccbo',
    'obbcccccccccccccbo',
    'obbbcccccccccbbo',
    'oobbbbbbbbbboo',
    'ooggggggoo'
  ];
  function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function pixelOval(c,x,y,w,h,color){c.fillStyle=color;for(let row=0;row<h;row++){const norm=(row+.5-h/2)/(h/2);const half=Math.sqrt(Math.max(0,1-norm*norm))*w/2;const left=Math.round(w/2-half);c.fillRect(Math.round(x)+left,Math.round(y)+row,Math.max(1,Math.round(half*2)),1);}}
  function star(c,x,y,size=1,color='#f9da79'){c.save();c.translate(Math.round(x),Math.round(y));c.scale(size,size);box(c,-1,-6,2,12,'#b98a43');box(c,-6,-1,12,2,'#b98a43');box(c,-2,-3,4,6,color);box(c,-3,-2,6,4,color);box(c,0,-5,1,4,'#fff6c4');box(c,-4,0,4,1,'#fff6c4');c.restore();}
  function player(c,x,y,t=0,face=1,walk=false,air=false,skate=false){
    c.save();c.translate(Math.round(x+10),Math.round(y-(skate&&!air?4:0)));c.scale(face,1);c.translate(-12,0);let bob=walk&&!air?Math.floor(Math.sin(t*15)):0;
    const leg=walk&&!air?Math.round(Math.sin(t*15)*2):0;
    if(skate&&!air){box(c,1,35,24,2,'#cdab66');box(c,3,37,3,3,'#35443c');box(c,20,37,3,3,'#35443c');}
    box(c,7-leg,27,5,7,'#292c2a');box(c,14+leg,27,5,7,'#292c2a');box(c,8-leg,28,2,5,'#48493f');box(c,15+leg,28,2,5,'#48493f');
    box(c,5-leg,33,8,3,'#702f25');box(c,14+leg,33,8,3,'#702f25');box(c,6-leg,32,6,3,'#c34f38');box(c,15+leg,32,6,3,'#c34f38');box(c,6-leg,33,6,1,'#ed9064');box(c,15+leg,33,6,1,'#ed9064');
    c.translate(0,bob);box(c,6,16,14,13,'#28573a');box(c,7,18,12,10,'#36764b');box(c,8,19,3,7,'#458b57');box(c,7,27,12,2,'#244c34');
    box(c,3,19+(air?-3:leg),4,9,'#28573a');box(c,4,19+(air?-3:leg),3,6,'#4c9460');box(c,3,27+(air?-3:leg),4,3,'#9c532b');
    box(c,20,19+(air?-3:-leg),4,9,'#28573a');box(c,20,20+(air?-3:-leg),2,5,'#4c9460');box(c,20,27+(air?-3:-leg),4,3,'#b56b37');
    box(c,9,23,8,4,'#326743');box(c,10,25,6,1,'#4c9460');box(c,10,18,1,5,'#203e2d');box(c,16,18,1,5,'#203e2d');
    head.forEach((row,yy)=>[...row].forEach((ch,xx)=>{if(palette[ch])box(c,13-row.length/2+xx,yy-2,1,1,palette[ch]);}));c.restore();
  }
  function cloud(c,x,y,s,color){pixelOval(c,x,y+8*s,48*s,13*s,color);pixelOval(c,x+9*s,y,20*s,23*s,color);pixelOval(c,x+24*s,y+4*s,17*s,17*s,color);}
  function tree(c,x,y,size,T,variant=0){c.save();c.translate(Math.round(x),Math.round(y));c.scale(size,size);box(c,-4,-56,9,60,'#8e8360');box(c,1,-50,3,52,'#706e51');box(c,-12,-47,13,5,'#8e8360');box(c,4,-38,14,5,'#8e8360');pixelOval(c,-34,-109,64,67,T.leaf);pixelOval(c,-44,-84,41,45,T.leaf);pixelOval(c,6,-84,38,43,T.leaf);pixelOval(c,-28,-110,50,40,'#87b17b');pixelOval(c,-35,-86,25,26,'#8ab47d');pixelOval(c,10,-78,23,26,'#79a975');for(let i=0;i<9;i++)box(c,-25+(i*17%52),-92+(i*13%46),3,2,'#b4cc90');if(variant)for(let i=0;i<5;i++)box(c,-22+i*11,-69-(i%2)*15,3,4,'#e5b976');c.restore();}
  function bush(c,x,y,w,T){pixelOval(c,x,y-13,w,22,T.leaf);pixelOval(c,x+5,y-18,w*.5,23,'#85aa74');for(let i=4;i<w;i+=12)box(c,x+i,y-4,2,2,'#c2d39d');}
  function building(c,x,base,w,h,color,style=0){box(c,x,base-h,w,h,color);box(c,x-3,base-h-5,w+6,5,'#8d9e84');box(c,x+5,base-h+4,w-10,3,'#ffffff22');for(let yy=base-h+18;yy<base-15;yy+=24)for(let xx=x+10;xx<x+w-8;xx+=23){box(c,xx,yy,12,16,'#788f80');box(c,xx+2,yy+2,8,10,style?'#edd2a0':'#d7e5cc');box(c,xx+6,yy+2,1,12,'#98aa90');box(c,xx-1,yy+15,14,2,'#bbc7ae');}}
  function bench(c,x,y,used=false){box(c,x-15,y-22,36,4,'#a7754e');box(c,x-15,y-16,36,4,'#bb8c5c');box(c,x-18,y-10,42,4,'#c49665');box(c,x-12,y-6,3,6,'#52705b');box(c,x+16,y-6,3,6,'#52705b');box(c,x-11,y-25,2,16,'#52705b');box(c,x+16,y-25,2,16,'#52705b');if(used){box(c,x+28,y-32,2,32,'#688b68');box(c,x+30,y-32,11,8,'#bbd88e');box(c,x+33,y-30,4,3,'#5b915c');}}
  function sign(c,x,y,text){box(c,x+16,y,3,33,'#8f7753');box(c,x,y-2,42,16,'#f0e2bb');box(c,x,y-2,42,2,'#a18c63');c.fillStyle='#62744e';c.font='6px monospace';c.textAlign='center';c.fillText(text,x+21,y+8);c.textAlign='left';}
  function enemy(c,e,t){const sleepy=e.stun>0;const x=Math.round(e.x),y=Math.round(e.y);if(e.type==='paper'){pixelOval(c,x,y,23,20,'#887c6b');pixelOval(c,x+1,y,20,17,'#e6dec1');box(c,x+5,y+2,9,2,'#fdf5d9');box(c,x+3,y+6,3,6,'#c3b79c');box(c,x+8,y+5,3,2,'#baad91');box(c,x+13,y+11,6,2,'#c5b89b');box(c,x+7,y+8,2,sleepy?1:3,'#58614e');box(c,x+15,y+8,2,sleepy?1:3,'#58614e');box(c,x+9,y+17,4,3,'#7b7961');box(c,x+18,y+17,4,3,'#7b7961');}else{cloud(c,x-5,y-8,.65,sleepy?'#d4d9c7':'#91a5ac');box(c,x+7,y+5,2,sleepy?1:3,'#526775');box(c,x+18,y+5,2,sleepy?1:3,'#526775');if(!sleepy)for(let i=0;i<3;i++)box(c,x+4+i*8,y+18+(t*18+i*4)%10,1,4,'#a1b7bf');}if(sleepy){c.fillStyle='#687764';c.font='8px monospace';c.fillText('z',x+17,y-5-Math.sin(t*3)*2);}}
  function goal(c,L){let x=L.goal.x,y=300;const T=L.theme;box(c,x,y-67,102,67,'#e8d4ac');box(c,x+4,y-61,94,59,'#f6e7c5');box(c,x-8,y-72,118,8,T.leaf);box(c,x,y-80,102,8,T.leaf);box(c,x+9,y-86,84,6,T.leaf);box(c,x+34,y-45,30,45,'#6d8163');box(c,x+38,y-40,22,40,'#3e624f');box(c,x+53,y-21,3,3,'#ebce8a');for(const xx of[x+10,x+74]){box(c,xx,y-43,17,23,'#a99c75');box(c,xx+2,y-41,13,18,'#f5dca1');box(c,xx+8,y-41,1,18,'#b89f73');}box(c,x+25,y-68,51,15,'#f4ead1');c.font='7px monospace';c.fillStyle='#486746';c.textAlign='center';c.fillText(['REST HOUSE','SLOW COFFEE','LIBRARY'][L.index],x+51,y-58);c.textAlign='left';box(c,x+6,y-7,20,7,'#b78662');box(c,x+76,y-7,20,7,'#b78662');bush(c,x+7,y-10,18,T);bush(c,x+77,y-10,18,T);}
  function renderSky(c,G,reduced=false){
    const L=G.level,p=G.player,w=c.canvas.width,camX=Math.round(G.camera),camY=Math.round(G.cameraY),t=reduced?0:G.time;
    const progress=Math.max(0,Math.min(1,(L.baseY-camY-180)/L.climbHeight));
    const mix=(a,b)=>{const aa=a.match(/\w\w/g).map(v=>parseInt(v,16)),bb=b.match(/\w\w/g).map(v=>parseInt(v,16));return '#'+aa.map((v,i)=>Math.round(v+(bb[i]-v)*progress).toString(16).padStart(2,'0')).join('');};
    c.imageSmoothingEnabled=false;
    box(c,0,0,w,360,L.v2?mix('bdd9d9','414c79'):mix('b7d9db','567b9e'));
    for(let band=0;band<8;band++)box(c,0,band*48,w,48,`rgba(245,240,211,${band*.026})`);
    pixelOval(c,w-137,48,46,46,'#faf0c8');pixelOval(c,w-134,51,40,40,'#fff5d8');
    // Distant architecture moves slowly against the climbing camera.
    for(let i=0;i<7;i++){
      const x=i*148-80-camX*.18,y=290+(i%3)*38-(camY*.12%130),h=90+(i%4)*35;
      box(c,x,y-h,46,h,'#91b3bd55');box(c,x-4,y-h-7,54,7,'#e0e8d255');
      for(let j=0;j<4;j++)box(c,x+4+j*12,y-h-13,6,9,'#e0e8d255');
      for(let yy=y-h+20;yy<y-10;yy+=29){box(c,x+12,yy,9,17,'#729aa655');box(c,x+27,yy,9,17,'#729aa655');}
    }
    for(let i=0;i<12;i++){
      const x=((i*137+t*2-camX*.3)%1000+1000)%1000-140,y=((i*71-camY*.22)%440+440)%440-30;
      cloud(c,x,y,1.4+(i%3)*.6,i%2?'#f2f2da66':'#edf3e388');
    }
    // Tiny hanging islands and broken arches: scenery, separate from the solid route.
    for(let i=0;i<5;i++){
      const x=70+i*173-camX*.5,y=((i*213+110-camY*.42)%620+620)%620-100;
      box(c,x,y,68,5,'#9bb3a466');box(c,x+9,y+5,50,10,'#88a49e55');box(c,x+22,y+15,25,9,'#88a49e44');
      if(i%2===0){box(c,x+9,y-44,7,44,'#c5d4c077');box(c,x+50,y-44,7,44,'#c5d4c077');box(c,x+13,y-51,40,8,'#c5d4c077');}
    }
    c.save();c.translate(-camX,-camY);
    const summit=L.platforms.at(-1),cx=summit.x+summit.w/2;
    // The summit has its own original open-air bell pavilion.
    for(const x of[cx-55,cx+45]){box(c,x,summit.y-99,10,99,'#a9b5a2');box(c,x+2,summit.y-96,4,90,'#e4e4c3');box(c,x-4,summit.y-102,18,7,'#d9dfb9');}
    box(c,cx-62,summit.y-108,125,7,'#ced6b3');box(c,cx-52,summit.y-115,104,7,'#dce2bf');box(c,cx-39,summit.y-121,78,6,'#edf0ce');
    for(const s of L.platforms){if(s.y<camY-70||s.y>camY+390||s.x+s.w<camX-50||s.x>camX+w+50)continue;
      if(s.kind==='sky-base'){
        box(c,s.x,s.y,s.w,60,'#9fa996');box(c,s.x,s.y,s.w,5,'#a8c58c');box(c,s.x,s.y+5,s.w,3,'#799f75');
        for(let x=0;x<s.w;x+=36){box(c,x,s.y+10,34,15,'#bcc0a5');box(c,x+6,s.y+29,34,15,'#aeb59c');}
        tree(c,35,s.y,.8,L.theme);tree(c,740,s.y,.95,L.theme);sign(c,40,s.y-33,'UP TO SKY');
      }else{
        if(s.down>0){for(let x=s.x;x<s.x+s.w;x+=9)box(c,x,s.y,5,2,'#e4d4b799');continue;}
        const terrace=s.kind==='sky-terrace';
        box(c,s.x-2,s.y,s.w+4,4,'#dce3ba');box(c,s.x,s.y+4,s.w,s.h-4,'#a7b5a0');box(c,s.x+2,s.y+4,s.w-4,3,'#c7d1b0');box(c,s.x+4,s.y+s.h-2,s.w-8,3,'#758e83');
        for(let x=s.x+18;x<s.x+s.w-6;x+=24){box(c,x,s.y+7,1,s.h-8,'#7d9687');box(c,x+2,s.y+9,10,1,'#dbe0bb');}
        box(c,s.x+3,s.y-3,16,3,'#9ebb7e');box(c,s.x+s.w-23,s.y-2,20,2,'#9ebb7e');
        for(let j=0;j<3;j++){const x=s.x+4+j*4;box(c,x,s.y+s.h,2,7+(j%2)*7,'#729b75');box(c,x+1,s.y+s.h+4+j*3,4,2,'#88ad7b');}
        if(s.kind==='sky-mover'){
          box(c,s.origin-s.amplitude,s.y+20,s.w+s.amplitude*2,1,'#e2f3e366');box(c,s.x,s.y,s.w,4,'#83d1cf');
          c.fillStyle='#244d62';c.font='10px monospace';c.textAlign='center';c.fillText('↔',s.x+s.w/2,s.y+12);c.textAlign='left';
        }
        if(s.kind==='sky-crumble'){
          box(c,s.x,s.y,s.w,4,s.crack>0?'#f3b06e':'#dab780');
          for(let j=0;j<3;j++){const x=s.x+14+j*17;box(c,x,s.y+3,2,4,'#765843');box(c,x-2,s.y+7,2,4,'#765843');}
          if(s.crack>0)box(c,s.x,s.y-6,s.w*s.crack/.8,2,'#a44d39');
        }
        if(['fade','ice','spring','conveyor'].includes(s.kind)){
          const colors={fade:'#c3a4e3',ice:'#a8def8',spring:'#edacc3',conveyor:'#e9ce83'};
          box(c,s.x,s.y,s.w,4,s.fading&&Math.floor(G.time*10)%2?'#fff5ff':colors[s.kind]);
          c.fillStyle='#304f64';c.font='10px monospace';c.textAlign='center';
          c.fillText(s.kind==='fade'?(s.fading?'! ! !':'◇ ◇'):s.kind==='ice'?'≋ ≋':s.kind==='spring'?'↑ ↑ ↑':s.belt>0?'› › ›':'‹ ‹ ‹',s.x+s.w/2,s.y+12);c.textAlign='left';
        }
        if(terrace){for(const x of[s.x+8,s.x+s.w-18]){box(c,x,s.y-34,8,34,'#cad3b6');box(c,x-2,s.y-36,12,5,'#e6e8c9');box(c,x+2,s.y-29,2,24,'#eef0d2');}bush(c,s.x+s.w-38,s.y-3,20,L.theme);}
        if(s.step%10===0){c.fillStyle='#476c6b';c.font='7px monospace';c.textAlign='center';c.fillText(`${s.step*48}m`,s.x+s.w/2,s.y+12);c.textAlign='left';}
      }
    }
    for(const s of L.stars)if(!s.got&&s.y>camY-20&&s.y<camY+380)star(c,s.x+4,s.y+6+Math.sin(t*3+s.x)*2,.65,'#f7e0a0');
    for(const item of L.items)if(!item.got&&item.y>camY-30&&item.y<camY+380){const x=item.x+8,y=item.y+8+Math.sin(t*2)*2;star(c,x,y,1.4,'#dbf7df');star(c,x+15,y-9,.4);}
    for(const h of L.hazards||[]){if(h.y<camY-50||h.y>camY+380)continue;
      box(c,h.x-2,h.y+h.h-3,h.w+4,5,'#415466');box(c,h.x,h.y+h.h-4,h.w,3,h.active?'#f19c89':h.warning?'#ffe69e':'#8fa6a6');
      if(h.active)for(let j=0;j<4;j++)box(c,h.x+j*3,h.y+(j%2)*5,2,h.h-(j%2)*5,'#efae9c');
      if(h.warning){c.fillStyle='#fff2af';c.font='12px monospace';c.fillText('!',h.x+3,h.y+12);}
    }
    const gy=L.goal.y;
    box(c,cx-1,gy-35,2,35,'#8a997e');pixelOval(c,cx-12,gy+5,24,28,'#dfc07b');box(c,cx-16,gy+25,32,8,'#e5cb8a');box(c,cx-13,gy+26,26,3,'#fff0bc');box(c,cx-2,gy+32,4,7,'#b39459');star(c,cx+29,gy+6,.7);
    if(p.grounded)pixelOval(c,p.x-3,p.y+p.h-1,28,4,'#45676444');
    player(c,p.x,p.y,t,p.face,Math.abs(p.vx)>15,!p.grounded,Math.abs(p.vx)>165);
    if(p.pulse>0){const r=(1-p.pulse/.35)*92;for(let i=0;i<12;i++)star(c,p.x+10+Math.cos(i*Math.PI/6)*r,p.y+16+Math.sin(i*Math.PI/6)*r,.55);}
    for(const a of G.particles)box(c,a.x,a.y,2,2,a.color);
    if(p.vy>400&&!reduced)for(let i=0;i<4;i++)box(c,p.x-7+i*12,p.y-17-(i%2)*10,1,12,'#f4f5d499');
    c.restore();
    const wind=G.wind;
    if(wind.phase!=='calm'){
      if(wind.phase==='gust'&&!reduced)for(let i=0;i<13;i++){const x=((i*83+t*wind.direction*200)%w+w)%w,y=100+i*17;box(c,x,y,24,1,'#f8f5d988');}
      box(c,10,12,176,23,'#244d62dd');c.fillStyle='#fff2c5';c.font='10px sans-serif';
      c.fillText(`${wind.direction>0?'→→':'←←'} ${wind.phase==='warning'?'まもなく突風！':'突風！ 逆方向でふんばろう'}`,18,27);
    }
    const meterX=w-17;box(c,meterX,58,3,220,'#315b6144');box(c,meterX,278-G.altitude/L.climbHeight*220,3,G.altitude/L.climbHeight*220,'#f3e4ac');
    for(let i=0;i<=5;i++)box(c,meterX-2,58+i*44,7,1,'#eff0d799');
    star(c,meterX+1,52,.45,'#fff1b5');
    if(G.bestAltitude>0)box(c,meterX-3,278-G.bestAltitude/L.climbHeight*220,9,2,'#c4d8be');
    c.fillStyle=progress>.5?'#f2ebcf':'#385c63';c.font='8px monospace';c.textAlign='right';c.fillText(`${G.altitude}m`,w-27,63);c.fillText(`BEST ${G.bestAltitude}m`,w-27,75);c.textAlign='left';
  }
  function renderHard(c,G,reduced){
    const L=G.level,T=L.theme,p=G.player,w=c.canvas.width,cam=Math.round(G.camera),t=reduced?0:G.time;
    c.imageSmoothingEnabled=false;box(c,0,0,w,360,T.sky);
    pixelOval(c,w-105,35,36,36,'#f6e3b6');
    for(let i=0;i<16;i++){
      const x=i*150-cam*.3,y=210+(i%3)*13;
      if(L.index===4){
        box(c,x,y-65,28,150,'#83ada4');box(c,x-4,y-70,36,7,'#dae0b8');
        c.save();c.translate(x+14,y-45);c.rotate(t*.5+i);for(let k=0;k<4;k++){c.rotate(Math.PI/2);box(c,5,-3,39,6,'#eee6c4');box(c,12,3,28,10,'#bfd0b4');}c.restore();
      }else if(L.index===5){
        box(c,x,y-90,112,160,'#496678');for(let j=0;j<5;j++)box(c,x+j*27,y-90,3,160,'#789993');
        for(let j=0;j<4;j++)box(c,x,y-90+j*35,112,2,'#8ca79a');bush(c,x+15,y+46,65,T);
      }else{
        building(c,x,y+80,68,180+(i%3)*20,'#807c91',1);pixelOval(c,x+20,y-70,29,29,'#e3cfac');
        box(c,x+34,y-66,2,13,'#655967');box(c,x+34,y-54,10,2,'#655967');
      }
    }
    if(L.index!==4)for(let i=0;i<26;i++)box(c,(i*97-cam*.12+w*3)%w,20+i*17%115,2,2,'#f4e4b5');
    box(c,0,329,w,31,L.index===4?'#538f94':'#3c4c68');
    for(let i=0;i<30;i++)box(c,(i*47+t*12)%w,337+i%3*7,18,1,'#a4c7c055');
    c.save();c.translate(-cam,0);
    for(const s of L.platforms){
      if(s.x+s.w<cam-50||s.x>cam+w+50)continue;
      if(s.down>0){for(let x=s.x;x<s.x+s.w;x+=10)box(c,x,s.y,5,2,'#e6d9e299');continue;}
      const color={ground:'#a9be96',shelf:'#c4cfac','sky-mover':'#75d1ce','sky-crumble':'#d8ac73',fade:'#bda0dc',spring:'#eaa6b3',conveyor:'#e9cc77'}[s.kind];
      box(c,s.x,s.y,s.w,s.h,s.kind==='ground'?'#778e81':'#657d80');
      box(c,s.x,s.y,s.w,4,s.fading&&Math.floor(t*10)%2?'#f6e9ff':color);box(c,s.x+3,s.y+5,s.w-6,3,'#d3d9bf');
      c.fillStyle='#304951';c.font='10px monospace';c.textAlign='center';
      if(s.kind==='sky-mover'){box(c,s.origin-s.amplitude,s.y+19,s.w+s.amplitude*2,1,'#d9e5c477');c.fillText('↔',s.x+s.w/2,s.y+12);}
      if(s.kind==='conveyor')for(let x=s.x+9;x<s.x+s.w;x+=17)c.fillText(s.belt>0?'›':'‹',x,s.y+12);
      if(s.kind==='spring')c.fillText('↑ ↑ ↑',s.x+s.w/2,s.y+12);
      if(s.kind==='fade')c.fillText(s.fading?'! ! !':'· ◇ ·',s.x+s.w/2,s.y+12);
      if(s.kind==='sky-crumble'){for(let x=s.x+12;x<s.x+s.w-5;x+=18){box(c,x,s.y+3,2,5,'#735440');box(c,x-2,s.y+8,2,4,'#735440');}if(s.crack)box(c,s.x,s.y-5,s.w*s.crack/.8,2,'#f39774');}
      c.textAlign='left';
    }
    for(const h of L.hazards){box(c,h.x-3,h.y+h.h-3,h.w+6,6,'#403e4e');box(c,h.x,h.y+h.h-4,h.w,3,h.active?'#ec947d':h.warning?'#ffdf78':'#9aa5a3');
      if(h.active){for(let j=0;j<4;j++)box(c,h.x+2+j*3,h.y+(j%2)*6,2,h.h-(j%2)*6,'#f2a496');}
      if(h.warning){c.fillStyle='#fff0a7';c.font='12px monospace';c.fillText('!',h.x+4,h.y+14);}
    }
    for(const cp of L.checkpoints)bench(c,cp.x,cp.y,cp.used);
    for(const s of L.stars)if(!s.got)star(c,s.x+4,s.y+6,.6);
    for(const a of L.items)if(!a.got){star(c,a.x+8,a.y+8+Math.sin(t*2)*2,1.1,['#f4d894','#d4ecc0','#ecd4f5'][L.index-4]);box(c,a.x+5,a.y+5,6,6,'#edf4d0');}
    const gx=L.goal.x;box(c,gx,225,105,75,'#d2ccb4');box(c,gx-7,220,119,7,T.leaf);box(c,gx+36,253,30,47,'#375865');
    c.fillStyle='#355769';c.font='8px monospace';c.fillText('REST & REPAIR',gx+6,243);
    if(p.invuln<=0||Math.floor(p.invuln*13)%2===0)player(c,p.x,p.y,t,p.face,Math.abs(p.vx)>15,!p.grounded,Math.abs(p.vx)>165);
    if(p.pulse>0)for(let i=0;i<8;i++)star(c,p.x+10+Math.cos(i*Math.PI/4)*60*(1-p.pulse/.35),p.y+15+Math.sin(i*Math.PI/4)*60*(1-p.pulse/.35),.5);
    for(const a of G.particles)box(c,a.x,a.y,2,2,a.color);c.restore();
    const wind=G.wind;if(wind.phase!=='calm'){box(c,10,34,156,20,'#29465add');c.font='10px sans-serif';c.fillStyle='#fff0c5';c.fillText(`${wind.direction>0?'→→':'←←'} ${wind.phase==='warning'?'突風が来る！':'突風！ 逆方向に調整'}`,17,48);}
    box(c,10,344,w-20,3,'#dce4d144');box(c,10,344,(w-20)*p.x/L.width,3,'#f4deaa');
  }
  function render(c,G,reduced=false){if(G.level.vertical){renderSky(c,G,reduced);return;}if(G.level.hard){renderHard(c,G,reduced);return;}const L=G.level,T=L.theme,t=reduced?0:G.time,cam=Math.round(G.camera);c.imageSmoothingEnabled=false;box(c,0,0,640,360,T.sky);
    pixelOval(c,493-cam*.04,41,48,48,L.index===2?'#f4c98e':'#f9eed0');
    for(let i=0;i<7;i++){const x=((i*174-cam*.12)%940+940)%940-100;cloud(c,x,45+(i%3)*21,.8+(i%2)*.3,'#f8f3df');}
    // Four independent parallax layers, all low-resolution pixel drawing.
    for(let i=-1;i<11;i++){const x=i*116-(cam*.17%116);building(c,x,228,78+(i%3)*12,58+((i+9)*37%85),T.haze,L.index===2);}
    for(let i=-1;i<12;i++){const x=i*81-(cam*.3%81);pixelOval(c,x,205-(i%3)*14,108,95,T.far);}
    box(c,0,264,640,96,L.index===2?'#c7bda0':'#d1d7ab');box(c,0,278,640,3,'#ffffff33');
    for(let i=-1;i<12;i++){const x=i*75-(cam*.46%75);box(c,x,251,3,32,'#b2b99b');box(c,x-2,251,7,3,'#bcc6a5');box(c,x,258,75,3,'#b8c2a0');box(c,x,271,75,3,'#b8c2a0');}
    c.save();c.translate(-cam,0);
    for(let i=0;i<12;i++){const x=180+i*224;if(x<cam-150||x>cam+780)continue;if(L.index===0)tree(c,x,298,.8+(i%3)*.15,T,i%2);else if(i%2===0){building(c,x-35,298,90,89+(i%3)*17,['#d3c7aa','#d7c3a5','#bbc3aa'][i%3],L.index===2);box(c,x-38,255,96,12,i%3?'#90a98a':'#c88e72');for(let a=0;a<6;a++)box(c,x-36+a*16,255,8,12,'#f3e6c6');}else tree(c,x,298,.75,T);}
    if(L.index>0){for(let i=0;i<25;i++){const x=i*110;box(c,x,153+(i%2)*7,110,1,'#aa9275');box(c,x+45,154+(i%2)*7,2,8,'#aa9275');pixelOval(c,x+42,160+(i%2)*7,8,11,'#f1d5a0');}}
    // Gaps are blue streams, never disguised as walkable ground.
    box(c,0,318,L.width,42,L.index===2?'#98a5a5':'#94b8ad');for(let i=0;i<130;i++)box(c,i*23+(Math.floor(t*6)%10),329+(i%3)*8,11,1,'#daead0');
    for(const p of L.platforms){if(p.x+p.w<cam-10||p.x>cam+650)continue;
      if(p.kind==='ground'){box(c,p.x,p.y,p.w,p.h,T.soil);box(c,p.x,p.y,p.w,5,T.top);box(c,p.x,p.y+5,p.w,3,'#6d8b53');box(c,p.x,p.y+8,p.w,3,'#d8c393');for(let x=p.x+7;x<p.x+p.w-3;x+=18){box(c,x,p.y+15+(x%9),3,2,'#9e906d');box(c,x+5,p.y+35+(x%7),4,2,'#dac69e');}for(let x=p.x+8;x<p.x+p.w-8;x+=28){box(c,x,p.y-3,1,3,T.top);box(c,x-2,p.y-2,2,1,T.top);} }
      else if(p.kind==='mover'){box(c,p.x+4,p.y,p.w-8,5,'#9ac282');box(c,p.x,p.y+4,p.w,4,'#70966b');box(c,p.x+7,p.y+8,p.w-14,3,'#557b59');box(c,p.x+8,p.y+3,p.w-16,1,'#d0dda0');}
      else{box(c,p.x,p.y,p.w,4,L.index===2?'#a9a087':'#abc28b');box(c,p.x+2,p.y+4,p.w-4,7,'#a48a63');box(c,p.x+4,p.y+6,p.w-8,2,'#c0a677');box(c,p.x+8,p.y+11,3,5,'#6e9466');box(c,p.x+p.w-12,p.y+11,3,8,'#82a475');}
    }
    for(const cp of L.checkpoints)bench(c,cp.x,cp.y,cp.used);
    sign(c,155,267,'GO SLOW →');sign(c,2320,267,'HOME →');
    for(const p of L.platforms.filter(p=>p.kind==='ground')){bush(c,p.x+p.w-75,299,46,T);for(let i=0;i<3;i++){const x=p.x+35+i*30;box(c,x,294,1,6,'#738f61');box(c,x-2,292,5,3,i%2?'#f1d893':'#e8b3a0');box(c,x,291,1,5,'#efdfb3');}}
    for(const s of L.stars)if(!s.got&&s.x>cam-20&&s.x<cam+660)star(c,s.x+4,s.y+6+Math.sin(t*3+s.x)*2,.7);
    for(const item of L.items)if(!item.got){const y=item.y+Math.sin(t*2.5)*2;pixelOval(c,item.x-5,y-3,27,28,'#f5e7b455');box(c,item.x,y,17,20,'#775947');box(c,item.x+2,y+1,14,17,['#deab6b','#e3d6ac','#b4c998'][L.index]);box(c,item.x+3,y+2,2,15,'#fff1c6');box(c,item.x+7,y+5,6,1,'#967b55');box(c,item.x+7,y+8,6,1,'#967b55');box(c,item.x+8,y+14,3,7,'#bd6855');star(c,item.x+19,y-4,.45);}
    goal(c,L);for(const e of L.enemies)if(e.x>cam-40&&e.x<cam+680)enemy(c,e,t);
    const p=G.player;pixelOval(c,p.x-3,p.grounded?p.y+p.h-1:300,28,4,'#50684433');
    if(p.invuln<=0||Math.floor(p.invuln*13)%2===0)player(c,p.x,p.y,t,p.face,Math.abs(p.vx)>15,!p.grounded,Math.abs(p.vx)>165);
    if(p.pulse>0){const r=(1-p.pulse/.35)*92;for(let i=0;i<12;i++)star(c,p.x+10+Math.cos(i*Math.PI/6)*r,p.y+16+Math.sin(i*Math.PI/6)*r,.55);}
    for(const a of G.particles)box(c,a.x,a.y,2,2,a.color);
    c.restore();
    // Sparse drifting leaves reinforce depth without masking the route.
    if(!reduced)for(let i=0;i<7;i++){const x=((i*131+t*7-cam*.7)%700+700)%700-25,y=82+(i*37+t*9)%190;box(c,x,y,3,2,'#d2b57488');}
  }
  root.MiitobowArt={render,player,star,box};
})(window);

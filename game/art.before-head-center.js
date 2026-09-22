(function(root){
  'use strict';
  const palette={o:'#573e2c',b:'#9c532b',c:'#b56b37',d:'#c98045',e:'#d99557',g:'#28573a',h:'#36764b',i:'#4c9460',j:'#70ad76',p:'#292c2a',q:'#42433c',r:'#b74734',s:'#de7350',w:'#fff8e6',k:'#252e29'};
  // Original 24 × 34 pixel silhouette, drawn by hand from the supplied character sheet.
  const head=[
    '        oooooooo        ',
    '     oooccccccccooo     ',
    '    obccdddddddcccco    ',
    '   obccdddeeddddcccco   ',
    '  obccddeeeddddddccco  ',
    '  obccddddddddddddccbo  ',
    ' obcccddddddddddccccbo ',
    ' obccddddddddddddcccbo ',
    ' obccwwwddddddwwwcccbo ',
    ' obcwwkwwddddwwkwwccbo ',
    ' obcwwkkwddddwwkkwccbo ',
    ' obccwwwccccccwwwcccbo ',
    ' obccccccccccccccccbo ',
    '  obcccccckkcccccccbo  ',
    '  obbcccccccccccccbo   ',
    '   obbbcccccccccbbo    ',
    '    oobbbbbbbbboo      ',
    '      oogggggoo        '
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
    head.forEach((row,yy)=>[...row].forEach((ch,xx)=>{if(palette[ch])box(c,xx,yy-2,1,1,palette[ch]);}));c.restore();
  }
  function cloud(c,x,y,s,color){pixelOval(c,x,y+8*s,48*s,13*s,color);pixelOval(c,x+9*s,y,20*s,23*s,color);pixelOval(c,x+24*s,y+4*s,17*s,17*s,color);}
  function tree(c,x,y,size,T,variant=0){c.save();c.translate(Math.round(x),Math.round(y));c.scale(size,size);box(c,-4,-56,9,60,'#8e8360');box(c,1,-50,3,52,'#706e51');box(c,-12,-47,13,5,'#8e8360');box(c,4,-38,14,5,'#8e8360');pixelOval(c,-34,-109,64,67,T.leaf);pixelOval(c,-44,-84,41,45,T.leaf);pixelOval(c,6,-84,38,43,T.leaf);pixelOval(c,-28,-110,50,40,'#87b17b');pixelOval(c,-35,-86,25,26,'#8ab47d');pixelOval(c,10,-78,23,26,'#79a975');for(let i=0;i<9;i++)box(c,-25+(i*17%52),-92+(i*13%46),3,2,'#b4cc90');if(variant)for(let i=0;i<5;i++)box(c,-22+i*11,-69-(i%2)*15,3,4,'#e5b976');c.restore();}
  function bush(c,x,y,w,T){pixelOval(c,x,y-13,w,22,T.leaf);pixelOval(c,x+5,y-18,w*.5,23,'#85aa74');for(let i=4;i<w;i+=12)box(c,x+i,y-4,2,2,'#c2d39d');}
  function building(c,x,base,w,h,color,style=0){box(c,x,base-h,w,h,color);box(c,x-3,base-h-5,w+6,5,'#8d9e84');box(c,x+5,base-h+4,w-10,3,'#ffffff22');for(let yy=base-h+18;yy<base-15;yy+=24)for(let xx=x+10;xx<x+w-8;xx+=23){box(c,xx,yy,12,16,'#788f80');box(c,xx+2,yy+2,8,10,style?'#edd2a0':'#d7e5cc');box(c,xx+6,yy+2,1,12,'#98aa90');box(c,xx-1,yy+15,14,2,'#bbc7ae');}}
  function bench(c,x,y,used=false){box(c,x-15,y-22,36,4,'#a7754e');box(c,x-15,y-16,36,4,'#bb8c5c');box(c,x-18,y-10,42,4,'#c49665');box(c,x-12,y-6,3,6,'#52705b');box(c,x+16,y-6,3,6,'#52705b');box(c,x-11,y-25,2,16,'#52705b');box(c,x+16,y-25,2,16,'#52705b');if(used){box(c,x+28,y-32,2,32,'#688b68');box(c,x+30,y-32,11,8,'#bbd88e');box(c,x+33,y-30,4,3,'#5b915c');}}
  function sign(c,x,y,text){box(c,x+16,y,3,33,'#8f7753');box(c,x,y-2,42,16,'#f0e2bb');box(c,x,y-2,42,2,'#a18c63');c.fillStyle='#62744e';c.font='6px monospace';c.textAlign='center';c.fillText(text,x+21,y+8);c.textAlign='left';}
  function enemy(c,e,t){const sleepy=e.stun>0;const x=Math.round(e.x),y=Math.round(e.y);if(e.type==='paper'){pixelOval(c,x,y,23,20,'#887c6b');pixelOval(c,x+1,y,20,17,'#e6dec1');box(c,x+5,y+2,9,2,'#fdf5d9');box(c,x+3,y+6,3,6,'#c3b79c');box(c,x+8,y+5,3,2,'#baad91');box(c,x+13,y+11,6,2,'#c5b89b');box(c,x+7,y+8,2,sleepy?1:3,'#58614e');box(c,x+15,y+8,2,sleepy?1:3,'#58614e');box(c,x+9,y+17,4,3,'#7b7961');box(c,x+18,y+17,4,3,'#7b7961');}else{cloud(c,x-5,y-8,.65,sleepy?'#d4d9c7':'#91a5ac');box(c,x+7,y+5,2,sleepy?1:3,'#526775');box(c,x+18,y+5,2,sleepy?1:3,'#526775');if(!sleepy)for(let i=0;i<3;i++)box(c,x+4+i*8,y+18+(t*18+i*4)%10,1,4,'#a1b7bf');}if(sleepy){c.fillStyle='#687764';c.font='8px monospace';c.fillText('z',x+17,y-5-Math.sin(t*3)*2);}}
  function goal(c,L){let x=L.goal.x,y=300;const T=L.theme;box(c,x,y-67,102,67,'#e8d4ac');box(c,x+4,y-61,94,59,'#f6e7c5');box(c,x-8,y-72,118,8,T.leaf);box(c,x,y-80,102,8,T.leaf);box(c,x+9,y-86,84,6,T.leaf);box(c,x+34,y-45,30,45,'#6d8163');box(c,x+38,y-40,22,40,'#3e624f');box(c,x+53,y-21,3,3,'#ebce8a');for(const xx of[x+10,x+74]){box(c,xx,y-43,17,23,'#a99c75');box(c,xx+2,y-41,13,18,'#f5dca1');box(c,xx+8,y-41,1,18,'#b89f73');}box(c,x+25,y-68,51,15,'#f4ead1');c.font='7px monospace';c.fillStyle='#486746';c.textAlign='center';c.fillText(['REST HOUSE','SLOW COFFEE','LIBRARY'][L.index],x+51,y-58);c.textAlign='left';box(c,x+6,y-7,20,7,'#b78662');box(c,x+76,y-7,20,7,'#b78662');bush(c,x+7,y-10,18,T);bush(c,x+77,y-10,18,T);}
  function render(c,G,reduced=false){const L=G.level,T=L.theme,t=reduced?0:G.time,cam=Math.round(G.camera);c.imageSmoothingEnabled=false;box(c,0,0,640,360,T.sky);
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

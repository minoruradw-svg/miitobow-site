(function (root) {
  'use strict';
  const W = 640, H = 360;
  const themes = [
    {name:'こもれび公園',sub:'WOODLAND WALK',item:'おさんぽノート',goal:'森の休憩所',sky:'#e1edcf',haze:'#c8ddbb',far:'#a4c59c',leaf:'#689c70',top:'#86ad65',soil:'#bda77f',accent:'#f3d58a'},
    {name:'まどろみ商店街',sub:'COFFEE & LITTLE STREETS',item:'コーヒーのお便り',goal:'街角のカフェ',sky:'#eee4ce',haze:'#d9d6bb',far:'#a6bcab',leaf:'#779d7c',top:'#a6b479',soil:'#bc9e87',accent:'#e5a184'},
    {name:'ゆうやけ図書館',sub:'ONE MORE PAGE',item:'なくしたしおり',goal:'夕暮れの図書館',sky:'#eed2b9',haze:'#dbbdad',far:'#b6a7a5',leaf:'#758e88',top:'#9ca17b',soil:'#aa9084',accent:'#edb880'},
    {name:'天空の庭',sub:'THE GARDEN ABOVE THE CLOUDS',item:'空のかけら',goal:'天空の鐘',sky:'#b7d8df',haze:'#d8e7db',far:'#83acb7',leaf:'#6f9783',top:'#afc998',soil:'#a2ada0',accent:'#f8df96'}
  ];
  const rect = (x,y,w,h,kind='ground')=>({x,y,w,h,kind});
  themes.push(
    {...themes[0],name:'風車の水路',sub:'WINDMILL CROSSING',item:'風車の歯車',goal:'風車小屋',sky:'#c6dfd6',far:'#79aaa2'},
    {...themes[1],name:'月あかりの温室',sub:'MOONLIGHT GREENHOUSE',item:'月の種',goal:'夜の温室',sky:'#354a64',far:'#536e85',leaf:'#799a9a'},
    {...themes[2],name:'星降る時計塔',sub:'CLOCKWORK SUMMIT',item:'時計のかけら',goal:'時計塔',sky:'#71687f',far:'#99899b',leaf:'#718e94'}
  );
  function createHardLevel(index){
    const difficulty=index-4,platforms=[rect(0,300,280,80)],patterns=[
      ['sky-mover','conveyor','sky-crumble','shelf'],
      ['fade','sky-crumble','shelf','fade'],
      ['sky-mover','fade','sky-crumble','conveyor']
    ];
    for(let i=1;i<=24;i++){
      let y=[300,252,208,252][i%4],kind=patterns[difficulty][(i-1)%4];
      if(i%6===0||i===9||i===17)kind='shelf';
      if(i===8||i===16)kind='spring';
      if(i===9||i===17)y=190;
      const x=290+(i-1)*108,w=i%6===0?102:86-difficulty*8;
      platforms.push({...rect(x,y,w,14,kind),origin:x,amplitude:20+difficulty*4,rate:1.2+difficulty*.25,phase:0,dx:0,crack:0,down:0,step:i,belt:i%2?50:-50});
    }
    platforms.push(rect(2890,300,350,80));
    const items=[6,14,22].map((n,id)=>{const s=platforms[n];return{x:s.x+s.w/2-8,y:s.y-23,w:17,h:20,got:false,id,platform:n};});
    const stars=platforms.slice(1,-1).map((s,i)=>({x:s.x+s.w/2-4,y:s.y-23,w:9,h:12,got:false,platform:i+1}));
    const checkpoints=[{x:96,y:300,used:true},{x:platforms[12].x+30,y:300,used:false}];
    const hazards=[4,20].map((n,i)=>({x:platforms[n].x+40,y:platforms[n].y-38,w:16,h:38,phase:i*1.4,active:false,warning:false}));
    return{index,hard:true,number:index,theme:themes[index],width:3240,platforms,items,stars,checkpoints,hazards,enemies:[],goal:{x:3100,y:220,w:110,h:80}};
  }
  themes.push({...themes[3],name:'天空の庭 Ver.2',sub:'THE HUNDRED STEPS',goal:'百段の鐘'});
  function createSkyLevel(v2=false){
    const baseY=v2?5140:2740,platforms=[rect(0,baseY,800,80,'sky-base')];
    // A continuous, hand-shaped zigzag route. The outer shafts stay open to the base.
    // 50 × 48px rises = 2,400m in the game's altitude display.
    const path=[130,205,285,370,455,540,605,535,455,375,295,215,145,225,305,385,465,545,610,530,450,370,290,210,140,220,300,380,460,540,605,525,445,365,285,205,140,220,300,380,460,540,605,530,450,370,290,210,285,370];
    const route=v2?Array.from({length:100},(_,i)=>[150,225,300,375,450,525,600,525,450,375,300,225][i%12]):path;
    route.forEach((x,i)=>{
      const terrace=(i+1)%10===0,w=terrace?126:v2?(i<30?76:i<60?64:56):i<10?82:i<30?70:62;
      const step=i+1,kind=terrace?'sky-terrace':v2?['sky-stone','sky-stone','sky-mover','ice','sky-crumble','fade','sky-stone','conveyor','spring','sky-stone'][step%10]:step>2&&step%3===0?'sky-mover':step>4&&step%3===2?'sky-crumble':'sky-stone';
      platforms.push({...rect(x,baseY-step*48,w,terrace?23:14,kind),step,origin:x,amplitude:v2?28:step<20?25:38,rate:v2?1.5+i*.006:step<20?1.1:1.4,phase:0,dx:0,crack:0,down:0,belt:step%20<10?58:-58});
    });
    const summit=platforms.at(-1);
    // The top terrace is deliberately broader, with the bell above its centre.
    summit.w=154;
    const itemSteps=v2?[23,53,83]:[13,27,41];
    const items=itemSteps.map((step,id)=>{const p=platforms[step];return{x:p.x+p.w/2-8,y:p.y-23,w:17,h:20,got:false,id};});
    const stars=platforms.slice(1).map(p=>({x:p.x+p.w/2-4,y:p.y-23,w:9,h:12,got:false,platform:p.step}));
    items.forEach((item,i)=>item.platform=itemSteps[i]);
    const hazards=v2?[29,49,69,89].map((n,i)=>({x:platforms[n].x+platforms[n].w-19,y:platforms[n].y-30,w:14,h:30,phase:i*1.3,active:false,warning:false})):[];
    return{index:v2?7:3,v2,vertical:true,theme:themes[v2?7:3],width:800,height:baseY+60,baseY,climbHeight:route.length*48,spawn:{x:105,y:baseY-36},platforms,items,stars,hazards,enemies:[],checkpoints:[],goal:{x:summit.x+summit.w/2-21,y:summit.y-67,w:42,h:67}};
  }
  function createLevel(index){
    if(index===3)return createSkyLevel();
    if(index===7)return createSkyLevel(true);
    if(index>=4&&index<=6)return createHardLevel(index);
    const layouts=[
      [[0,610],[690,560],[1340,560],[1980,670]],
      [[0,510],[600,560],[1250,570],[1920,730]],
      [[0,510],[610,510],[1230,560],[1900,750]]
    ];
    const platforms=layouts[index].map(([x,w])=>rect(x,300,w,80));
    const shelves=[
      [[280,252,98],[440,210,82],[760,248,100],[945,203,90],[1120,247,80],[1390,251,94],[1560,205,92],[1760,246,90],[2050,252,110],[2250,210,92]],
      [[270,252,90],[445,213,80],[655,252,100],[820,208,92],[1000,245,92],[1300,253,100],[1470,210,90],[1680,248,90],[1975,250,100],[2150,207,100]],
      [[260,250,90],[445,211,80],[655,250,94],[830,205,90],[1030,248,80],[1280,250,100],[1460,204,90],[1670,245,100],[1970,251,100],[2150,208,95]]
    ][index];
    platforms.push(...shelves.map(([x,y,w])=>rect(x,y,w,12,'shelf')));
    // Moving leaf ferries traverse the gaps; a regular jump also clears every gap.
    const movers=[rect(layouts[index][1][0]-65,264,54,12,'mover'),rect(layouts[index][3][0]-65,263,54,12,'mover')];
    movers.forEach((p,i)=>Object.assign(p,{origin:p.x,phase:i*2,dx:0}));platforms.push(...movers);
    const items=[1,6,9].map((s,i)=>({x:shelves[s][0]+shelves[s][2]/2-8,y:shelves[s][1]-23,w:17,h:20,got:false,id:i}));
    const stars=[];
    shelves.forEach(([x,y,w])=>{for(let j=0;j<3;j++) stars.push({x:x+16+j*(w-32)/2,y:y-21,w:9,h:12,got:false});});
    for(const [x,w] of layouts[index]) for(let j=x+120;j<x+w-30;j+=125)stars.push({x:j,y:272,w:9,h:12,got:false});
    const enemies=[{x:820,y:280,lo:730,hi:1010,type:'paper'},{x:1640,y:280,lo:1510,hi:1780,type:'paper'},{x:2260,y:280,lo:2160,hi:2370,type:'paper'},
      {x:1100,y:219,lo:990,hi:1180,type:'cloud'},{x:1810,y:205,lo:1690,hi:1890,type:'cloud'}].map((e,i)=>({...e,w:e.type==='paper'?23:30,h:20,vx:(i%2?-1:1)*(22+index*8),baseY:e.y,stun:0,phase:i*1.8}));
    return {index,theme:themes[index],width:2650,platforms,items,stars,enemies,checkpoints:[{x:90,y:300,used:true},{x:1380,y:300,used:false}],goal:{x:2480,y:220,w:110,h:80}};
  }
  const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  class Game {
    constructor(){this.stage=0;this.score=0;this.mode='title';this.events=[];this.time=0;this.deaths=0;this.load(0);this.mode='title';}
    load(stage){this.stage=stage;this.level=createLevel(stage);const spawn=this.level.spawn||{x:96,y:260};this.checkpoint=spawn.x;this.time=0;this.goalHint=0;this.camera=0;this.cameraY=this.level.vertical?this.level.height-H:0;this.bestAltitude=0;this.fallFrom=null;this.particles=[];this.player={...spawn,w:20,h:36,vx:0,vy:0,face:1,grounded:false,coyote:0,buffer:0,hp:3,invuln:0,cooldown:0,pulse:0};this.mode='playing';this.events=[];this.previous={};}
    restart(stage=0){this.score=0;this.deaths=0;this.load(stage);}
    get altitude(){return this.level.vertical?Math.max(0,Math.min(this.level.climbHeight,Math.floor(this.level.baseY-this.player.y-this.player.h))):0;}
    get wind(){
      const L=this.level,exposed=L.hard?(L.index!==5&&this.player.x>700&&this.player.x<2850):(L.vertical&&this.altitude>=650&&this.altitude<=L.climbHeight-100);
      if(!exposed)return{phase:'calm',force:0,direction:1};
      const cycle=Math.floor(this.time/8),t=this.time%8,direction=cycle%2?-1:1;
      return{phase:t<4?'calm':t<5.2?'warning':t<7.2?'gust':'calm',direction,force:t>=5.2&&t<7.2?direction*(L.v2?85:65):0};
    }
    emit(type,text){this.events.push({type,text});}
    burst(x,y,color,n=10){for(let i=0;i<n;i++)this.particles.push({x,y,vx:Math.cos(i*2.4)*40,vy:-35-Math.sin(i*1.7)*30,life:.6,color});}
    damage(fall=false){const p=this.player;if(!fall&&p.invuln>0)return;p.hp-=1;this.emit('hurt',fall?'ゆっくりで大丈夫。もういちど！':'キラリで少しおやすみしてもらおう。');p.invuln=1.8;p.vy=-180;p.vx=-p.face*110;
      if(fall||p.hp<=0){this.deaths++;p.hp=3;p.x=this.checkpoint;p.y=this.level.vertical?this.level.spawn.y:250;p.vx=0;p.vy=0;p.grounded=false;p.coyote=0;p.buffer=0;this.camera=Math.max(0,p.x-210);this.cameraY=this.level.vertical?this.level.height-H:0;this.emit('respawn',this.level.vertical?'地上の庭から、もういちど。':'ベンチから、もういちど。落としものはそのまま。');}}
    step(dt,input={}){
      if(this.mode!=='playing')return;dt=Math.min(dt,1/30);this.time+=dt;
      const p=this.player,L=this.level,oldBottom=p.y+p.h,wasGrounded=p.grounded;
      for(const s of L.platforms){
        if(s.kind==='fade'){const phase=(this.time+s.step*.23)%4.5;s.down=phase>=3.1?1:0;s.fading=phase>=2.3&&phase<3.1;}
        if(s.kind==='sky-mover'){const last=s.x;s.x=s.origin+Math.sin(this.time*s.rate+s.phase)*s.amplitude;s.dx=s.x-last;
          if(wasGrounded&&Math.abs(oldBottom-s.y)<.01&&p.x+p.w>s.x-s.dx&&p.x<s.x-s.dx+s.w)p.x+=s.dx;
        }
        if(s.kind==='sky-crumble'){
          if(s.down>0)s.down=Math.max(0,s.down-dt);
          else if(s.crack>0){s.crack=Math.max(0,s.crack-dt);if(s.crack===0){s.down=3;this.burst(s.x+s.w/2,s.y,'#c89965',12);}}
        }
      }
      if(L.vertical||L.hard)for(const item of [...L.stars,...L.items]){const support=L.platforms[item.platform];if(support)item.x=support.x+support.w/2-item.w/2;}
      p.invuln=Math.max(0,p.invuln-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.pulse=Math.max(0,p.pulse-dt);
      if(input.jump&&!this.previous.jump)p.buffer=.13;else p.buffer=Math.max(0,p.buffer-dt);
      p.coyote=p.grounded?.11:Math.max(0,p.coyote-dt);
      const direction=(input.right?1:0)-(input.left?1:0),speed=input.dash?205:142;
      const icy=p.grounded&&L.platforms.some(s=>s.kind==='ice'&&Math.abs(oldBottom-s.y)<.01&&p.x+p.w>s.x&&p.x<s.x+s.w);
      p.vx+=(direction*speed-p.vx)*Math.min(1,dt*(icy?(direction?3:0.6):p.grounded?15:8));if(direction)p.face=direction;
      if(p.buffer>0&&p.coyote>0){p.vy=-338;p.grounded=false;p.coyote=0;p.buffer=0;this.emit('jump');}
      if(!input.jump&&this.previous.jump&&p.vy<-130&&!p.springBoost)p.vy=-130;
      if(input.spark&&!this.previous.spark&&p.cooldown<=0){p.cooldown=1.15;p.pulse=.35;this.emit('spark');this.burst(p.x+10,p.y+15,'#ffdf80',16);for(const e of L.enemies)if(Math.hypot(e.x-p.x,e.y-p.y)<95){e.stun=4;this.burst(e.x+10,e.y,'#fff0bb');}}
      const drift=this.wind.force*(p.grounded?.25:1);
      p.vy=Math.min(540,p.vy+880*dt);p.x=Math.max(0,Math.min(L.width-p.w,p.x+(p.vx+drift)*dt));p.y+=p.vy*dt;p.grounded=false;
      let landing=null;
      for(const s of L.platforms){if(s.kind==='mover'){const last=s.x;s.x=s.origin+Math.sin(this.time*1.2+s.phase)*26;s.dx=s.x-last;}
        if(s.down>0)continue;
        if(p.vy>=0&&oldBottom<=s.y+2&&p.y+p.h>=s.y&&p.x+p.w>s.x+1&&p.x<s.x+s.w-1&&(!landing||s.y<landing.y))landing=s;}
      if(landing){p.y=landing.y-p.h;p.vy=0;p.grounded=true;p.springBoost=false;if(landing.kind==='mover')p.x+=landing.dx||0;}
      if(landing&&landing.kind==='sky-crumble'&&!landing.crack){landing.crack=.8;this.emit('crack','ひび割れ足場！ 0.8秒で崩れます。');}
      if(landing&&landing.kind==='conveyor')p.x=Math.max(0,Math.min(L.width-p.w,p.x+landing.belt*dt));
      if(landing&&landing.kind==='spring'){p.vy=-470;p.grounded=false;p.coyote=0;p.springBoost=true;this.emit('bounce','ばね床！ 空中で左右に調整しよう。');}
      for(const h of L.hazards||[]){const phase=(this.time+h.phase)%4;h.warning=phase>=1.8&&phase<2.6;h.active=phase>=2.6;if(h.active&&overlaps(p,h))this.damage();}
      for(const s of L.stars)if(!s.got&&overlaps(p,s)){s.got=true;this.score++;this.emit('coin');this.burst(s.x,s.y,'#f5d579',5);}
      for(const item of L.items)if(!item.got&&overlaps(p,item)){item.got=true;this.score+=10;this.emit('item',`${L.theme.item} ${L.items.filter(i=>i.got).length} / 3`);this.burst(item.x,item.y,'#fff3b0',18);}
      for(const cp of L.checkpoints)if(!cp.used&&Math.abs(p.x-cp.x)<34&&p.y>235){cp.used=true;this.checkpoint=cp.x;p.hp=3;this.emit('checkpoint','ひとやすみ。体力回復＆ここから再開！');this.burst(cp.x,265,'#b9e286',15);}
      for(const e of L.enemies){e.stun=Math.max(0,e.stun-dt);if(e.stun>0)continue;e.x+=e.vx*dt;if(e.x<e.lo||e.x>e.hi){e.x=Math.max(e.lo,Math.min(e.hi,e.x));e.vx*=-1;}if(e.type==='cloud')e.y=e.baseY+Math.sin(this.time*2+e.phase)*15;
        if(overlaps(p,{x:e.x+3,y:e.y+3,w:e.w-6,h:e.h-3})){if(p.vy>40&&oldBottom<=e.y+8){e.stun=3;p.vy=-230;this.emit('bounce');this.burst(e.x,e.y,'#f5e9c3');}else this.damage();}}
      if(p.y>(L.height||H)+60)this.damage(true);
      if(L.vertical){
        this.bestAltitude=Math.max(this.bestAltitude,this.altitude);
        if(!p.grounded&&wasGrounded)this.fallFrom=oldBottom;
        if(p.grounded&&this.fallFrom!==null){const drop=p.y+p.h-this.fallFrom;if(drop>=180)this.emit('longfall',`${Math.floor(drop)}m 落下…。ここから登りなおそう。`);this.fallFrom=null;}
      }
      const atGoal=L.vertical?overlaps(p,L.goal)&&p.grounded:p.x>L.goal.x+18&&p.grounded;
      if(atGoal){if(L.vertical||L.items.every(i=>i.got)){this.mode='clear';this.emit('clear');}else if(!this.goalHint||this.time-this.goalHint>3){this.goalHint=this.time;this.emit('hint','まだ落としものがあるみたい。道を戻って探してみよう。');}}
      const view=this.viewWidth||W,target=Math.max(0,Math.min(L.width-view,p.x-Math.min(220,view*.35)));this.camera+=(target-this.camera)*Math.min(1,dt*6);
      if(L.vertical){const targetY=Math.max(0,Math.min(L.height-H,p.y-(p.vy>80?125:215)));this.cameraY+=(targetY-this.cameraY)*Math.min(1,dt*9);}
      this.particles=this.particles.filter(a=>(a.life-=dt)>0);for(const a of this.particles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=100*dt;}
      this.previous={...input};
    }
  }
  const api={Game,createLevel,createSkyLevel,themes,overlaps,W,H};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MiitobowEngine=api;
})(typeof window!=='undefined'?window:this);

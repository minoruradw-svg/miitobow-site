(()=>{
  'use strict';
  const $=id=>document.getElementById(id),game=new MiitobowEngine.Game(),canvas=$('game'),ctx=canvas.getContext('2d'),keys=new Set(),touch=new Map();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(new URLSearchParams(location.search).get('stage')==='sky'){game.load(3);game.mode='title';}
  if(new URLSearchParams(location.search).get('stage')==='sky2'){game.load(7);game.mode='title';}
  const selected=Number(new URLSearchParams(location.search).get('stage'));
  if(selected>=1&&selected<=6&&Number.isInteger(selected)){game.load(selected<=3?selected-1:selected);game.mode='title';}
  const nextStage=stage=>stage===2?4:stage+1;
  function resize(){const width=matchMedia('(max-width:700px)').matches?480:640;if(canvas.width!==width)canvas.width=width;game.viewWidth=width;}
  resize();window.addEventListener('resize',resize);
  let last=0,accumulator=0,muted=true,audio=null,nextNote=0,melodyIndex=0,toastUntil=0,modalKind='title',returnMode='title';
  const mapping={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump',KeyX:'spark',KeyK:'spark',ShiftLeft:'dash',ShiftRight:'dash'};
  function input(){const active={};for(const k of keys)active[mapping[k]]=true;for(const a of touch.values())active[a]=true;return active;}
  function clearInput(){keys.clear();touch.clear();}
  function initAudio(){if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)audio=new Audio();}if(audio?.state==='suspended')audio.resume().catch(()=>{});}
  function tone(freq,duration=.1,type='sine',volume=.035,delay=0){if(muted||!audio||audio.state!=='running')return;const at=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+.008);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g);g.connect(audio.destination);o.start(at);o.stop(at+duration+.02);}
  function sound(type){if(type==='coin')tone(880,.08,'triangle',.025);if(type==='jump')tone(392,.12,'triangle');if(type==='spark'||type==='item'||type==='clear')for(let i=0;i<4;i++)tone([523,659,784,1047][i],.18,'triangle',.035,i*.075);if(type==='hurt')tone(130,.18,'triangle');if(type==='checkpoint')tone(660,.3,'sine');if(type==='bounce')tone(493,.12,'triangle');}
  function music(){if(muted||!audio||game.mode!=='playing')return;if(audio.currentTime<nextNote)return;const notes=[392,0,494,587,659,587,494,0,440,0,523,659,587,523,440,0,349,0,440,523,587,523,440,0,392,494,587,784,659,587,494,0];const note=notes[melodyIndex++%notes.length];if(note)tone(note,.21,'triangle',.012);if(melodyIndex%4===0)tone([131,147,110,98][Math.floor(melodyIndex/8)%4],.4,'sine',.018);nextNote=audio.currentTime+.24;}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+2700;}
  function updateHUD(){
    const L=game.level,p=game.player,sky=L.vertical;
    $('level-number').textContent=sky?'EXTRA / ↑':`0${L.hard?game.stage:game.stage+1} / 06${L.hard?' · HARD':''}`;
    $('level-name').textContent=L.theme.name;
    $('star-count').textContent=String(game.score).padStart(3,'0');
    $('item-count').textContent=sky?`${game.altitude}m`:`${L.items.filter(i=>i.got).length} / 3`;
    document.querySelector('.keepsakes').title=sky?'現在の高さ':'落としもの';
    $('hearts').textContent='♥ '.repeat(p.hp)+'♡ '.repeat(3-p.hp);
    $('hearts').setAttribute('aria-label',`体力${p.hp}`);
    $('power-status').textContent=sky?`最高 ${game.bestAltitude}m / ${L.climbHeight}m`:p.cooldown>0?`✦ キラリ ${p.cooldown.toFixed(1)}s`:'✦ キラリ READY';
    $('objective').textContent=sky?'水色 ↔ 移動 / 茶色：崩れる / 突風に注意':L.items.every(i=>i.got)?`${L.theme.goal}へ届けよう！ →`:`${L.theme.item}を 3 つ集めよう。`;
    $('pause').disabled=game.mode!=='playing';
    document.querySelector('.game-shell').classList.toggle('sky-mode',!!sky);
    document.querySelector('.location').textContent=sky?'THE GARDEN ABOVE THE CLOUDS ↑':'MIITOBOW TOWN ↗';
    document.querySelectorAll('[data-stage]').forEach(el=>{const current=+el.dataset.stage===game.stage;el.classList.toggle('active',current);if(current)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');});
  }
  const modalCopy={
    title:['LET’S TAKE THE LONG WAY HOME','今日は、よりみち。','風に飛ばされた、3つの落としもの。<br>キラリを集めて、街の向こうへ届けよう。','よりみちをはじめる →'],
    pause:['TAKE YOUR TIME','ちょっと、ひとやすみ。','急がなくて大丈夫。<br>準備ができたら、冒険のつづきを。','つづきから遊ぶ →'],
    help:['HOW TO PLAY','よりみちの、しかた。','ジャンプとキラリで、小さな冒険へ。','閉じる →']
  };
  function showModal(kind){
    modalKind=kind;clearInput();const sky=game.level.vertical,final=game.stage===6;
    let copy=modalCopy[kind];
    if(kind==='title'&&sky)copy=['EXTRA STAGE · 2,400m SKY CLIMB','雲の上まで、どこまでも。','動く足場、崩れる石、吹き抜ける突風。<br>足を踏み外すと、下の足場まで落下。<br>長押しジャンプ＋Shiftで遠くへ！','天空の庭にのぼる ↑'];
    if(kind==='title'&&game.level.hard)copy=[`HARD STAGE 0${game.stage}`,game.level.theme.name,['流れるベルト、動く渡し舟、横風。','消える足場と、崩れるガラスの回廊。','風・移動・崩落・消失が重なる最終試練。'][game.stage-4]+'<br>ばね床で高く跳び、噴気は止むのを待とう。<br>落としもの3つを集めて、右端へ。','難関ステージに挑戦 →'];
    if(kind==='clear')copy=sky?['THE SKY IS YOURS','天空の庭に、到着。',`2,400mの頂上に、ミートボーの鐘が響きました。<br>キラリ：${game.score} ／ 空のかけら：${game.level.items.filter(i=>i.got).length} / 3`,'もういちど天空へ ↑']:[final?'ALL STAGES COMPLETE':'A LITTLE KINDNESS, DELIVERED',final?'難関ルート、踏破！':'お届け、できました。',final?`最後の時計のかけらを届けました。<br>集めたキラリ：${game.score}`:`${game.level.theme.item}を届けました。<br>次は「${MiitobowEngine.themes[nextStage(game.stage)].name}」へ。`,final?'もういちど、よりみち →':'次のエリアへ →'];
    if(sky&&game.level.v2&&kind==='title')copy=['SKY CLIMB VER.2 · 100 STEPS','百段の先の、天空へ。','4,800m。移動・崩落・消失・氷・ベルト。<br>ばねと突風を読み、噴気の隙を抜けよう。<br>途中セーブなし。落ちたら、ずっと下へ。','天空の庭 Ver.2 にのぼる ↑'];
    if(sky&&game.level.v2&&kind==='clear')copy=['100 STEPS CONQUERED','百段の鐘に、到着。',`4,800mの難関を踏破しました。<br>キラリ：${game.score} ／ 空のかけら：${game.level.items.filter(i=>i.got).length} / 3`,'もういちど Ver.2 へ ↑'];
    $('modal-kicker').textContent=copy[0];$('modal-title').textContent=copy[1];$('modal-description').innerHTML=copy[2];$('primary').textContent=copy[3];
    $('help-content').hidden=kind!=='help';
    $('help-rules').innerHTML=sky?'水色 ↔：左右に動く足場。上ほど速く大きく移動。<br>茶色のひび：乗ると0.8秒で崩れ、3秒後に復活。<br>650〜2,300m：矢印の予告後に突風。逆方向で調整。<br>長押しジャンプ＋ダッシュで遠くへ。10段ごとは壊れない休憩所。<br>途中セーブなし。落下しても体力は減らず、下から再挑戦。':'各エリアの落としものを3つ集めて、右端の家へ。<br>ベンチを通ると体力回復＆再開地点に。<br>落ちても何度でも挑戦できます。制限時間なし。';
    document.querySelector('.modal').classList.toggle('help-mode',kind==='help');
    if(sky&&game.level.v2)$('help-rules').innerHTML='100段・4,800m。上ほど狭く、移動足場が高速化。<br>水色 ↔：移動／茶色：0.8秒で崩落／紫：予告後に消失。<br>青い氷：滑る床／金色：ベルト／桃色 ↑：自動ばね。<br>噴気は黄色の予告後にダメージ。突風は矢印の方向へ流されます。<br>10段ごとに壊れない足場。セーブはなし。空のかけらは任意。';
    if(game.level.hard)$('help-rules').innerHTML='水色 ↔：移動足場／茶色：0.8秒で崩落。<br>紫：点滅後に消失／金色の矢印：流れるベルト。<br>桃色 ↑：ばね床。押さなくても高く跳ねます。<br>噴気口は黄色の予告後、赤い蒸気に触れるとダメージ。<br>長押しジャンプ＋加速を活用。中間ベンチで復活地点を保存。';
    $('secondary').hidden=kind!=='pause';$('secondary').textContent=sky?'天空の庭を最初から':game.level.hard?'このステージを最初から':'はじめから遊ぶ';
    $('sky-start').hidden=kind==='help'||kind==='pause';$('sky-start').textContent=sky?'街のおさんぽへ戻る →':'新ステージ「天空の庭」に挑戦 ↑';
    $('modal-foot').textContent=sky?`${game.level.v2?100:50} PLATFORMS · NO CHECKPOINTS · KEEP CLIMBING`:'6 STAGES + SKY CLIMB · NO TIME LIMIT';
    $('overlay').hidden=false;$('pause').disabled=true;updateHUD();$('primary').focus({preventScroll:true});
  }
  function hideModal(){clearInput();$('overlay').hidden=true;canvas.focus({preventScroll:true});document.querySelector('.game-shell').scrollIntoView({block:'start',behavior:'instant'});last=0;accumulator=0;}
  function pause(){if(game.mode==='playing'){game.mode='paused';showModal('pause');}}
  function closeHelp(){game.mode=returnMode;if(returnMode==='playing'){hideModal();}else showModal(returnMode==='paused'?'pause':returnMode);}
  function primary(){initAudio();if(modalKind==='help'){closeHelp();return;}if(modalKind==='title'){game.restart(game.stage);toast(game.level.hard?'長押し＋加速で遠くへ。噴気と消える床はタイミングを見て。':game.level.vertical?'長押しジャンプで上へ。落下中も左右に動けます。':'Spaceでジャンプ。Xのキラリで敵をおやすみ。');}else if(modalKind==='pause')game.mode='playing';else if(modalKind==='clear'){if(game.level.vertical)game.restart(game.stage);else if(game.stage===6)game.restart();else game.load(nextStage(game.stage));}hideModal();updateHUD();}
  $('primary').addEventListener('click',primary);$('secondary').addEventListener('click',()=>{game.restart(game.level.hard||game.level.vertical?game.stage:0);hideModal();updateHUD();});$('pause').addEventListener('click',pause);
  $('sky-start').addEventListener('click',()=>{game.load(game.level.vertical?0:3);game.mode='title';showModal('title');});
  $('help').addEventListener('click',()=>{if(modalKind==='help'&&!$('overlay').hidden){closeHelp();return;}returnMode=game.mode;game.mode='paused';showModal('help');});
  $('sound').addEventListener('click',()=>{muted=!muted;initAudio();$('sound').setAttribute('aria-pressed',String(!muted));$('sound').setAttribute('aria-label',muted?'サウンドをオン':'サウンドをオフ');$('sound').querySelector('span').textContent=muted?'音 OFF':'音 ON';if(!muted)tone(659,.12);if(game.mode==='playing')canvas.focus({preventScroll:true});});
  document.addEventListener('keydown',e=>{
    if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(e.repeat)return;if(!$('overlay').hidden){if(modalKind==='help')closeHelp();else if(modalKind==='pause')primary();}else pause();return;}
    if(!$('overlay').hidden){if(e.code==='Tab'){const buttons=[$('primary'),$('sky-start'),$('secondary')].filter(b=>!b.hidden);const index=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}return;}
    if(mapping[e.code]&&game.mode==='playing'){if(document.activeElement instanceof HTMLButtonElement)return;e.preventDefault();keys.add(e.code);}
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  for(const button of document.querySelectorAll('[data-action]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(game.mode!=='playing')return;button.setPointerCapture(e.pointerId);touch.set(e.pointerId,button.dataset.action);canvas.focus({preventScroll:true});});for(const name of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>touch.delete(e.pointerId));}
  window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
  function frame(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;accumulator+=dt;
    while(accumulator>=1/120){game.step(1/120,input());accumulator-=1/120;}
    for(const ev of game.events.splice(0)){sound(ev.type);if(ev.text)toast(ev.text);if(ev.type==='clear')showModal('clear');}
    if(toastUntil&&now>toastUntil){$('toast').classList.remove('show');toastUntil=0;}
    if(game.mode==='title'&&!reduced)game.time+=dt;
    MiitobowArt.render(ctx,game,reduced);updateHUD();music();requestAnimationFrame(frame);
  }
  for(const [id,scale,offset] of[['brand-avatar',1,0],['hero-avatar',3,6]]){const c=$(id).getContext('2d');c.imageSmoothingEnabled=false;c.scale(scale,scale);MiitobowArt.player(c,offset,2);}
  showModal('title');requestAnimationFrame(frame);
})();

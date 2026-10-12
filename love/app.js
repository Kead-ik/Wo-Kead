    (() => {
      'use strict';
      const $ = (s,root=document) => root.querySelector(s);
      const $$ = (s,root=document) => [...root.querySelectorAll(s)];
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const intro = $('#intro');
      const enterButton = $('#enterButton');
      const start = () => {
        intro.classList.add('gone');
        document.body.style.overflow='';
        void playLoveSong();
        setTimeout(()=>{ intro.setAttribute('aria-hidden','true'); intro.inert=true; }, 1100);
      };
      document.body.style.overflow='hidden';
      enterButton.addEventListener('click',start);
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!intro.classList.contains('gone'))start();});

      const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}
      }), { threshold:.10,rootMargin:'0px 0px -25px 0px' });
      $$('.reveal').forEach(el=>observer.observe(el));
      const progress = $('#progress');
      const anchors = $$('.side-nav a');
      const targets = anchors.map(a=>$(a.getAttribute('href')));
      let ticking=false;
      function onScroll(){
        if(ticking)return; ticking=true;
        requestAnimationFrame(()=>{
          const max = document.documentElement.scrollHeight-innerHeight;
          progress.style.transform=`scaleX(${max>0?Math.min(1,scrollY/max):0})`;
          let active=0;
          targets.forEach((el,i)=>{if(el&&el.getBoundingClientRect().top<=innerHeight*.54)active=i;});
          anchors.forEach((a,i)=>{a.classList.toggle('active',i===active);if(i===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
          ticking=false;
        });
      }
      addEventListener('scroll',onScroll,{passive:true}); onScroll();

      const finePointer = matchMedia('(pointer:fine)').matches;
      const maxScroll=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);
      const limit=(value,min,max)=>Math.min(max,Math.max(min,value));
      let targetY=scrollY, renderedY=scrollY, scrollFrame=0, lastScrollFrame=0;
      function cancelInertia(){
        if(scrollFrame)cancelAnimationFrame(scrollFrame);
        scrollFrame=0;
        lastScrollFrame=0;
        targetY=renderedY=scrollY;
      }
      function stepScroll(time){
        const dt=lastScrollFrame?Math.min(time-lastScrollFrame,48):16.67;
        lastScrollFrame=time;
        targetY=limit(targetY,0,maxScroll());
        const distance=targetY-renderedY;
        const influence=1-Math.exp(-dt/140);
        renderedY+=distance*influence;
        if(Math.abs(targetY-renderedY)<.65){
          renderedY=targetY;
          scrollFrame=0;
          lastScrollFrame=0;
        }
        scrollTo({top:renderedY,behavior:'instant'});
        if(scrollFrame)scrollFrame=requestAnimationFrame(stepScroll);
      }
      function startInertia(next){
        if(reduced){scrollTo({top:limit(next,0,maxScroll()),behavior:'instant'});return;}
        if(!scrollFrame){renderedY=scrollY;lastScrollFrame=0;}
        targetY=limit(next,0,maxScroll());
        if(!scrollFrame&&Math.abs(targetY-renderedY)>.65) scrollFrame=requestAnimationFrame(stepScroll);
      }
      const sceneSelectors=['#home','#thankyou','#bridgeOne','.memories-head',...Array.from({length:6},(_,i)=>`#memories .memory-block:nth-of-type(${i+1})`),'#memoryExtras','#words','#bridgeTwo','#promise','#wife','#letter','#finale'];
      const sceneSteps=sceneSelectors.map(selector=>$(selector)).filter(Boolean);
      const sceneTop=el=>el.getBoundingClientRect().top+scrollY;
      const sceneTarget=el=>{
        const top=sceneTop(el);
        const height=el.getBoundingClientRect().height;
        const centered=el.matches('.memory-block, .memories-head, #memoryExtras, #words');
        return limit(centered&&height<innerHeight-24?top-(innerHeight-height)/2:top,0,maxScroll());
      };
      const sceneIndexAt=y=>{
        let index=0;
        for(let i=0;i<sceneSteps.length;i++){
          if(sceneTarget(sceneSteps[i])<=y+22)index=i;
          else break;
        }
        return index;
      };
      const isLongScene=index=>{
        if(index<0||index>=sceneSteps.length-1)return false;
        const height=sceneTop(sceneSteps[index+1])-sceneTop(sceneSteps[index]);
        const contentHeight=sceneSteps[index].getBoundingClientRect().height;
        return height>innerHeight+75||contentHeight>innerHeight-26;
      };
      let sceneCooldownUntil=0;
      function moveScene(direction,delta=0){
        const current=scrollFrame?targetY:scrollY;
        const index=sceneIndexAt(current);
        const start=sceneTarget(sceneSteps[index]);
        const next=index<sceneSteps.length-1?sceneTarget(sceneSteps[index+1]):maxScroll();
        const long=isLongScene(index);
        const now=performance.now();
        if(now<sceneCooldownUntil)return;
        if(long){
          if(direction>0&&current+innerHeight<next-38){
            startInertia(Math.min(next-innerHeight+32,current+Math.max(100,Math.abs(delta)||innerHeight*.55)));
            return;
          }
          if(direction<0&&current>start+32){
            startInertia(Math.max(start,current-Math.max(100,Math.abs(delta)||innerHeight*.55)));
            return;
          }
        }
        const goal=direction>0?index+1:index-1;
        if(goal<0||goal>=sceneSteps.length)return;
        sceneCooldownUntil=now+780;
        startInertia(sceneTarget(sceneSteps[goal]));
      }
      let wheelAccumulator=0;
      function onWheel(e){
        if(!intro.classList.contains('gone')||document.body.classList.contains('overlay-open')||e.ctrlKey||e.defaultPrevented)return;
        const delta=e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?innerHeight:1);
        if(!Number.isFinite(delta)||Math.abs(delta)<1)return;
        e.preventDefault();
        if(Math.sign(delta)!==Math.sign(wheelAccumulator))wheelAccumulator=0;
        wheelAccumulator+=delta;
        if(Math.abs(wheelAccumulator)<32)return;
        const intent=wheelAccumulator;
        wheelAccumulator=0;
        moveScene(Math.sign(intent),Math.min(660,Math.abs(intent)*1.35));
      }
      if(finePointer&&!reduced){
        addEventListener('wheel',onWheel,{passive:false});

        const draggableExclusions='button,a,input,textarea,select,[role="scrollbar"],[contenteditable],.scroll-rail';
        let pointerGesture=null;
        addEventListener('pointerdown',e=>{
          if(e.button!==0||!e.isPrimary||e.pointerType!=='mouse'||!intro.classList.contains('gone'))return;
          if(e.target.closest(draggableExclusions))return;
          cancelInertia();
          pointerGesture={id:e.pointerId,start:e.clientY,last:e.clientY,lastAt:performance.now(),velocity:0,moved:false,initialScroll:scrollY};
        });
        addEventListener('pointermove',e=>{
          const g=pointerGesture;
          if(!g||g.id!==e.pointerId)return;
          const dy=e.clientY-g.last, now=performance.now();
          const dt=Math.max(8,now-g.lastAt);
          if(!g.moved&&Math.abs(e.clientY-g.start)>7){
            g.moved=true;
            document.body.classList.add('is-page-dragging');
            window.getSelection()?.removeAllRanges();
          }
          if(g.moved){
            e.preventDefault();
            scrollTo({top:limit(scrollY-dy,0,maxScroll()),behavior:'instant'});
            g.velocity=g.velocity*.42+(dy/dt)*.58;
          }
          g.last=e.clientY;
          g.lastAt=now;
        },{passive:false});
        function finishPointerGesture(e){
          const g=pointerGesture;
          if(!g||g.id!==e.pointerId)return;
          pointerGesture=null;
          document.body.classList.remove('is-page-dragging');
          if(!g.moved)return;
          const elapsed=performance.now()-g.lastAt;
          const velocity=elapsed>100?0:g.velocity;
          const projected=limit(-velocity*240,-750,750);
          const initialIndex=sceneIndexAt(g.initialScroll);
          if(isLongScene(initialIndex))startInertia(scrollY+projected);
          else{
            const direction=Math.sign(g.start-g.last);
            const goal=limit(initialIndex+direction,0,sceneSteps.length-1);
            if(direction){
              sceneCooldownUntil=performance.now()+780;
              startInertia(sceneTarget(sceneSteps[goal]));
            }
          }
        }
        addEventListener('pointerup',finishPointerGesture);
        addEventListener('pointercancel',finishPointerGesture);
        addEventListener('blur',()=>{pointerGesture=null;document.body.classList.remove('is-page-dragging');cancelInertia();});
        addEventListener('dragstart',e=>{if(pointerGesture)e.preventDefault();});
      }
      addEventListener('touchstart',cancelInertia,{passive:true});
      addEventListener('keydown',e=>{
        if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||!intro.classList.contains('gone')||document.body.classList.contains('overlay-open'))return;
        if(e.target.closest('button,input,textarea,select,[contenteditable]'))return;
        if(e.key==='Home'||e.key==='End'){
          e.preventDefault();
          sceneCooldownUntil=0;
          startInertia(e.key==='Home'?0:maxScroll());
          return;
        }
        const direction=['ArrowDown','PageDown',' '].includes(e.key)?(e.key===' '&&e.shiftKey?-1:1):['ArrowUp','PageUp'].includes(e.key)?-1:0;
        if(!direction)return;
        e.preventDefault();
        moveScene(direction,innerHeight*.62);
      });
      $$('a[href^="#"]').forEach(link=>{
        const hash=link.getAttribute('href');
        const section=$(hash);
        if(!section)return;
        link.addEventListener('click',e=>{
          e.preventDefault();
          if(location.hash!==hash)history.pushState(null,'',hash);
          const next=scrollY+section.getBoundingClientRect().top;
          sceneCooldownUntil=0;
          if(!finePointer&&!reduced)section.scrollIntoView({behavior:'smooth',block:'start'});
          else startInertia(next);
        });
      });

      if(finePointer&&!reduced){
        const dot=$('#cursorDot'),ring=$('#cursorRing');
        let px=-100,py=-100,rx=-100,ry=-100,ready=false;
        function cursorFrame(){
          rx+=(px-rx)*.20; ry+=(py-ry)*.20;
          ring.style.transform=`translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
          requestAnimationFrame(cursorFrame);
        }
        requestAnimationFrame(cursorFrame);
        addEventListener('pointermove',e=>{
          if(e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
          px=e.clientX;py=e.clientY;
          if(!ready){rx=px;ry=py;ready=true;}
          dot.style.transform=`translate3d(${px}px,${py}px,0) translate(-50%,-50%)`;
          dot.classList.add('visible');ring.classList.add('visible');
          ring.classList.toggle('is-hover',!!e.target.closest('a,button,[role="scrollbar"]'));
        },{passive:true});
        document.addEventListener('pointerleave',()=>{dot.classList.remove('visible');ring.classList.remove('visible');ready=false;});
        addEventListener('pointerdown',()=>ring.classList.add('is-pressed'));
        addEventListener('pointerup',()=>ring.classList.remove('is-pressed'));
        addEventListener('blur',()=>{dot.classList.remove('visible');ring.classList.remove('visible');ring.classList.remove('is-pressed');ready=false;});
      }

      if(finePointer&&!reduced&&matchMedia('(hover:hover)').matches){
        const cards=$$('.memory-block').map(card=>({card,shell:$('[data-tilt]',card)}));
        let tiltX=innerWidth/2,tiltY=innerHeight/2,tiltPointer=false,tiltScheduled=false;
        const resetCard=({card,shell})=>{
          card.style.setProperty('--card-tilt-x','0deg');
          card.style.setProperty('--card-tilt-y','0deg');
          card.classList.remove('is-tilting');
          if(!shell)return;
          shell.style.setProperty('--tilt-x','0deg');
          shell.style.setProperty('--tilt-y','0deg');
          shell.classList.remove('is-tilting');
        };
        const updateTilt=()=>{
          tiltScheduled=false;
          if(!tiltPointer||!intro.classList.contains('gone')||document.body.classList.contains('is-page-dragging')||document.body.classList.contains('overlay-open')){
            cards.forEach(resetCard);
            return;
          }
          let active=null,score=-Infinity;
          for(const item of cards){
            const rect=item.card.getBoundingClientRect();
            const visible=Math.max(0,Math.min(innerHeight,rect.bottom)-Math.max(0,rect.top));
            if(visible<Math.min(140,rect.height*.3))continue;
            const proximity=1-Math.abs((rect.top+rect.bottom)/2-innerHeight/2)/(innerHeight/2+rect.height/2);
            const value=visible/Math.max(rect.height,1)+proximity*.9;
            if(value>score){score=value;active=item;}
          }
          const nx=limit((tiltX-innerWidth/2)/(innerWidth*.5),-1,1);
          const ny=limit((tiltY-innerHeight/2)/(innerHeight*.5),-1,1);
          for(const item of cards){
            if(item!==active){resetCard(item);continue;}
            const {card,shell}=item;
            card.style.setProperty('--card-tilt-x',(ny*1.35).toFixed(3)+'deg');
            card.style.setProperty('--card-tilt-y',(-nx*1.7).toFixed(3)+'deg');
            card.classList.add('is-tilting');
            if(!shell)continue;
            shell.style.setProperty('--tilt-x',(ny*5).toFixed(3)+'deg');
            shell.style.setProperty('--tilt-y',(-nx*6).toFixed(3)+'deg');
            shell.style.setProperty('--light-x',((nx+1)*50).toFixed(1)+'%');
            shell.style.setProperty('--light-y',((ny+1)*50).toFixed(1)+'%');
            shell.classList.add('is-tilting');
          }
        };
        const scheduleTilt=()=>{
          if(tiltScheduled)return;
          tiltScheduled=true;
          requestAnimationFrame(updateTilt);
        };
        addEventListener('pointermove',e=>{
          if(e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
          tiltX=e.clientX;
          tiltY=e.clientY;
          tiltPointer=true;
          scheduleTilt();
        },{passive:true});
        addEventListener('scroll',scheduleTilt,{passive:true});
        addEventListener('resize',scheduleTilt,{passive:true});
        addEventListener('pointerdown',scheduleTilt,{passive:true});
        document.addEventListener('pointerleave',()=>{tiltPointer=false;scheduleTilt();});
        addEventListener('blur',()=>{tiltPointer=false;scheduleTilt();});
      }

      const rail=$('#scrollRail'),thumb=$('#scrollThumb');
      let thumbHeight=45,dragging=false,dragOffset=0;
      const railMetrics=()=>{
        const rect=rail.getBoundingClientRect();
        thumbHeight=Math.max(36,Math.min(rect.height,rect.height*innerHeight/Math.max(document.documentElement.scrollHeight,1)));
        return {rect,travel:Math.max(0,rect.height-thumbHeight)};
      };
      function refreshThumb(){
        const {travel}=railMetrics(),max=maxScroll();
        thumb.style.height=`${thumbHeight}px`;
        thumb.style.transform=`translateY(${max?travel*scrollY/max:0}px)`;
        thumb.setAttribute('aria-valuenow',String(Math.round(max?100*scrollY/max:0)));
        rail.style.opacity=max?'.96':'0';
      }
      const scrollToRailPosition=(clientY,offset=thumbHeight/2,animate=false)=>{
        const {rect,travel}=railMetrics();
        const ratio=travel?limit((clientY-rect.top-offset)/travel,0,1):0;
        const dest=maxScroll()*ratio;
        if(animate)startInertia(dest);
        else{cancelInertia();scrollTo({top:dest,behavior:'instant'});refreshThumb();}
      };
      thumb.addEventListener('pointerdown',e=>{
        if(e.button!==0)return;
        dragging=true;rail.classList.add('is-dragging');
        dragOffset=e.clientY-thumb.getBoundingClientRect().top;
        thumb.setPointerCapture(e.pointerId);e.preventDefault();
      });
      thumb.addEventListener('pointermove',e=>{if(dragging)scrollToRailPosition(e.clientY,dragOffset);});
      const releaseThumb=()=>{dragging=false;rail.classList.remove('is-dragging');};
      thumb.addEventListener('pointerup',releaseThumb);
      thumb.addEventListener('pointercancel',releaseThumb);
      thumb.addEventListener('lostpointercapture',releaseThumb);
      rail.addEventListener('pointerdown',e=>{if(e.target!==thumb)scrollToRailPosition(e.clientY,thumbHeight/2,true);});
      thumb.addEventListener('keydown',e=>{
        const keyDelta={'ArrowUp':-95,'ArrowDown':95,'PageUp':-innerHeight*.8,'PageDown':innerHeight*.8,'Home':-Infinity,'End':Infinity};
        if(!(e.key in keyDelta))return;
        e.preventDefault();
        const delta=keyDelta[e.key],dest=delta===Infinity?maxScroll():delta===-Infinity?0:limit(scrollY+delta,0,maxScroll());
        startInertia(dest);
      });
      addEventListener('scroll',refreshThumb,{passive:true});
      addEventListener('resize',refreshThumb,{passive:true});
      if('ResizeObserver' in window) new ResizeObserver(refreshThumb).observe(document.body);
      refreshThumb();

      const bubbles=$$('.bubble');
      const bubbleMessages=['Наши шипучки ♡','Помню, как мы катались','Моя принцесса ✧','MudRunner и смех','Ты моя звёздочка','Наши первые подарки','Чаггинтон и «ту-ту»','Лучше всего вместе ♡'];
      let bubbleIndex=0,bubbleTimer;
      bubbles.forEach(b=>b.addEventListener('click',()=>{
        if(b.classList.contains('pop'))return;
        b.classList.add('pop');
        const message=$('#bubbleMessage');
        message.textContent=bubbleMessages[bubbleIndex++%bubbleMessages.length];
        message.classList.add('visible');
        clearTimeout(bubbleTimer); bubbleTimer=setTimeout(()=>message.classList.remove('visible'),2300);
        setTimeout(()=>b.classList.remove('pop'),750);
        burstAt(b.getBoundingClientRect().left+b.offsetWidth/2,b.getBoundingClientRect().top+b.offsetHeight/2,9);
      }));

      const quotes=[
        '«Только с тобой я так смеялась»',
        '«Никто кроме тебя мне не нужен»',
        '«Только тебе я всегда отвечу первой»',
        '«Кого угодно оттолкну, но только не тебя»',
        '«Я только твоя, а ты только мой»',
        '«Просто потому что мы вместе»',
        '«С тобой весь мир становится ярче»'
      ];
      let qi=0,changing=false;
      $('#quoteCounter').textContent=`${String(qi+1).padStart(2,'0')} / ${String(quotes.length).padStart(2,'0')}`;
      function changeQuote(delta){
        if(changing)return; changing=true;
        const el=$('#quoteText'); el.classList.add('changing');
        setTimeout(()=>{qi=(qi+delta+quotes.length)%quotes.length;el.textContent=quotes[qi];$('#quoteCounter').textContent=`${String(qi+1).padStart(2,'0')} / ${String(quotes.length).padStart(2,'0')}`;el.classList.remove('changing');setTimeout(()=>changing=false,300);},240);
      }
      $('#prevQuote').addEventListener('click',()=>changeQuote(-1));
      $('#nextQuote').addEventListener('click',()=>changeQuote(1));

      $('#openLetter').addEventListener('click',()=>{
        const opening=!$('#letterBody').classList.contains('open');
        $('#letterBody').classList.toggle('open',opening);
        $('#envelope').classList.toggle('open',opening);
        $('#openLetter').setAttribute('aria-expanded',String(opening));
        $('#openLetter').firstChild.textContent=opening?'Свернуть письмо ':'Открыть моё письмо ';
        if(opening){burstAt(innerWidth/2,innerHeight/2,27);}
      });

      const canvas=$('#universe'),ctx=canvas.getContext('2d');
      let W=innerWidth,H=innerHeight,dpr=1,stars=[],sparks=[];
      const rand=(a,b)=>Math.random()*(b-a)+a;
      function resize(){
        W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,1.7);
        canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
        canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
        stars=Array.from({length:Math.min(110,Math.floor(W*H/10500))},()=>({x:rand(0,W),y:rand(0,H),r:rand(.4,1.6),v:rand(.03,.22),a:rand(.2,.65),p:rand(0,Math.PI*2)}));
      }
      addEventListener('resize',resize,{passive:true});resize();
      function burstAt(x,y,count=32){
        if(reduced)return;
        for(let i=0;i<count;i++){
          const ang=rand(0,Math.PI*2),speed=rand(1.6,6.3);
          sparks.push({x,y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed-1.1,life:1,decay:rand(.009,.019),r:rand(1.5,4),color:['#cfc2ff','#b09cff','#e5ddff','#8872e3','#f4f0ff'][Math.floor(rand(0,5))]});
        }
      }
      let frame=0;
      function draw(){
        ctx.clearRect(0,0,W,H);frame++;
        stars.forEach(s=>{
          if(!reduced){s.y-=s.v;if(s.y<-4){s.y=H+3;s.x=rand(0,W);}}
          const alpha=s.a*(.78+.22*Math.sin(frame*.017+s.p));
          ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,220,235,${Math.max(0,alpha)})`;ctx.fill();
        });
        for(let i=sparks.length-1;i>=0;i--){
          const s=sparks[i];s.x+=s.vx;s.y+=s.vy;s.vy+=.045;s.vx*=.992;s.life-=s.decay;
          if(s.life<=0){sparks.splice(i,1);continue;}
          ctx.globalAlpha=Math.max(0,s.life);ctx.beginPath();ctx.arc(s.x,s.y,s.r*s.life,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();
        }
        ctx.globalAlpha=1;
        if(!reduced||sparks.length)requestAnimationFrame(draw);
      }
      draw();
      const endingOverlay=$('#endingOverlay');
      const endingLine=$('#endingLine');
      const endingClose=$('#endingClose');
      const endingMessages=[
        'Я буду любить тебя всегда.',
        'Давай, пожалуйста, никогда не ссориться так, чтобы нам было неприятно и чтобы мы переставали слышать друг друга.',
        'Иногда эмоций бывает слишком много, но я стараюсь говорить с тобой бережно и всегда тебя слышать.',
        'Даже, если видна редкая ревность, то это не значит, что я тебе не доверяю. В тебе я никогда не сомневаюсь.',
        'Это реакция на то, что я боюсь, что что-то будет не так.',
        'Даже когда кто-то тебя «цем» в игре, я порой слишком остро реагирую. Но это мои эмоции, и я хочу говорить о них спокойнее, не обижая тебя.',
        'Но ты моя любовь, и ничто не сравнится с чувствами к тебе. Они сильнее всего.',
        'Мне очень дорого наше время вместе. Иногда я переживаю, когда мы ждём друг друга, а побыть вдвоём не получается.',
        'Я хочу беречь тебя, наше доверие и то, как мы умеем слышать друг друга.'
      ];
      let endingTimer=0,endingToken=0,returnFocus=null;
      const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
      function closeEndingOverlay(){
        endingToken++;
        clearTimeout(endingTimer);
        endingOverlay.classList.remove('open');
        endingOverlay.setAttribute('aria-hidden','true');
        endingOverlay.inert=true;
        document.body.classList.remove('overlay-open');
        endingLine.className='ending-line';
        if(returnFocus&&document.contains(returnFocus))returnFocus.focus({preventScroll:true});
      }
      async function showEndingLines(token){
        await wait(reduced?140:1050);
        for(const line of endingMessages){
          if(token!==endingToken)return;
          const duration=reduced?2300:Math.min(7000,Math.max(4100,2250+line.length*33));
          endingLine.className='ending-line'+(line.length>100?' is-long':'');
          endingLine.textContent=line;
          endingLine.style.setProperty('--line-duration',duration+'ms');
          void endingLine.offsetWidth;
          endingLine.classList.add('playing');
          await wait(duration+220);
        }
        if(token!==endingToken)return;
        endingLine.className='ending-line ending-last';
        endingLine.textContent='Люблю тебя. Навсегда ♡';
        endingLine.classList.add('playing');
      }
      function openEndingOverlay(){
        endingToken++;
        const token=endingToken;
        returnFocus=document.activeElement;
        endingLine.className='ending-line';
        endingLine.textContent='';
        endingOverlay.inert=false;
        endingOverlay.setAttribute('aria-hidden','false');
        endingOverlay.classList.add('open');
        document.body.classList.add('overlay-open');
        endingClose.focus({preventScroll:true});
        void showEndingLines(token);
      }
      endingClose.addEventListener('click',closeEndingOverlay);
      addEventListener('keydown',e=>{if(e.key==='Escape'&&endingOverlay.classList.contains('open'))closeEndingOverlay();});
      endingOverlay.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
      endingOverlay.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

      $('#wishButton').addEventListener('click',()=>{
        $('#finaleReveal').classList.add('shown');
        setTimeout(()=>$('#finaleReveal').scrollIntoView({behavior:reduced?'instant':'smooth',block:'nearest'}),180);
        const centerY=innerHeight*.50;
        for(let i=0;i<7;i++)setTimeout(()=>burstAt(rand(W*.13,W*.87),rand(centerY-170,centerY+120),50),i*190);
        $('#wishButton').textContent='Моё желание: ты ♡';
        clearTimeout(endingTimer);
        endingTimer=setTimeout(openEndingOverlay,6500);
      });

      const soundButton=$('#soundButton'),soundText=$('#soundText'),loveSong=$('#loveSong');
      const musicVolume=.18;
      let musicOn=false,musicFrame=0,playRequest=null;
      loveSong.volume=0;
      const syncMusic=()=>{
        musicOn=!loveSong.paused;
        soundButton.setAttribute('aria-pressed',String(musicOn));
        soundButton.setAttribute('aria-label',musicOn?'Выключить песню «Созвездие ангела»':'Включить песню «Созвездие ангела»');
        soundText.textContent=musicOn?'Играет «Созвездие ангела»':'Включить «Созвездие ангела»';
      };
      function fadeMusic(to,duration,onDone){
        if(musicFrame)cancelAnimationFrame(musicFrame);
        musicFrame=0;
        const from=loveSong.volume;
        const startAt=performance.now();
        const length=reduced?0:duration;
        const tick=now=>{
          const p=length?Math.min(1,(now-startAt)/length):1;
          const ease=p*p*(3-2*p);
          loveSong.volume=Math.max(0,Math.min(1,from+(to-from)*ease));
          if(p<1){musicFrame=requestAnimationFrame(tick);return;}
          musicFrame=0;
          if(onDone)onDone();
        };
        musicFrame=requestAnimationFrame(tick);
      }
      async function playLoveSong(){
        if(!loveSong.paused){
          if(loveSong.volume<musicVolume)fadeMusic(musicVolume,2200);
          return;
        }
        if(playRequest)return playRequest;
        if(musicFrame)cancelAnimationFrame(musicFrame);
        musicFrame=0;
        loveSong.volume=0;
        playRequest=loveSong.play();
        try{
          await playRequest;
          fadeMusic(musicVolume,2400);
          syncMusic();
        }catch(e){
          syncMusic();
          if(e.name!=='NotAllowedError'&&e.name!=='AbortError'){
            soundText.textContent='Проверь файл l.mp3';
          }
        }finally{
          playRequest=null;
        }
      }
      soundButton.addEventListener('click',()=>{
        if(!loveSong.paused){
          fadeMusic(0,650,()=>{loveSong.pause();syncMusic();});
        }else void playLoveSong();
      });
      loveSong.addEventListener('play',syncMusic);
      loveSong.addEventListener('pause',syncMusic);
      loveSong.addEventListener('ended',syncMusic);
      loveSong.addEventListener('error',()=>{syncMusic();soundText.textContent='Проверь файл l.mp3';});
      void playLoveSong();

    })();

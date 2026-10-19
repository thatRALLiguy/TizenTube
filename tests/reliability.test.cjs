const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const root=path.join(__dirname,'../mods'), quiet={info(){},warn(){},error(){}};
function run(file,globals,expose='') {
 const code=fs.readFileSync(path.join(root,file),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export default /g,'').replace(/export /g,'');
 const c=vm.createContext({console:quiet,...globals});vm.runInContext(code+'\n'+expose,c);return c;
}
function config(saved,fail=false) {
 const storage={'ytaf-configuration':saved};
 if(fail)Object.defineProperty(storage,'ytaf-configuration',{get(){return saved},set(){throw Error('quota')}});
 return run('config.js',{window:{localStorage:storage},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}}},'this.api={configRead,configWrite,configChangeEmitter}').api;
}
for(const saved of ['null','[]','5','"text"','{broken'])test('settings recover from '+saved,()=>assert.equal(config(saved).configRead('videoSpeed'),1));
test('wrong setting types recover; quota errors still update UI',()=>{
 const c=config('{"sponsorBlockManualSkips":null,"videoSpeed":"oops"}',true);
 assert.equal(c.configRead('videoSpeed'),1);assert.ok(Array.isArray(c.configRead('sponsorBlockManualSkips')));
 let changed=false;c.configChangeEmitter.addEventListener('configChange',()=>changed=true);c.configWrite('videoSpeed',1.5);
 assert.equal(c.configRead('videoSpeed'),1.5);assert.ok(changed);
});
function quality(){
 let preference='1080p',stateChange,change,levels=[],fail=false;const calls=[];
 const player={addEventListener(e,fn){stateChange=fn},getPlayerStateObject:()=>({isPlaying:true}),getVideoData:()=>({video_id:'a'}),getAvailableQualityData:()=>levels,setPlaybackQualityRange(...args){if(fail)throw Error('not ready');calls.push(args)}};
 run('features/preferredVideoQuality.js',{window:{},document:{querySelector:()=>player},clearTimeout(){},setTimeout(){},configRead:()=>preference,configChangeEmitter:{addEventListener(e,fn){change=fn}}});
 return{calls,stateChange,levels(v){levels=v},fail(v){fail=v},choose(v){preference=v;change({detail:{key:'preferredVideoQuality'}})}};
}
test('quality waits for formats, chooses lower fallback, restores Auto',()=>{
 const h=quality();assert.equal(h.calls.length,0);h.levels([{qualityLabel:'2160p',quality:'hd2160'},{qualityLabel:'720p60',quality:'hd720'}]);h.stateChange();assert.deepEqual(h.calls,[['hd720','hd720']]);h.choose('auto');assert.deepEqual(h.calls.at(-1),['default','default']);
});
test('quality retries failed application and uses lowest if all exceed preference',()=>{
 const h=quality();h.levels([{qualityLabel:'720p',quality:'hd720'}]);h.fail(true);h.stateChange();assert.equal(h.calls.length,0);h.fail(false);h.stateChange();assert.equal(h.calls.length,1);h.choose('240p');assert.deepEqual(h.calls.at(-1),['hd720','hd720']);
});
function sponsors(fetch){
 let hashchange,id=0;const timers=new Map(),listeners=new Map();
 const video={duration:120,paused:false,currentTime:0,playbackRate:2,addEventListener(e,fn){listeners.set(e,fn)},removeEventListener(e){listeners.delete(e)}};
 const c=run('features/sponsorblock.js',{fetch,sha256:()=> 'abcd',t:s=>s,configRead:k=>k==='sponsorBlockManualSkips'?[]:true,showToast(){},URL,location:{hash:'#/watch?v=a',href:'https://youtube.com/tv'},window:{addEventListener(e,fn){hashchange=fn}},document:{querySelector:s=>s==='video'?video:null},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id},clearTimeout(i){timers.delete(i)},setInterval(){},clearInterval(){}},'this.Handler=SponsorBlockHandler');
 return {Handler:c.Handler,timers,listeners,video,c,hashchange};
}
test('late SponsorBlock response cannot reattach after destroy',async()=>{
 let resolve;const h=sponsors(()=>new Promise(r=>resolve=r)),a=new h.Handler('a'),pending=a.init();a.destroy();resolve({ok:true,json:async()=>[{videoID:'a',segments:[{segment:[10,20],category:'sponsor'}]}]});await pending;assert.equal(h.listeners.size,0);assert.equal(h.timers.size,0);
});
test('destroy cancels overlay retry and playback listeners',async()=>{
 const h=sponsors(async()=>({ok:true,json:async()=>[{videoID:'a',segments:[{segment:[10,20],category:'sponsor'}]}]})),a=new h.Handler('a');await a.init();assert.equal(h.timers.size,1);assert.ok(h.listeners.has('ratechange'));a.destroy();a.buildOverlay();assert.equal(h.timers.size,0);assert.equal(h.listeners.size,0);
});
test('404 is empty; navigation catches network failures',async()=>{
 const h=sponsors(async()=>({status:404,json(){throw Error('must not parse')}}));await new h.Handler('a').init();assert.equal(h.timers.size,0);
 const bad=sponsors(async()=>{throw Error('offline')});bad.hashchange();await new Promise(r=>setImmediate(r));assert.equal(bad.c.window.sponsorblock.active,false);
});
test('skip timer respects playback speed; leaving playback cleans up',()=>{
 const h=sponsors(async()=>({status:404})),a=new h.Handler('a');a.video=h.video;a.segments=[{segment:[10,20],category:'sponsor'}];a.skippableCategories=['sponsor'];a.scheduleSkip();assert.equal([...h.timers.values()][0].ms,5000);h.c.window.sponsorblock=a;h.c.location.hash='#/';h.hashchange();assert.equal(h.c.window.sponsorblock,null);assert.equal(h.timers.size,0);
});
test('diagnostics handle absent/throwing APIs without inventing surround',()=>{
 const c=run('features/playbackDiagnostics.js',{});let rows=c.collectPlaybackDiagnostics({querySelector:()=>null},{});assert.equal(rows.find(r=>r[0]==='Playback')[1],'No video element');
 const video={videoWidth:3840,videoHeight:2160,playbackRate:1,getVideoPlaybackQuality(){throw Error('unsupported')}},player={getStatsForNerds(){return{codecs:'vp09 / opus',color:'bt2020',resolution:'3840x2160@60'}},getPlaybackQuality(){throw Error('unavailable')}};
 rows=c.collectPlaybackDiagnostics({querySelector:s=>s==='video'?video:player},{h5vcc:{}});assert.equal(rows.find(r=>r[0]==='Codecs (player report)')[1],'vp09 / opus');assert.equal(rows.find(r=>r[0]==='Playback engine')[1],'Cobalt');assert.match(rows.find(r=>r[0]==='Audio output / surround')[1],/Not exposed/);
});
test('diagnostics menu opens and refreshes through remote UI commands',()=>{
 let modal;const c=run('ui/settings.js',{collectPlaybackDiagnostics:()=>[['Playback','Playing']],overlayMessageRenderer:s=>({message:s}),buttonItem:(title,icon,commands)=>({title,commands}),scrollPaneRenderer:rows=>({rows}),showModal(...args){modal=args}});
 c.optionShow({menuId:'tt-playback-diagnostics'},false);assert.equal(modal[2],'tt-playback-diagnostics');assert.equal(modal[3],false);const action=modal[1].rows[0].commands[0].customAction;c.optionShow(action.parameters,action.parameters.update);assert.equal(modal[3],true);
});
test('casting ID matches existing UUID v5 identity',()=>{
 const deviceId=require('../service/deviceId.cjs'),uuid=require('../service/node_modules/uuid');
 for(const id of ['test-device','\uC0BC\uC131-TV',''])assert.equal(deviceId(id),uuid.v5(id,'4bcbc514-bdd6-4163-8215-316526fd1d9b'));
});


test('unknown extension settings are preserved',()=>{
 const c=config('{"extensionSetting":"kept"}');
 assert.equal(c.configRead('extensionSetting'),'kept');
 assert.equal(c.configRead('missingSetting'),undefined);
});

test('casting ID avoids inherited Uint8Array.from on legacy Buffer',()=>{
 const modernId=require('../service/deviceId.cjs')('test-device');
 function LegacyBuffer(value,encoding){return Buffer.from(value,encoding);}
 Object.setPrototypeOf(LegacyBuffer,{from(){throw Error('legacy Uint8Array.from is incompatible')}});
 const sandbox={module:{exports:{}},require,Buffer:LegacyBuffer};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../service/deviceId.cjs'),'utf8'),sandbox);
 assert.equal(sandbox.module.exports('test-device'),modernId);
});

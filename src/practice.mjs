// Commands are ordinary player inputs, one tick before execution. No route
// changes the head, cooldown or damage rules to manufacture a target ratio.
export const DRILLS={
 '3:0':{period:12,hits:3,autos:0,start:50,facing:'middle',slot:0,commands:{1:['attack','mage'],2:['move',43],5:['attack','mage'],6:['move',46],9:['attack','mage'],10:['move',50]}},
 '4:1':{period:16,hits:4,autos:1,start:43,facing:'melee',slot:2,commands:{1:['attack','melee'],3:['move',50],6:['attack','melee'],11:['move',47],14:['attack','melee'],15:['move',43]}},
 '3:1':{period:12,hits:3,autos:1,start:43,facing:'melee',slot:2,commands:{1:['attack','melee'],3:['move',50],6:['attack','melee'],7:['move',47],10:['attack','melee'],11:['move',43]}},
 '1:0':{period:8,hits:1,autos:0,start:43,facing:'melee',slot:2,commands:{1:['attack','melee'],3:['move',50],5:['move',43]}},
 scythe:{period:16,hits:3,autos:1,start:43,facing:'melee',slot:2,commands:{1:['attack','melee'],3:['move',50],7:['attack','melee'],8:['move',47],12:['attack','melee'],13:['move',43]}},
};
export function drillTile(game,y){return{x:game.east?37:28,y:game.east?88-y:y};}
export function prepareDrill(game){const drill=DRILLS[game.options.method];if(!drill)return false;
 game.position=drillTile(game,drill.start);game.previous={...game.position};game.motionPath=[{...game.position}];game.headFacing=drill.facing;game.bossCycle=drill.slot;game.nextBoss=1;
 if(game.options.method!=='3:0')game.handHP.mage=0;
 game.feedback='Clean setup loaded. First input: click the '+(game.options.method==='3:0'?'mage':'melee')+' hand before the next tick.';return true;
}
export function driveDrill(game){const drill=DRILLS[game.options.method];if(!drill)return;
 const step=game.tick%drill.period+1,command=drill.commands[step];if(command?.[0]==='attack')game.attack(command[1]);else if(command?.[0]==='move')game.move(drillTile(game,command[1]));
}
export function assessDrill(game){const drill=DRILLS[game.options.method];if(!drill||!game.tick)return;
 const attacks=game.trace.filter(e=>e.type==='player');const last=attacks.at(-1);if(!last)return;
 const expectedOffset=game.options.method==='3:0'?0:1,offset=(last.tick-(game.nextBoss-4)+4)%4;
 if(last.tick===game.tick&&game.options.method!=='scythe'&&offset!==expectedOffset){game.feedback='Attack was '+offset+' ticks after Olm’s event; aim for '+expectedOffset+'. Keep the cooldown and reset your entry timing.';return;}
 if(game.tick%drill.period)return;
 const events=game.trace.filter(e=>e.tick>game.tick-drill.period),hits=events.filter(e=>e.type==='player'),autos=events.filter(e=>e.type==='auto'),specials=events.filter(e=>e.type==='special');
 const intervals=hits.slice(1).every((hit,i)=>hit.tick-hits[i].tick===(game.weapon?.speed||4));
 const scans=events.filter(e=>e.type==='olm'),aligned=game.options.method==='scythe'||hits.every(e=>(e.tick-(game.nextBoss-4)+drill.period*2)%4===expectedOffset);
 const turnsCorrect=game.options.method==='4:1'||game.options.method==='scythe'?scans.filter(e=>e.slot===2||e.slot===3).every(e=>e.turned)&&autos.every(e=>e.slot===0):game.options.method==='3:0'||game.options.method==='1:0'?scans.every(e=>e.turned):true;
 const ok=hits.length===drill.hits&&autos.length===drill.autos&&intervals&&aligned&&turnsCorrect&&(game.options.method!=='4:1'||specials.length===0);
 game.feedback=(ok?'Cycle matched':'Cycle check')+': '+hits.length+' hits / '+autos.length+' Olm attacks'+(specials.length?' / '+specials.length+' specials':'')+'. '+(ok?'Keep the same timing.':game.options.method==='3:0'?'Check the first drag, immediate run click and any splash.':'Check the attack offset and the turn that skips the special.');
 game.cycles??=[];game.cycles.push({tick:game.tick,ok,hits:hits.length,autos:autos.length,specials:specials.length});if(game.cycles.length>100)game.cycles.shift();
}

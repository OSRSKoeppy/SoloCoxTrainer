export class TickClock {
  constructor(){this.reset();}
  reset(){this.time=0;this.remainder=0;}
  advance(elapsed,speed,onTick){
    // The app pauses on a hidden document. Ordinary slow frames never drop ticks.
    this.remainder+=Math.max(0,elapsed)*speed;
    while(this.remainder>=600){this.remainder-=600;this.time+=600;onTick(this.time);}
  }
  get animationTime(){return this.time+this.remainder;}
  get progress(){return this.remainder/600;}
}

export class Effect
{
    manager;
    isAlive; // is true until the effect's lifetime has ended
    lifetime; // lifetime of the particle effect in seconds
    _timeStarted; // the time ini milliseconds that the effect was created

    constructor(effectManager, lifetime, position) {
        this.manager = effectManager;
        this.isAlive = true;
        this.lifetime = lifetime;
        this._timeStarted = Date.now();
        this.manager.AddNewEffect(this);
    }
    Update()
    {
        if (Date.now() - this._timeStarted > this.lifetime*1000)
        {
            this.isAlive = false;
        }
    }
}
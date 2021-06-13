export class PlayerController {

    keys;
    current_yaw;
    current_pitch;

    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        };

        this.current_yaw = 1;
        this.current_pitch = 1;
        this.x_previous = 0;
        this.y_previous = 0;

        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
        document.addEventListener('mousemove', (e) => this._OnMouseMove(e), false);
        document.addEventListener('pointerlockchange', (e) => this._OnPointerLockStateChanged(e), false);
        document.addEventListener('pointerlockchange', (e) => this._OnPointerLockError(e), false);

        var havePointerLock = 'pointerLockElement' in document ||
            'mozPointerLockElement' in document ||
            'webkitPointerLockElement' in document;

        if (havePointerLock)
        {
            const element = document.getElementById('viewport');
            element.requestPointerLock = element.requestPointerLock
            // || element.mozRequestPointerLock
            // || element.webkitRequestPointerLock;
            element.requestPointerLock();
        }
    }

    _onKeyDown(event) {
        switch (event.keyCode) {
            case 87: // w
                this.keys.forward = true;
                break;
            case 65: // a
                this.keys.left = true;
                break;
            case 83: // s
                this.keys.backward = true;
                break;
            case 68: // d
                this.keys.right = true;
                break;
            case 32: // SPACE
                this.keys.space = true;
                break;
            case 16: // SHIFT
                this.keys.shift = true;
                break;
        }
    }

    _onKeyUp(event) {
        switch(event.keyCode) {
            case 87: // w
                this.keys.forward = false;
                break;
            case 65: // a
                this.keys.left = false;
                break;
            case 83: // s
                this.keys.backward = false;
                break;
            case 68: // d
                this.keys.right = false;
                break;
            case 32: // SPACE
                this.keys.space = false;
                break;
            case 16: // SHIFT
                this.keys.shift = false;
                break;
        }
    }

    _OnMouseMove(event)
    {
        if (document.pointerLockElement === document.getElementById('viewport'))
        {
            this.current_yaw = event.movementX * -0.01;
            this.current_pitch = event.movementY * -0.005;
        }
        else
        {
            // let x = event.screenX;
            // let x_change = event.screenX - this.x_previous;
            // this.x_previous = x;
            // this.current_yaw = x_change * -0.01;
            //
            // let y = event.screenY;
            // let y_change = event.screenY - this.y_previous;
            // this.y_previous = y;
            // this.current_pitch = y_change * -0.005;

        }

        if (this.current_yaw > Math.PI/12) {this.current_yaw = Math.PI/12}
        if (this.current_yaw < -Math.PI/12) {this.current_yaw = -Math.PI/12}
        if (this.current_pitch > Math.PI/12) {this.current_pitch = Math.PI/12}
        if (this.current_pitch < -Math.PI/12) {this.current_pitch = -Math.PI/12}

    }
    _OnPointerLockStateChanged(event)
    {
        console.log("pointer lock state was changed")
    }
    _OnPointerLockError(event)
    {
        console.log("POINTER LOCK ERROR")
    }
};
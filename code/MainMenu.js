import {init} from './Main.js'

let headerDiv = document.getElementById("headerDiv")

// the button that loads the game
let loadLevel1 = document.getElementById("level1")
let loadLevel2 = document.getElementById("level2")
let loadLevel3 = document.getElementById("level3")

loadLevel1.onclick = function(){
    loadLevel1.parentElement.removeChild(loadLevel1);
    loadLevel2.parentElement.removeChild(loadLevel2);
    loadLevel3.parentElement.removeChild(loadLevel3);
    init("level1");
}

loadLevel2.onclick = function(){
    loadLevel1.parentElement.removeChild(loadLevel1);
    loadLevel2.parentElement.removeChild(loadLevel2);
    loadLevel3.parentElement.removeChild(loadLevel3);
    init("level2");
}

loadLevel3.onclick = function(){
    loadLevel1.parentElement.removeChild(loadLevel1);
    loadLevel2.parentElement.removeChild(loadLevel2);
    loadLevel3.parentElement.removeChild(loadLevel3);
    init("level3");
}
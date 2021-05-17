import {init} from './Main.js'

var headerDiv = document.getElementById("headerDiv")

// the button that loads the game
var loadGameButton = document.getElementById("loadGame")
loadGameButton.onclick = function(){
    headerDiv.parentElement.removeChild(headerDiv)
    loadGameButton.parentElement.removeChild(loadGameButton)
    init();
}



import {init} from './Main.js'

var headerDiv = document.getElementById("headerDiv")

var loadGameButton = document.getElementById("loadGame")
loadGameButton.onclick = function(){
    headerDiv.parentElement.removeChild(headerDiv)
    loadGameButton.parentElement.removeChild(loadGameButton)
    init();
}



var character = document.getElementById("character");
var positionX = 0;
var positionY = 0;

document.addEventListener("keydown", function(event) {
  if (event.key === "ArrowRight") {
    positionX += 10;
  }
  if (event.key === "ArrowLeft") {
    positionX -= 10;
  }
  if (event.key === "ArrowUp") {
    positionY -= 10;
  }
  if (event.key === "ArrowDown") {
    positionY += 10;
  }
  character.style.left = positionX + "px";
  character.style.top = positionY + "px";
});
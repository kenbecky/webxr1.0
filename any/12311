var HOST_ENDPOINT = "wss://tutorial-babylonjs-server.glitch.me";
var ROOM_NAME = "my_room";

// Load Colyseus SDK (asynchronously)
var scriptUrl = "https://unpkg.com/colyseus.js@^0.15.0-preview.2/dist/colyseus.js";
var externalScript = document.createElement("script");
externalScript.src = scriptUrl;
document.head.appendChild(externalScript);

var loadingText = new BABYLON.GUI.TextBlock("instructions");

var createScene = function() {
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, 1.0, 550, BABYLON.Vector3.Zero(), scene);
    camera.setTarget(BABYLON.Vector3.Zero());

    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    var ground = BABYLON.MeshBuilder.CreatePlane("ground", {size: 500}, scene);
    ground.position.y = -15;
    ground.rotation.x = Math.PI / 2;

    // Display "loading" text
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("textUI");

    loadingText.text = "Loading the Colyseus SDK file...";
    loadingText.color = "#fff000"
    loadingText.fontFamily = "Roboto";
    loadingText.fontSize = 24;
    loadingText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    loadingText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    loadingText.paddingBottom = "10px";
    advancedTexture.addControl(loadingText);

    // build scene only after Colyseus SDK script is loaded.
    externalScript.onload = function() {
        // build the final scene
        buildScene(scene);
    };

    return scene;
}

var buildScene = async function (scene) {
    var colyseusSDK = new Colyseus.Client(HOST_ENDPOINT);
    loadingText.text = "Connecting with the server, please wait...";

    //
    // Connect with Colyseus server
    //
    var room = await colyseusSDK.joinOrCreate(ROOM_NAME);
    loadingText.text = "Connection established!";

    // Local entity map
    var playerEntities = {};
    var playerNextPosition = {};

    // 
    // schema callback: on player add
    // 
    room.state.players.onAdd((player, sessionId) => {
        var isCurrentPlayer = (sessionId === room.sessionId);

        var sphere = BABYLON.MeshBuilder.CreateSphere(`player-${sessionId}`, {
            segments: 8,
            diameter: 40
        });

        // set player's color
        sphere.material = new BABYLON.StandardMaterial(`player-material-${sessionId}`);
        sphere.material.emissiveColor = (isCurrentPlayer) ? BABYLON.Color3.FromHexString("#ff9900") : BABYLON.Color3.Gray();

        // set player spawning position
        sphere.position.set(player.x, player.y, player.z);

        playerEntities[sessionId] = sphere;

        // update player position immediately 
        player.onChange(function () {
            playerEntities[sessionId].position.set(player.x, player.y, player.z);
        });
    });

    // 
    // schema callback: on player remove
    // 
    room.state.players.onRemove((player, sessionId) => {
        playerEntities[sessionId].dispose();
        delete playerEntities[sessionId];
        delete playerNextPosition[sessionId];
    });

    // on room disconnection
    room.onLeave(code => {
        loadingText.text = "Disconnected from the room.";
    });

    // Click event
    scene.onPointerDown = function (event, pointer) {
        if (event.button == 0) {
            const targetPosition = pointer.pickedPoint.clone();

            // Position adjustments for the current play ground.
            // Prevent spheres from moving all around the screen other than on the ground mesh.
            targetPosition.y = -1;
            if(targetPosition.x > 245) targetPosition.x = 245;
            else if(targetPosition.x < -245) targetPosition.x = -245;
            if(targetPosition.z > 245) targetPosition.z = 245;
            else if(targetPosition.z < -245) targetPosition.z = -245;

            // Send position update to the server
            room.send("updatePosition", {
                x: targetPosition.x,
                y: targetPosition.y,
                z: targetPosition.z,
            });
        }
    };
};


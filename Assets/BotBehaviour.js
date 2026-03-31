// BotBehaviour.js
// Handles bot's swaying movement and waiting logic

// @input float amplitude = 0.3
// @input float speed = 2.0
// @input bool startEnabled = true
// @input Component.ScriptComponent playerHealthScript
// @input Component.ScriptComponent animManager

var startPos = null;
var time = 0;
var currentWalkState = "";
var movementDelayTime = 0; // Delay before physically moving after animation swap

function setAnimation(clipName, type) {
    if (!script.animManager) return;
    var targetApi = (script.animManager.api && typeof script.animManager.api.setState === "function") ? script.animManager.api :
        (typeof script.animManager.setState === "function" ? script.animManager : null);

    if (targetApi) {
        targetApi.setState(clipName, type);
    }
}

var isSwayingLogShown = false;

script.createEvent("UpdateEvent").bind(function () {
    // Capture starting position once
    if (startPos === null) {
        var pos = script.getTransform().getWorldPosition();
        startPos = new vec3(pos.x, pos.y, pos.z);
    }

    // STOP IF ROUND IS WAITING, PLAYER IS DEAD, OR BOT IS CASTING
    if (global.isRoundWaiting || global.isBotCasting || (script.playerHealthScript && script.playerHealthScript.api && script.playerHealthScript.api.isDead())) {
        if (!global.isBotCasting) { // Only reset to center if NOT casting (allow animation to stay where it is)
            script.getTransform().setWorldPosition(startPos);
        }
        isSwayingLogShown = false;
        currentWalkState = ""; // Reset walk tracking
        return;
    }

    // WAIT FOR PLAYER TO SHOOT FIRST
    if (!global.playerHasShot) {
        script.getTransform().setWorldPosition(startPos);
        return;
    }

    if (!isSwayingLogShown) {
        print("🤖 Bot Move: Swaying Started (Amplitude: " + script.amplitude + ")");
        isSwayingLogShown = true;
    }

    // Movement math
    time += getDeltaTime() * script.speed;
    var offsetX = Math.sin(time) * script.amplitude;
    var velocity = Math.cos(time);

    // Handle Walk Animations
    var nextState = (velocity > 0) ? "LeftClip" : "RightClip";
    if (nextState !== currentWalkState) {
        setAnimation(nextState, 0);
        currentWalkState = nextState;

        // PAUSE physical move for 0.15s so animation can start
        movementDelayTime = getTime() + 0.15;
    }

    // Skip physical move if we are in the delay window
    if (getTime() < movementDelayTime) {
        return;
    }

    // Move along the local RIGHT vector
    var rightVec = script.getTransform().right;
    var moveVec = rightVec.mult(new vec3(offsetX, offsetX, offsetX));
    var targetPos = startPos.add(moveVec);

    // Apply smoothing (lerp) for a "fade in" / weighty feel
    var currentPos = script.getTransform().getWorldPosition();
    // 5.0 is the "weight" factor - lower is heavier/slower fade in
    var smoothedPos = vec3.lerp(currentPos, targetPos, getDeltaTime() * 5.0);

    script.getTransform().setWorldPosition(smoothedPos);
});

// PUBLIC API — reset for round restart
script.api.resetMovement = function () {
    // global.playerHasShot = false; // COMMENTED OUT: Keep bot moving if match has already started
    time = 0;
    if (startPos !== null) {
        script.getTransform().setWorldPosition(startPos);
    }
    print("Bot movement reset and waiting for player shot");
};
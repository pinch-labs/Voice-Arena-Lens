// NewSpawner.js
// Handles player spell casting and global game start state

// @input Asset.ObjectPrefab spellPrefab
// @input SceneObject cameraObject
// @input Component.AudioComponent castSound
// @input bool autoShoot = true
// @input float fireRate = 3.0
// @input Component.ScriptComponent roundManager

var nextFireTime = 0;
var isAutoShooting = false;

function shoot() {
    // Prevent shooting if round is waiting/resetting
    if (global.isRoundWaiting) {
        return;
    }

    // Prevent shooting until hand is chosen (Setup Phase)
    if (global.hasOwnProperty("handChosen") && !global.handChosen) {
        print("🚫 Cannot shoot yet! Choose hand first.");
        return;
    }

    if (!script.spellPrefab) {
        print("No spell prefab assigned!");
        return;
    }

    var proj = script.spellPrefab.instantiate(null);
    var t = proj.getTransform();

    var spawnPos = script.getTransform().getWorldPosition();
    var spawnRot = script.getTransform().getWorldRotation();
    var forward = script.getTransform().forward;
    var customAimDir = null;

    // Use camera for aiming ONLY in headset mode
    print("🔫 Shoot: isHeadsetMode=" + global.isHeadsetMode + ", cameraObject=" + (script.cameraObject ? "YES" : "NO"));

    if (global.isHeadsetMode && script.cameraObject) {
        var camTransform = script.cameraObject.getTransform();

        // Use camera forward (negated because Lens Studio camera faces -Z)
        customAimDir = camTransform.forward.uniformScale(-1);
        print("🎯 Using camera aim direction");
    }

    t.setWorldPosition(spawnPos);
    t.setWorldRotation(spawnRot);

    var offset = forward.uniformScale(0.4);
    t.setWorldPosition(t.getWorldPosition().add(offset));

    // Pass aim direction to projectile if in headset mode
    if (customAimDir) {
        var projScript = proj.getComponent("Component.ScriptComponent");
        if (projScript && projScript.api && projScript.api.setAimDirection) {
            projScript.api.setAimDirection(customAimDir);
        }
    }

    if (script.castSound) {
        script.castSound.play(1);
    }

    // Delegate "first shot" logic to RoundManager
    if (script.roundManager && script.roundManager.api && script.roundManager.api.onPlayerShot) {
        script.roundManager.api.onPlayerShot();
    } else if (!global.playerHasShot) {
        // Fallback if RoundManager is missing
        global.playerHasShot = true;
        print("🎮 Player shot first spell - game started! (Fallback)");
    }
}

// Manual tap handler
script.createEvent("TapEvent").bind(function () {
    shoot();
});

// Expose API for external calls (e.g. from SpeechRecognition)
script.api.shoot = shoot;

// Debug: Verify Script is Active
print("🪄 NewSpawner initialized on: " + script.getSceneObject().name);

// Safe timer-based auto-shooting loop
script.createEvent("UpdateEvent").bind(function () {
    // Check for voice command
    if (global.voiceCastRequested) {
        print("🎤 NewSpawner: Voice cast executing!");
        global.voiceCastRequested = false;
        shoot();
    }

    if (!script.autoShoot) return;

    if (global.getTime() >= nextFireTime) {
        shoot();
        nextFireTime = global.getTime() + script.fireRate;
    }
});
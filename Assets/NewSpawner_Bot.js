// NewSpawner_Bot.js
// Handles bot shooting and waiting for player's first move

// @input Asset.ObjectPrefab spellPrefab
// @input SceneObject aimDirectionObject
// @input Component.AudioComponent castSound
// @input float fireRate = 3.0
// @input Component.ScriptComponent playerHealthScript
// @input Component.ScriptComponent botHealthScript
// @input Component.ScriptComponent animManager

var nextFireTime = 0;
var warningTime = 0;
var warned = false;
var resetAnimTime = -1;

function setAnimation(clipName, type) {
    if (!script.animManager) return;

    var obj = script.animManager.getSceneObject();
    var targetApi = null;

    function checkApi(s) {
        if (!s) return null;
        if (s.api && typeof s.api.setState === "function") return s.api;
        if (typeof s.setState === "function") return s;
        return null;
    }

    // 1. Direct
    targetApi = checkApi(script.animManager);

    // 2. Local Scripts
    if (!targetApi) {
        var scripts = obj.getComponents("Component.ScriptComponent");
        for (var i = 0; i < scripts.length; i++) {
            targetApi = checkApi(scripts[i]);
            if (targetApi) break;
        }
    }

    // 3. Child Search
    if (!targetApi) {
        function searchObj(o) {
            var count = o.getChildCount();
            for (var j = 0; j < count; j++) {
                var child = o.getChild(j);
                var cScripts = child.getComponents("Component.ScriptComponent");
                for (var k = 0; k < cScripts.length; k++) {
                    var api = checkApi(cScripts[k]);
                    if (api) return api;
                }
                var found = searchObj(child);
                if (found) return found;
            }
            return null;
        }
        targetApi = searchObj(obj);
    }

    if (targetApi) {
        targetApi.setState(clipName, type);
    }
}

function checkDead(healthScript) {
    try {
        if (!healthScript) return false;
        // Check if native component is still valid
        if (healthScript.toString() === "null") return true;
        if (!healthScript.getSceneObject()) return true; // Object destroyed

        if (healthScript.api && healthScript.api.isDead) {
            return healthScript.api.isDead();
        }
    } catch (e) {
        return true; // Treat error as "dead/invalid" to stop shooting
    }
    return false;
}

function shoot() {
    // STOP IF PLAYER IS DEAD OR ROUND IS WAITING
    if (global.isRoundWaiting) return;

    if (checkDead(script.playerHealthScript)) {
        return;
    }

    // STOP IF BOT IS DEAD
    if (checkDead(script.botHealthScript)) {
        return;
    }

    // WAIT FOR PLAYER TO SHOOT FIRST
    if (!global.playerHasShot) {
        return;
    }

    // Trigger Cast Animation immediately
    global.isBotCasting = true;
    setAnimation('Cast', 0);
    // Note: Speech is now handled in UpdateEvent to happen 1s earlier!

    // Set reset time longer to account for the delay (1s wait + 1s follow through)
    resetAnimTime = global.getTime() + 2.0;

    // Create a delayed event to spawn the spell 1 second later
    var delay = script.createEvent("DelayedCallbackEvent");
    delay.bind(function () {
        // RE-CHECK CONDITIONS (in case bot/player died during the 1s wind-up)
        if (global.isRoundWaiting) return;
        if (checkDead(script.botHealthScript)) return;
        if (checkDead(script.playerHealthScript)) return;

        spawnSpell();
    });
    delay.reset(1.0);
}

function spawnSpell() {
    if (!script.spellPrefab || !script.aimDirectionObject) {
        return;
    }

    var proj = script.spellPrefab.instantiate(null);
    if (!proj) return;

    var t = proj.getTransform();
    t.setWorldPosition(script.getTransform().getWorldPosition());
    t.setWorldRotation(script.getTransform().getWorldRotation());

    var offset = script.getTransform().forward.mult(new vec3(0.4, 0.4, 0.4));
    t.setWorldPosition(t.getWorldPosition().add(offset));

    // Pass aim direction to projectile
    var projScript = proj.getComponent("ScriptComponent");
    if (projScript && projScript.api && projScript.api.setAimDirection) {
        projScript.api.setAimDirection(script.aimDirectionObject);
    }

    if (script.castSound) {
        script.castSound.play(1);
    }
}

// Timer-based update loop
script.createEvent("UpdateEvent").bind(function () {
    var t = global.getTime();

    // Animation resetting
    if (resetAnimTime > 0 && t >= resetAnimTime) {
        setAnimation('Idle', 1);
        resetAnimTime = -1;
        global.isBotCasting = false; // BOT CAN MOVE AGAIN
    }

    // Only shoot if game has started and bot is "alive/active"
    if (!global.playerHasShot || global.isRoundWaiting) {
        nextFireTime = t + script.fireRate; // Keep pushing back start time
        warningTime = nextFireTime - 1.0;
        warned = false;
        return;
    }

    // Warning: "Magic Missile!" 1 second before casting
    if (t >= warningTime && !warned) {
        if (global.speak) global.speak("Magic missile!");
        warned = true;
    }

    if (t >= nextFireTime) {
        shoot();
        nextFireTime = t + script.fireRate;
        warningTime = nextFireTime - 1.0;
        warned = false;
    }
});

// PUBLIC API — restart shooting (for round restart)
script.api.restartShooting = function () {
    print("Bot resetting fire timer");
    var t = global.getTime();
    nextFireTime = t + script.fireRate;
    warningTime = nextFireTime - 1.0;
    warned = false;
};
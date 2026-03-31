// Spawn Object at World Mesh On Tap.js (Modified)
// Description: Spawns a preview of the bot that follows your gaze (World Mesh). Tap to confirm placement.

// @input Component.DeviceTracking deviceTracking
// @input Asset.ObjectPrefab prefab
// @input SceneObject parent
// @input Component.ScriptComponent[] behaviorCallback
// @input Component.ScriptComponent roundManager
// @input Asset.ObjectPrefab reticlePrefab {"label": "Reticle Prefab (Optional)"}

var usingReticle = false;
var previewObj = null;
var isPlacing = true;
var lastLogTime = 0;

function onAwake() {
    print("🌍 Bot Placement: Initializing Preview Mode...");
    global.isPlacingBot = true;

    if (!script.deviceTracking) {
        print("❌ ERROR: Device Tracking not assigned.");
        return;
    }

    if (!script.prefab) {
        print("❌ ERROR: Bot Prefab not assigned.");
        return;
    }

    // 1. Choose Preview Object (Reticle or actual Bot)
    if (script.reticlePrefab) {
        print("🎯 Using Separate Reticle Prefab for preview.");
        previewObj = script.reticlePrefab.instantiate(script.parent || null);
        usingReticle = true;
    } else {
        print("🤖 Using Bot Prefab for preview.");
        previewObj = script.prefab.instantiate(script.parent || null);
        usingReticle = false;
    }

    previewObj.enabled = true; // Make sure it's visible

    // 2. Disable its physics/colliders while placing
    setComponentsEnabled(previewObj, false);

    // 3. FORCE Visuals to be Visible ONLY for Bot (Reticle should be fine as-is)
    // This prevents unhiding potential debug spheres in the Reticle prefab.
    if (!usingReticle) {
        setVisualsEnabled(previewObj, true);
    } else {
        // EXTRA CLEANUP for Reticle: Explicitly HIDE any "Sphere" or debug objects 
        // that might be visible by default.
        cleanupPreview(previewObj);
    }

    // 4. Set Instruction Text on Preview
    setPreviewText(previewObj, "Say \"place\"\nto anchor me");

    // 4b. Speak Instructions 
    var d = script.createEvent("DelayedCallbackEvent");
    d.bind(function () {
        if (global.speak) {
            global.speak("Say place to anchor me");
        } else {
            print("⚠️ TTS Global not ready yet.");
        }
    });
    d.reset(1.0); // Wait 1s for systems to init

    // 5. Bind Events
    script.createEvent("UpdateEvent").bind(onUpdate);
    script.createEvent("TapEvent").bind(onTap);

    // 6. Pinch Gesture Support
    try {
        var gestureModule = require("LensStudio:GestureModule");

        // In JS, Enums might be on the module or need to be accessed differently.
        // We try to find HandType on the module, or fallback to strings.
        var HandType = gestureModule.HandType || { Right: "right", Left: "left" };

        // If GestureModule global exists (unlikely in pure JS), usage is fine, but let's be safe.
        if (typeof GestureModule !== "undefined") {
            HandType = GestureModule.HandType;
        }

        print("🖐️ Initializing Pinch with HandType: " + JSON.stringify(HandType));

        var onPinch = function (args) {
            print("👌 Pinch Detected! Strength: " + (args ? args.strength : "N/A"));
            // Trigger Tap Logic
            onTap({ getPosition: function () { return new vec2(0.5, 0.5); } });
        };

        // Subscribe to Right Hand
        try {
            gestureModule.getPinchDownEvent(HandType.Right).add(onPinch);
            print("   -> Subscribed to Right Hand Pinch");
        } catch (e) { print("   -> Failed Right Hand: " + e); }

        // Subscribe to Left Hand
        try {
            gestureModule.getPinchDownEvent(HandType.Left).add(onPinch);
            print("   -> Subscribed to Left Hand Pinch");
        } catch (e) { print("   -> Failed Left Hand: " + e); }

        print("✅ Gesture Module Setup Complete.");

        // Update instruction text
        setPreviewText(previewObj, "Say \"place\"\nto anchor me");

    } catch (e) {
        print("⚠️ GestureModule Error: " + e + "\nStack: " + e.stack);
    }
}

function setPreviewText(obj, text) {
    if (!obj) return;

    // 1. Try finding Bot_Health script or similar API
    var scripts = obj.getComponents("Component.ScriptComponent");
    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].api && scripts[i].api.setCustomText) {
            scripts[i].api.setCustomText(text);
            return; // Found it, stop searching this branch
        }
    }

    // 2. Try generic Text3D if no script found
    var text3d = obj.getComponent("Component.Text3D");
    if (text3d) {
        text3d.text = text;
        return;
    }

    // 3. Recurse children
    for (var c = 0; c < obj.getChildrenCount(); c++) {
        setPreviewText(obj.getChild(c), text);
    }
}

function cleanupPreview(obj) {
    if (!obj) return;
    var name = obj.name.toLowerCase();
    if (name.indexOf("sphere") !== -1 || name.indexOf("debug") !== -1) {
        print("   -> Hiding unwanted object in preview: " + obj.name);
        obj.enabled = false;
    }
    for (var i = 0; i < obj.getChildrenCount(); i++) {
        cleanupPreview(obj.getChild(i));
    }
}

function onUpdate() {
    // Debugging Frame Counter
    var t = getTime();

    // VOICE PLACE
    if (global.voicePlaceRequested) {
        global.voicePlaceRequested = false; // consume flag
        if (isPlacing) {
            print("🎤 Voice Place Command Handled!");
            onTap({ getPosition: function () { return new vec2(0.5, 0.5); } });
        }
    }

    var shouldLog = (t - lastLogTime > 1.0); // Log every 1 second

    if (!isPlacing) {
        if (shouldLog) print("Duplicate onUpdate call? isPlacing is false.");
        return;
    }

    if (!previewObj) {
        if (shouldLog) print("Preview Obj missing!");
        return;
    }

    // Hit test Center of Screen (0.5, 0.5)
    var centerPos = new vec2(0.5, 0.5);
    var hitPos = null;
    var hitNormal = vec3.up();
    var hitFound = false;

    // STRATEGY 1: Built-in DeviceTracking Hit Test
    if (script.deviceTracking) {
        var results = script.deviceTracking.hitTestWorldMesh(centerPos);
        if (results.length > 0) {
            hitPos = results[0].position;
            hitNormal = results[0].normal;
            hitFound = true;
        }
    }

    // STRATEGY 2: Global WorldMeshController (Fallback)
    if (!hitFound && global.WorldMeshController && global.WorldMeshController.getHitTestResult) {
        var result = global.WorldMeshController.getHitTestResult(centerPos);
        if (result && result.isValid()) {
            hitPos = result.getWorldPos();
            hitNormal = result.getNormalVec();
            hitFound = true;
        }
    }

    if (hitFound) {
        // Log Success
        // if (shouldLog) print("✅ Hit Found! Moving to: " + hitPos);

        // Move Preview to Surface
        previewObj.getTransform().setWorldPosition(hitPos);

        // Align Rotation
        var up = vec3.up();
        if (Math.abs(hitNormal.dot(up)) > 0.8) {
            previewObj.getTransform().setWorldRotation(quat.quatIdentity());
        } else {
            var forward = up.projectOnPlane(hitNormal);
            if (forward.lengthSquared > 0.001) {
                var rot = quat.lookAt(forward, hitNormal);
                previewObj.getTransform().setWorldRotation(rot);
            }
        }
    } else {
        // NO HIT
        // if (shouldLog) print("⚠️ No Hit Test Result.");

        // Fallback: Float in front of camera
        var cam = script.camera ? script.camera : (script.deviceTracking.getSceneObject().getComponent("Component.Camera"));

        if (!cam) {
            if (script.deviceTracking.getSceneObject()) {
                var c = script.deviceTracking.getSceneObject().getComponent("Component.Camera");
                if (c) cam = c;
            }
        }

        if (cam) {
            var camTrans = cam.getSceneObject().getTransform();
            var floatPos = camTrans.getWorldPosition().add(camTrans.forward.uniformScale(150));
            // if (shouldLog) print("📷 Floating at Camera: " + floatPos);
            previewObj.getTransform().setWorldPosition(floatPos);
            previewObj.getTransform().setWorldRotation(quat.quatIdentity());
        }

        // Debug Log (Throttled)
        if (t - lastLogTime > 2.0) {
            // print("⚠️ BotPlacement: No Hit & No Camera found."); 
        }
    }

    if (shouldLog) lastLogTime = t;
}

function onTap(eventData) {
    if (!isPlacing) return;

    print("📍 Tap Detected! Placing Bot...");
    isPlacing = false;

    var finalPos = previewObj.getTransform().getWorldPosition();
    var finalRot = previewObj.getTransform().getWorldRotation();
    var botToInit = previewObj;

    // IF we are using a separate reticle, SWAP it now!
    if (usingReticle) {
        print("🔄 Swapping Reticle for Real Bot...");

        // 1. Destroy Reticle
        previewObj.destroy();

        // 2. Instantiate Real Bot
        botToInit = script.prefab.instantiate(script.parent || null);
        botToInit.getTransform().setWorldPosition(finalPos);
        botToInit.getTransform().setWorldRotation(finalRot);
        botToInit.enabled = true;

        // We don't need to "Enable" components because it's a fresh spawn, they should be enabled by default.
        // But we should ensure physics are ON just in case.
        setComponentsEnabled(botToInit, true);
    } else {
        // Just solidify the ghost
        setComponentsEnabled(botToInit, true);
    }

    // 3. Initialize Bot Properties (Start Pos)
    initializeBotScripts(botToInit, finalPos);

    // 4. Trigger Global Game State
    var delay = script.createEvent("DelayedCallbackEvent");
    delay.bind(function () {
        global.isPlacingBot = false;
        print("🔓 Inputs Unlocked.");
    });
    delay.reset(0.5);

    // 5. Notify RoundManager
    notifyGameStart(findHealthScript(botToInit), findSpawnerScript(botToInit), findBehaviourScript(botToInit));

    // 6. Trigger other callbacks
    triggerBehaviors(script.behaviorCallback);

    // Disable this script's loop
    script.enabled = false;
}

// --- HELPERS ---

function setComponentsEnabled(obj, enabled) {
    if (!obj) return;

    // Colliders
    var colliders = obj.getComponents("Component.ColliderComponent");
    for (var i = 0; i < colliders.length; i++) {
        colliders[i].enabled = enabled;
    }

    // Physics Bodies
    var bodies = obj.getComponents("Component.PhysicsBody");
    for (var j = 0; j < bodies.length; j++) {
        bodies[j].enabled = enabled;
    }

    // SCRIPTS
    // WARNING: Disabling all scripts might break visuals if they depend on scripts (e.g. skinning, bone sync).
    // For now, we will KEEP scripts enabled to ensure the bot is visible.
    // If the bot starts attacking during placement, we will need to be more selective here.
    /*
    var scripts = obj.getComponents("Component.ScriptComponent");
    for (var s = 0; s < scripts.length; s++) {
        if (scripts[s] !== script) {
            scripts[s].enabled = enabled;
        }
    }
    */

    // Tracking (Disable tracking while placing)
    if (!enabled) {
        var trackers = obj.getComponents("Component.DeviceTracking");
        for (var k = 0; k < trackers.length; k++) trackers[k].enabled = false;
    }

    // Children
    for (var c = 0; c < obj.getChildrenCount(); c++) {
        setComponentsEnabled(obj.getChild(c), enabled);
    }
}

// Ensure Visuals are always ON
function setVisualsEnabled(obj, enabled) {
    if (!obj) return;

    // EXCEPTION: User requested removal of "Sphere". 
    // If this object is named "Sphere", we assume it's a debug mesh or collider 
    // that should remain hidden. We DO NOT force it to be visible.
    // We still recurse in case the sphere has children that need to be seen (unlikely but safe).
    var nameLower = obj.name.toLowerCase();
    if (nameLower.indexOf("sphere") !== -1) {
        print("   -> Ignoring 'Sphere' object: " + obj.name);
        // Do not enable visuals on this specific object
    } else {
        // Check RenderMeshVisual
        var visuals = obj.getComponents("Component.RenderMeshVisual");
        if (visuals.length > 0) {
            print("   -> Found " + visuals.length + " RenderMeshVisuals on " + obj.name + ". Setting enabled=" + enabled);
            for (var i = 0; i < visuals.length; i++) {
                visuals[i].enabled = enabled;
                // Also ensure the main pass is enabled if applicable
                if (visuals[i].mainPass) visuals[i].mainPass.enabled = enabled;
            }
        }

        // Also check for "Component.Image"
        var images = obj.getComponents("Component.Image");
        if (images.length > 0) {
            print("   -> Found " + images.length + " Images on " + obj.name + ". Setting enabled=" + enabled);
            for (var k = 0; k < images.length; k++) images[k].enabled = enabled;
        }
    }

    // Recurse
    for (var c = 0; c < obj.getChildrenCount(); c++) {
        setVisualsEnabled(obj.getChild(c), enabled);
    }
}

function initializeBotScripts(obj, pos) {
    var scripts = obj.getComponents("Component.ScriptComponent");
    for (var i = 0; i < scripts.length; i++) {
        var s = scripts[i];

        // Re-enable if we disabled them
        s.enabled = true;

        if (s.api && s.api.updateStartPosition) {
            s.api.updateStartPosition(pos);
            if (s.api.resetHealth) s.api.resetHealth();
        }
        else if (s.updateStartPosition) {
            s.updateStartPosition(pos);
        }

        // If the script needs a "start" kick because onAwake already ran:
        if (s.api && s.api.restart) s.api.restart();
    }
}

function notifyGameStart(healthScript, spawnerScript, behaviourScript) {
    // 1. Try Direct Assignment
    if (script.roundManager && script.roundManager.api && script.roundManager.api.onBotPlaced) {
        script.roundManager.api.onBotPlaced(healthScript, spawnerScript, behaviourScript);
    } else {
        // Safe Update: Don't crash if missing, just log warning
        print("⚠️ RoundManager not connected or missing onBotPlaced API. Skipping notification.");
    }
}

function findHealthScript(obj) {
    if (!obj) return null;
    var scripts = obj.getComponents("Component.ScriptComponent");
    for (var i = 0; i < scripts.length; i++) {
        // Look for Bot_Health via its API signature
        if (scripts[i].api && scripts[i].api.setCustomText) {
            return scripts[i];
        }
    }
    // Recurse
    for (var c = 0; c < obj.getChildrenCount(); c++) {
        var found = findHealthScript(obj.getChild(c));
        if (found) return found;
    }
    return null;
}

function findSpawnerScript(obj) {
    if (!obj) return null;
    var scripts = obj.getComponents("Component.ScriptComponent");
    for (var i = 0; i < scripts.length; i++) {
        // Look for NewSpawner_Bot via its API signature
        if (scripts[i].api && scripts[i].api.restartShooting) {
            return scripts[i];
        }
    }
    // Recurse
    for (var c = 0; c < obj.getChildrenCount(); c++) {
        var found = findSpawnerScript(obj.getChild(c));
        if (found) return found;
    }
    return null;
}

function findBehaviourScript(obj) {
    if (!obj) return null;
    var scripts = obj.getComponents("Component.ScriptComponent");
    for (var i = 0; i < scripts.length; i++) {
        // Look for BotBehaviour via its API signature
        if (scripts[i].api && scripts[i].api.resetMovement) {
            return scripts[i];
        }
    }
    // Recurse
    for (var c = 0; c < obj.getChildrenCount(); c++) {
        var found = findBehaviourScript(obj.getChild(c));
        if (found) return found;
    }
    return null;
}

function triggerBehaviors(behaviors) {
    if (!behaviors) return;
    for (var i = 0; i < behaviors.length; i++) {
        if (behaviors[i] && behaviors[i].trigger) {
            behaviors[i].trigger();
        }
    }
}

onAwake();
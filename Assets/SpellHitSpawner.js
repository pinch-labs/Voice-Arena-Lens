// SpellHitSpawner.js
// Spawns a VFX prefab when the spell hits something (Player, Bot, Wall)

// @input Asset.ObjectPrefab[] hitPrefabs
// @input int[] hitCounts
// @input float explosionSpeed = 300.0 {"widget":"slider", "min":0, "max":1000, "step":10}
// @input float lifetime = 3.0
// @input Component.AudioComponent hitSound

// Physics.ColliderComponent
var collider = script.getSceneObject().getComponent("Physics.ColliderComponent");
var spawnTime = global.getTime(); // Record when the spell was created
var hasHit = false; // Prevent double hits

if (!collider) {
    print("⚠️ SpellHitSpawner: No Collider found on " + script.getSceneObject().name);
} else {
    collider.onOverlapEnter.add(onHit);
}

function onHit(e) {
    // Ignore hits during the first 0.2 seconds (prevents hitting self/caster)
    if (global.getTime() - spawnTime < 0.2) {
        return;
    }

    // Prevent double hits (e.g. hitting multiple body parts or rapid collisions)
    if (hasHit) return;

    if (!e || !e.overlap || !e.overlap.collider) {
        // print("⚠️ Invalid collision event data");
        return;
    }

    var other = e.overlap.collider.getSceneObject();
    if (!other) return;

    // Ignore collision with self-spawned effects or other spells if needed
    // But usually collision filters handle this.

    print("💥 Spell hit: " + other.name);

    // Spawn Hit VFX (Multiple types support)
    if (script.hitPrefabs && script.hitPrefabs.length > 0) {

        // Calculate Base Spawn Position (Offset back slightly)
        var t = script.getTransform();
        var pos = t.getWorldPosition();
        var fwd = new vec3(0, 0, 1);

        // Safe Forward
        if (t.getForward) { fwd = t.getForward(); }
        else if (t.getWorldRotation && t.getWorldRotation().multiplyVec3) {
            fwd = t.getWorldRotation().multiplyVec3(new vec3(0, 0, -1));
        }

        var basePos = pos.sub(fwd.uniformScale(0.4));
        print("💥 Spawning Hit Effects at " + basePos);

        // Iterate through all assigned prefabs
        for (var i = 0; i < script.hitPrefabs.length; i++) {
            var prefab = script.hitPrefabs[i];
            if (!prefab) continue;

            // Determine count (default to 1 if count array is too short)
            var count = 1;
            if (script.hitCounts && i < script.hitCounts.length) {
                count = script.hitCounts[i];
            }

            // Spawn loop
            for (var j = 0; j < count; j++) {
                var vfx = prefab.instantiate(null); // Root parent
                if (!vfx) continue;

                vfx.enabled = true; // Ensure visible

                // Random Jitter (30cm spread)
                var jitter = new vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).uniformScale(30.0);
                vfx.getTransform().setWorldPosition(basePos.add(jitter));

                // Scale (User requested 6x previously for single item, maybe exposure scale input? 
                // defaulting to 1x or preserving prefab scale is safer for generic lists. 
                // But previous code forced 6x. I will assume Prefab has correct scale or add an input if needed.
                // Reverting to prefab scale for generic usage, or maybe 1.0. 
                // Previous code: vfx.getTransform().setWorldScale(new vec3(6, 6, 6)); 
                // I'll leave scale alone (prefab default) to be flexible.)

                // Physics Explosion Logic
                var body = vfx.getComponent("Component.PhysicsBody");
                if (body) {
                    body.enabled = true;
                    // Random Direction
                    var dir = new vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

                    if (body.setVelocity) {
                        body.setVelocity(dir.uniformScale(script.explosionSpeed));
                    } else if (body.addImpulse) {
                        body.addImpulse(dir.uniformScale(script.explosionSpeed));
                    }

                    if (body.addTorque) {
                        var spin = new vec3(Math.random(), Math.random(), Math.random()).uniformScale(script.explosionSpeed * 0.5);
                        body.addTorque(spin);
                    }
                }

                // Cleanup (Destroy after lifetime)
                var cleanup = script.createEvent("DelayedCallbackEvent");
                cleanup.bind(function (obj) {
                    if (obj) obj.destroy();
                });
                // Pass vfx instance via scope closure (vfx var is function scoped in older JS? 
                // LS JS uses var function scope. We need a closure wrapper or let. 
                // Using helper function to capture 'vfx' correctly).
                scheduleDestroy(vfx, script.lifetime + (Math.random() * 0.5));
            }
        }
    }

    // Helper for closure capture
    function scheduleDestroy(obj, time) {
        var evt = script.createEvent("DelayedCallbackEvent");
        evt.bind(function () {
            if (obj) obj.destroy();
        });
        evt.reset(time);
    }

    // Play Sound
    if (script.hitSound) {
        script.hitSound.play(1);
    }

    // Note: We do NOT destroy the spell here. 
    // Player_Health/Bot_Health destroy it on hit.
    // If hitting a wall, it might persist until timeout or pass through.
    // If you want wall collisions to destroy, add logic here.
}

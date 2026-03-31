// RockExplosion.js
// Spawns multiple rock debris pieces and sends them flying in random directions.
// Attach this to a "Hit Effect" prefab that gets instantiated on impact.

// @input Asset.ObjectPrefab rockPrefab
// @input int count = 10
// @input float speed = 200.0 {"widget":"slider", "min":0, "max":1000, "step":10}
// @input float lifetime = 3.0
// @input bool usePhysics = true

// Optional: Add some randomness to the scale
// @input float minScale = 0.5
// @input float maxScale = 1.5

function onEnable() {
    if (!script.rockPrefab) {
        print("⚠️ RockExplosion: Check script inputs, 'Rock Prefab' is missing.");
        return;
    }

    var originPos = script.getTransform().getWorldPosition();

    // Hide the emitter itself (if it has a mesh)
    var meshVis = script.getComponent("Component.RenderMeshVisual");
    if (meshVis) meshVis.enabled = false;

    print("💥 RockExplosion: Spawning " + script.count + " rocks at " + originPos);

    for (var i = 0; i < script.count; i++) {
        spawnRock(originPos);
    }

    // Destroy the spawner object itself after rocks are gone (plus buffer), 
    // assuming this script is on a temporary "VFX" object.
    // If this script is on a permanent manager, remove this line.
    var killSpawner = script.createEvent("DelayedCallbackEvent");
    killSpawner.bind(function () {
        script.getSceneObject().destroy();
    });
    killSpawner.reset(script.lifetime + 1.0);
}

function spawnRock(origin) {
    // Instantiate rock at root to ensure it survives if the spawner is destroyed
    var rock = script.rockPrefab.instantiate(null);
    rock.enabled = true;

    // Position with small random offset to avoid physics overlap/stacking
    var jitter = new vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).uniformScale(30.0); // 30cm spread
    rock.getTransform().setWorldPosition(origin.add(jitter));

    // Random Scale
    var s = script.minScale + Math.random() * (script.maxScale - script.minScale);
    rock.getTransform().setWorldScale(new vec3(s, s, s));

    // Random Rotation
    var randRot = quat.fromEulerVec(new vec3(Math.random() * 360, Math.random() * 360, Math.random() * 360));
    rock.getTransform().setWorldRotation(randRot);

    // Random Direction (Sphere)
    var dir = new vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

    // Apply Physics
    if (script.usePhysics) {
        var body = rock.getComponent("Component.PhysicsBody");
        if (body) {
            body.enabled = true;
            // Use setVelocity for immediate reliable movement regardless of mass
            if (body.setVelocity) {
                body.setVelocity(dir.uniformScale(script.speed));
            } else {
                // Fallback if setVelocity is missing (very old API?)
                print("⚠️ RockExplosion: setVelocity missing, trying addForce.");
                if (body.addImpulse) body.addImpulse(dir.uniformScale(script.speed));
            }

            // Random Spin
            if (body.addTorque) {
                var spin = new vec3(Math.random(), Math.random(), Math.random()).uniformScale(script.speed * 0.5);
                body.addTorque(spin);
            }
        } else {
            print("⚠️ RockExplosion: Spawned rock has NO PhysicsBody component!");
        }
    } else {
        // Fallback: Simple manual move logic could be added here if needed,
        // but for now we rely on Physics logic as requested for "flying" debris
        // which usually implies physics in Lens Studio.
    }

    // Cleanup individual rock
    var d = script.createEvent("DelayedCallbackEvent");
    d.bind(function () {
        if (rock) rock.destroy();
    });
    d.reset(script.lifetime + (Math.random() * 0.5));
}

// Run immediately
onEnable();

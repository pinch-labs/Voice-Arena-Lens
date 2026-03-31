// @input float speed = 70
// @input Component.VFXComponent trailVFX

// Clone VFX
if (script.trailVFX && script.trailVFX.asset) {
    script.trailVFX.asset = script.trailVFX.asset.clone();
}

// Allow external aim direction override
var aimDirection = null;

script.api.setAimDirection = function (dir) {
    aimDirection = dir;
};

// Move forward every frame
var update = script.createEvent("UpdateEvent");
update.bind(function (eventData) {
    var dt = eventData.getDeltaTime();

    // Use custom aim direction if set, otherwise use object's forward
    var moveDir = aimDirection ? aimDirection : script.getTransform().forward;
    var move = moveDir.uniformScale(script.speed * dt);
    script.getTransform().setWorldPosition(script.getTransform().getWorldPosition().add(move));
});

// Die after 3 seconds
var destroyEvent = script.createEvent("DelayedCallbackEvent");
destroyEvent.bind(function () {
    if (script.getSceneObject()) {
        script.getSceneObject().destroy();
    }
});
destroyEvent.reset(3.0);

// Collision Logic: Destroy opposing spells
var collider = script.getSceneObject().getComponent("Physics.ColliderComponent");
if (collider) {
    collider.overlapFilter.includeDynamic = true;

    collider.onOverlapEnter.add(function (e) {
        var otherObj = e.overlap.collider.getSceneObject();
        if (!otherObj) return;

        // Check for opposing spells (Player vs Bot)
        // Adjust these name checks based on your actual Prefab names!
        var myName = script.getSceneObject().name;
        var otherName = otherObj.name;

        // If both are spells and different types (Player vs Bot)
        if (otherName.includes("Spell") && myName !== otherName) {
            print("💥 Spell Collision: " + myName + " hit " + otherName);

            // Destroy the other spell
            otherObj.destroy();

            // Destroy self
            script.getSceneObject().destroy();
        }
    });
}
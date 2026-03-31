// @input float speed = 70
// @input Component.VFXComponent trailVFX

var aimDirectionObject = null;

// Public API so spawner can pass the aim object
script.api.setAimDirection = function(obj) {
    aimDirectionObject = obj;
};

// Clone VFX
if (script.trailVFX && script.trailVFX.asset) {
    script.trailVFX.asset = script.trailVFX.asset.clone();
}

// Movement — uses the clean aim direction
var update = script.createEvent("UpdateEvent");
update.bind(function(eventData) {
    if (!aimDirectionObject) return;  // safety

    var dt = eventData.getDeltaTime();
    var forward = aimDirectionObject.getTransform().forward;
    var move = forward.mult(new vec3(script.speed * dt, script.speed * dt, script.speed * dt));
    
    script.getTransform().setWorldPosition(
        script.getTransform().getWorldPosition().add(move)
    );
});

// Die after 3 seconds
var destroy = script.createEvent("DelayedCallbackEvent");
destroy.bind(function() {
    if (script.getSceneObject()) {
        script.getSceneObject().destroy();
    }
});
destroy.reset(3.0);
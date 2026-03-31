function scriptBody(script) {
    // -----JS CODE-----

    // Spawn VFX immediately at current position
    var vfxComponent = script.getSceneObject().createComponent("Component.VFXComponent");
    if (script.vfxAsset) {
        vfxComponent.asset = script.vfxAsset.clone();
        vfxComponent.asset.properties.spawnTime = global.getTime();
        print("🎆 VFX Component Initialized at time: " + global.getTime());
    } else {
        print("⚠️ No VFX Asset assigned to Hit Effect!");
    }

    // Auto-destroy the hit effect object after 3 seconds
    var dest = script.createEvent("DelayedCallbackEvent");
    dest.bind(function () {
        if (script.getSceneObject()) {
            script.getSceneObject().destroy();
        }
    });
    dest.reset(3.0);

}; module.exports = scriptBody;
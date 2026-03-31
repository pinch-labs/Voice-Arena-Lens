// @input Component.VFXComponent trailVFX
var newVfxAsset = script.trailVFX.asset.clone();
script.trailVFX.asset = newVfxAsset;

var delay = script.createEvent("DelayedCallbackEvent");

delay.bind(function () {
    script.getSceneObject().destroy();
});

delay.reset(3);
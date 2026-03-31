// -----JS CODE-----
// PlayAnimation.js
// Version: 0.0.3
// Event: Lens Turned On
// Description: Plays a single animation on an animated mesh. If an AnimationMixer is not set, the script will attempt to find one on the SceneObject.
//@input Component.AnimationMixer animationMixer
//@input string[] animationLayerName = "BaseLayer"
//@input float animationWeight = 1.0 {"widget":"slider", "min": 0, "max": 1, "step": 0.01}
//@input float animationStartOffset = 0.0
//@input int numberOfLoops = -1

if(!script.animationMixer) {
    script.animationMixer = script.getSceneObject().getFirstComponent("Component.AnimationMixer");
}
if(script.animationMixer) {
    for (i = 0; i < 40; i++) {
    script.animationMixer.setWeight(script.animationLayerName[i], script.animationWeight);
    script.animationMixer.start(script.animationLayerName[i], script.animationStartOffset, script.numberOfLoops);
    }
}
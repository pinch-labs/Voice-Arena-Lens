// @input Asset.ObjectPrefab instObj
// @input float timer
// @input Component.AudioComponent electric

var inc = 0;
if (script.instObj) {
function onTapped(eventData) {
        var sceneObj = script.instObj.instantiate(null);
        var t = sceneObj.getTransform();      
        t.setWorldPosition(script.getTransform().getWorldPosition());
        t.setWorldRotation(script.getTransform().getWorldRotation());
     //   script.electric.play(1);
        inc++;
        print(inc);
    }
}
var event = script.createEvent("TapEvent");
event.bind(onTapped);
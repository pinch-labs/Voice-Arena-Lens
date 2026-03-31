// -----JS CODE-----
//@input vec3 Rotation
//@input float Speed

// Equivalent to GameObject
var object = script.getSceneObject();

// Just like Unity Transform!
var transform = script.getTransform();

function onUpdate(ev) {
  var transform = script.getTransform();
  var rotation = transform.getLocalRotation();
  var amt = script.Rotation.uniformScale(getDeltaTime() * script.Speed);

  var rotateY = quat.angleAxis(amt.x, vec3.up());
  var rotateX = quat.angleAxis(amt.y, vec3.left());
  var rotateZ = quat.angleAxis(amt.z, vec3.forward());

  rotation = rotation
    .multiply(rotateY)
    .multiply(rotateX)
    .multiply(rotateZ);

  transform.setLocalRotation(rotation);
}

var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(onUpdate);
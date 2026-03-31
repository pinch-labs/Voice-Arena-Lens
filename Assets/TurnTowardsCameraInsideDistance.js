// -----JS CODE-----
// LENS STUDIO
// When camera is within the specified distance of this object,
// rotate to face the camera at the specified lerp value.
// When the camera is outside the distance, rotate back to original rotation.

// @input SceneObject cameraObject
// @input float triggerDistance = 135
// @input float lerpValue = .05

script.baseRotation = script.getTransform().getWorldRotation();
  
script.createEvent("UpdateEvent").bind(function () {
    var cameraPosition = script.cameraObject.getTransform().getWorldPosition();
    var objectPosition = script.getTransform().getWorldPosition();

    // Set Y values to be the same so distance and direction are measured on a flat plane
    objectPosition.y = cameraPosition.y;
    
    var distance = objectPosition.distance(cameraPosition);
    var currentRotation = script.getTransform().getWorldRotation();
    
    if(distance >= script.triggerDistance) {
        // Camera is too far, so object returns to original rotation
        var newRotation = quat.slerp(currentRotation, script.baseRotation, script.lerpValue);
        script.getTransform().setWorldRotation(newRotation);
    } 
    else {
        // Cam is close by, so object rotates towards camera
        var directionToCamera = cameraPosition.sub(objectPosition).normalize();
        var newRotation = quat.slerp(currentRotation, quat.lookAt(directionToCamera, vec3.up()), script.lerpValue);
        script.getTransform().setWorldRotation(newRotation);
    }
}); 
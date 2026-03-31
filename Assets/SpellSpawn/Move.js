// -----JS CODE-----
// @input float speed

script.api.move = function () {
    
    var worldPos = script.getTransform().getWorldPosition(); 
    var fwd = script.getTransform().forward;
    
    var s = script.speed;
    fwd = fwd.mult(new vec3(s,s,s));
    
    script.getTransform().setWorldPosition(worldPos.add(fwd));
    
}
// Debug: Print ALL component types on this object
var obj = script.getSceneObject();
var components = obj.getComponents();

print("=== Components on " + obj.name + " ===");
for (var i = 0; i < components.length; i++) {
    var comp = components[i];
    print("Component " + i + ": " + (comp.getTypeName ? comp.getTypeName() : comp.type || "unknown"));
}
print("=== End ===");
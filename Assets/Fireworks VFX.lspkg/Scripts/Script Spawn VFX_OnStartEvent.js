//@input Asset.VFXAsset vfxAsset
//@input Component.Camera cam
//@input int MaxSystems = 3



function validateInputs() {
    if (!script.cam) {
        print("ERROR: Make sure to assign a Camera object to the \"Cam\" property field.");
        return false;
    }
    return true;
}

// check inputs
var initialized;
initialized = validateInputs();

if (!initialized) {
    return;
}
else{
    script.createEvent("OnStartEvent").bind(function() { require("Script Spawn VFX_wrapped")(script)})
}




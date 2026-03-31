// SimpleMeshPlacement.js (DISABLED)
// This script has been disabled to prevent duplicate bots.
// The new system uses "Spawn Object at World Mesh On Tap.js".

// @input SceneObject botObject

function onAwake() {
    print("⚠️ SimpleMeshPlacement: Disabling self to prevent duplicates.");

    // Hide the conflicting pre-existing bot
    if (script.botObject) {
        script.botObject.enabled = false;
        print("   -> Hid conflicting 'botObject'.");
    }

    // Disable this script
    script.enabled = false;
}

onAwake();

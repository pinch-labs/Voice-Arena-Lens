// @input SceneObject leftWand
// @input SceneObject rightWand
// @input Component.ScriptComponent roundManager
// VoiceML_SpeechRecognition.js
// Fully working + exposes final transcript to other scripts

// Import VoiceML Module
const voiceMLModule = require("LensStudio:VoiceMLModule");

// Listening Options
let options = VoiceML.ListeningOptions.create();
options.speechRecognizer = VoiceMLModule.SpeechRecognizer.Default;
options.languageCode = 'en_US';
options.shouldReturnAsrTranscription = true;
options.shouldReturnInterimAsrTranscription = true;

// Optional: Boost specific phrases (helps recognition)
let phrases = ["start", "begin", "go", "fire", "shoot", "rock", "left", "right", "yes", "no", "place", "please"];
options.addSpeechContext(phrases, 10);  // Higher boost = better accuracy

// PUBLIC API — other scripts (like GameManager) can read this
script.api.finalTranscript = "";   // ← This is what GameManager checks

// Handlers
let onListeningEnabledHandler = function () {
    print("VoiceML: Listening started...");
    voiceMLModule.startListening(options);
};

let onListeningDisabledHandler = function () {
    print("VoiceML: Listening stopped.");
    voiceMLModule.stopListening();
};

let onListeningErrorHandler = function (eventErrorArgs) {
    print("VoiceML Error: " + eventErrorArgs.error + " | " + eventErrorArgs.description);
};

// Singleton Check
if (global.hasSpeechRecognizer) {
    print("⚠️ DUPLICATE SpeechRecognition detected! Disabling this instance.");
    script.enabled = false;
    return;
}
global.hasSpeechRecognizer = true;

// Generate random ID to detect duplicates
var instanceID = Math.floor(Math.random() * 1000);
print("🎤 SpeechRecognition initialized. ID: " + instanceID);

// Logic Variables
var activeWand = null; // Track current wand for direct calls
var lastToggleTimeLeft = 0;
var lastToggleTimeRight = 0;

function triggerWandFire(wandObj) {
    if (!wandObj) {
        print("⚠️ No active wand selected. Say 'Left' or 'Right' first, or ensure activeWand is set.");
        return;
    }

    // Recursive helper to find script with .shoot API
    var findScriptWithError = function (obj) {
        if (!obj) return null;
        var scripts = obj.getComponents("Component.ScriptComponent");
        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].api && scripts[i].api.shoot) {
                return scripts[i];
            }
        }
        var count = obj.getChildrenCount();
        for (var i = 0; i < count; i++) {
            var result = findScriptWithError(obj.getChild(i));
            if (result) return result;
        }
        return null;
    };

    var targetScript = findScriptWithError(wandObj);

    if (targetScript) {
        print("⚡ Calling shoot() on " + (targetScript.getSceneObject() ? targetScript.getSceneObject().name : "Unknown"));
        targetScript.api.shoot();
        return;
    }

    print("⚠️ No NewSpawner with .shoot API found on " + wandObj.name + " or its children. Please add NewSpawner.js to this object!");
}

let onUpdateListeningEventHandler = function (eventArgs) {
    var currentTime = global.getTime(); // Use Lens Studio time

    // GLOBAL COOLDOWN CHECK (applies generally)
    if (global.lastVoiceCastTime && (currentTime - global.lastVoiceCastTime < 2.0)) {
        return;
    }

    var text = eventArgs.transcription.trim().toLowerCase();
    if (text === "") return;

    print("Heard: " + text);

    // 1. SPELL CASTING
    if (text.includes("rock")) {
        print("🚀 FAST Trigger via Voice (Interim): ROCK [Instance " + instanceID + "]");

        // Method 1: Global Flag (Legacy/Backup)
        global.voiceCastRequested = true;
        global.lastVoiceCastTime = currentTime;
        script.lastCastTime = currentTime;

        // Method 2: Direct Call (Reliable)
        triggerWandFire(activeWand);

        return;
    }

    // 2. LEFT WAND SELECTION (Exclusive)
    if (text.match(/\bleft\b/)) {
        if (currentTime - lastToggleTimeLeft > 3.0) {
            // Enable Left, Disable Right
            if (script.leftWand) {
                script.leftWand.enabled = true;
                activeWand = script.leftWand;
            }
            if (script.rightWand) script.rightWand.enabled = false;

            print("⬅️ Selected Left Wand [Instance " + instanceID + "]");
            lastToggleTimeLeft = currentTime;

            // Notify RoundManager
            if (script.roundManager && script.roundManager.api && script.roundManager.api.onHandChosen) {
                script.roundManager.api.onHandChosen("left");
            }
        }
    }

    // 3. RIGHT WAND SELECTION (Exclusive)
    if (text.match(/\bright\b/)) {
        if (currentTime - lastToggleTimeRight > 3.0) {
            // Enable Right, Disable Left
            if (script.rightWand) {
                script.rightWand.enabled = true;
                activeWand = script.rightWand;
            }
            if (script.leftWand) script.leftWand.enabled = false;

            print("➡️ Selected Right Wand [Instance " + instanceID + "]");
            lastToggleTimeRight = currentTime;

            // Notify RoundManager
            if (script.roundManager && script.roundManager.api && script.roundManager.api.onHandChosen) {
                script.roundManager.api.onHandChosen("right");
            }
        }
    }

    // 4. PLACEMENT COMMAND
    if (text.includes("place") || text.includes("please")) {
        print("📍 Voice Placement Detected! [Instance " + instanceID + "]");
        global.voicePlaceRequested = true;
        // Optional: Debounce to prevent multiple triggers
        if (currentTime - (global.lastVoicePlaceTime || 0) < 2.0) return;
        global.lastVoicePlaceTime = currentTime;
        return;
    }

    // 5. MATCH DECISION (Exclusive)
    if (text.match(/\byes\b/) || text.match(/\bno\b/)) {
        var decision = text.match(/\byes\b/) ? "yes" : "no";
        print("🗣️ Decision detected: " + decision);
        if (script.roundManager && script.roundManager.api && script.roundManager.api.onMatchDecision) {
            script.roundManager.api.onMatchDecision(decision);
        }
    }

    // Only store and react to FINAL results (for logging/other logic)
    if (eventArgs.isFinalTranscription) {
        print("FINAL: " + text);
        script.api.finalTranscript = text;
    }
};

// Attach all events
voiceMLModule.onListeningEnabled.add(onListeningEnabledHandler);
voiceMLModule.onListeningDisabled.add(onListeningDisabledHandler);
voiceMLModule.onListeningError.add(onListeningErrorHandler);
voiceMLModule.onListeningUpdate.add(onUpdateListeningEventHandler);

// Optional: Start listening on tap
var tapEvent = script.createEvent("TapEvent");
tapEvent.bind(function () {
    print("Tap detected — starting voice listening...");
    // Use the toggle method to ensure it works across all versions
    onListeningEnabledHandler();
});

// Auto-start listening when Lens loads (remove if you want manual only)
// voiceMLModule.requestListeningEnabled();
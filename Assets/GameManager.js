// GameManager.js — Listens for "start" via your VoiceML script

// @input Component.ScriptComponent voiceMLScript   // ← Drag your VoiceML script here!

var gameStarted = false;

// Listen every frame for new final transcriptions
script.createEvent("UpdateEvent").bind(function() {
    if (gameStarted) return;  // Already started

    if (!script.voiceMLScript || !script.voiceMLScript.api) return;

    // Check if VoiceML script has stored a final transcript
    if (script.voiceMLScript.api.finalTranscript) {
        var text = script.voiceMLScript.api.finalTranscript.toLowerCase().trim();

        if (text.includes("start")) {
            print("START! Game has begun!");
            gameStarted = true;
            // You can add more later: enable shooting, spawn bot, etc.
        }
    }
});
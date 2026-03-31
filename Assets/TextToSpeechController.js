// TextToSpeechController.js
// simplified TTS wrapper

// @input Asset.TextToSpeechModule ttsModule
// @input string voiceName = "Sasha" {"widget":"combobox", "values":[{"label":"Sasha", "value":"Sasha"}, {"label":"Sam", "value":"Sam"}, {"label":"Tia", "value":"Tia"}]}
// @input float speed = 1.0

var audioComp = script.getSceneObject().createComponent("Component.AudioComponent");

script.api.speak = function (text) {
    if (!script.ttsModule) {
        print("⚠️ TTS Missing Module! Add 'Text To Speech' from Asset Browser.");
        return;
    }

    // Clean text (remove newlines for speech)
    var spokenText = text.replace(/\n/g, " ");

    print("🗣️ Speaking: " + spokenText);

    var options = TextToSpeech.Options.create();
    options.voiceName = script.voiceName;
    options.speed = script.speed;

    script.ttsModule.synthesize(spokenText, options, playAudio, onError);
};

function playAudio(audioTrack, wordInfos) {
    audioComp.audioTrack = audioTrack;
    audioComp.play(1);
}

function onError(error, description) {
    print("❌ TTS Error: " + description);
}

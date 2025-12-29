$(document).ready(function() {

    const STORED_DATA_KEY = "input-text-data";

    var untranslatedLanguage = "ja"; // TODO get from page #lang=ABC

    var $inputTextArea = $("#input");
    var $inputButton = $("#import-button");

    var $exerciseArea = $("#exercise-area");
    var templateExerciseSubsection = $("#template-exercise-subsection").removeAttr("id").html();
    var templateQuestion = $("#template-question").removeAttr("id").html();

    var storedData = localStorage.getItem(STORED_DATA_KEY);
    $inputTextArea.val(localStorage.getItem(STORED_DATA_KEY));

    if(storedData != null && storedData != undefined && storedData.length > 0){
        SetupWorksheet(ConvertInputDataToSections(storedData));
    }

    $inputButton.on("click", function() {
        var text = $inputTextArea.val();
        localStorage.setItem(STORED_DATA_KEY, text);

        var sections = ConvertInputDataToSections(text);

        console.log("Data imported:", sections);

        SetupWorksheet(sections);
    });

    function CleanTitle(title) {
        const regex = /([A-Za-z0-9\s]+)/;
        const match = title.match(regex);
        if (match) {
            return match[0].trim();
        } else {
            return title;
        }
    }

    function ConvertInputDataToSections(rawInput) {
        var sections = [];
        var lines = rawInput.split("\n");
        var currentSection = -1;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line === "") continue;

            var firstCommaIndex = line.indexOf(",");
            if(firstCommaIndex == -1){
                currentSection++;
                sections[currentSection] = {
                    name: line,
                    entries: []
                };
            }
            else if(currentSection != -1){
                var untranslatedText = line.substring(0, firstCommaIndex).trim();
                var translatedText = line.substring(firstCommaIndex + 1).trim();
                var entry = { untranslated: untranslatedText, translated: translatedText };
                sections[currentSection].entries.push(entry);
            }
        }
        return sections;   
    }

    function SetupWorksheet(sections) {
        $exerciseArea.empty();
        for (var i = 0; i < sections.length; i++) {
            var section = sections[i];
            
            if (section.entries.length == 0) continue;

            var $exerciseSubsection = $(templateExerciseSubsection);
            if(section.name.toLowerCase().includes("conversation")){
                $exerciseSubsection.addClass("conversation");
            }
            $exerciseSubsection.find("h3").text(CleanTitle(section.name));
            var $exerciseQuestionList = $exerciseSubsection.find("ol");

            for (var j = 0; j < section.entries.length; j++) {
                var entry = section.entries[j];
                var $question = $(templateQuestion);
                $question.find(".untranslated-text .text").text(entry.untranslated);
                $question.find(".translated-text .text").text(entry.translated);
                $question.find(".tts-button").on("click", function() {
                    var $this = $(this);
                    var text = $this.parent().find(".text").text();
                    SpeakText(text, untranslatedLanguage);
                });
                $question.find(".reveal-answer-button").on("click", function() {
                    var $this = $(this);
                    var $text = $this.parent();
                    $text.addClass("revealed");
                });
                $exerciseQuestionList.append($question);
            }
            $exerciseArea.append($exerciseSubsection);

        }
    }
    
    function SpeakText(text, language) {
        var utterance = new SpeechSynthesisUtterance(text);
        var voices = GetVoices(language);
        if(voices == null || voices.length == 0){
            console.error("No voices found for language: " + language);
            return;
        }
        if(voices.length > 0){
            utterance.voice = voices[0];
        }
        utterance.text = text;
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        utterance.lang = language;
        window.speechSynthesis.speak(utterance);
    }

    window.speechSynthesis.onvoiceschanged = function() {
        GetVoices(untranslatedLanguage); // preload voices 
    }
});

function GetVoices(language){
    var matchingVoices = [];
    for(var i = 0; i < window.speechSynthesis.getVoices().length; i++) {
        var voice = window.speechSynthesis.getVoices()[i];
        if (voice.lang.startsWith(language)) {
            matchingVoices.push(voice);
        }
    }
    if(matchingVoices.length == 0) {
        console.error("No matching voices found for language: " + language);
        return null;
    }

    if(!window.navigator.onLine) { // remove any non-local voices if the user is not online
        for(var i = matchingVoices.length - 1; i >= 0; i--){
            if(!matchingVoices[i].localService){
                matchingVoices.splice(i, 1);
            }
        }
    }

    function IsVoiceGoodQuality(voice) {
        return voice.localService == false // online voices in Chrome are good - these are already removed if the user is offline
            || voice.voiceURI.toLowerCase().includes("enhanced") // mac can report these in webviews (not chrome)
            || voice.voiceURI.toLowerCase().includes("voice.compact"); // mac can report this in Safari
    }

    matchingVoices.sort(function(a, b) {
        return IsVoiceGoodQuality(a) != IsVoiceGoodQuality(b) ? (IsVoiceGoodQuality(a) ? -1 : 1) : 0;
    });
    return matchingVoices;
}
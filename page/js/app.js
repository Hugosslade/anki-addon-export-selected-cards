$(document).ready(function() {

    const STORED_DATA_KEY = "input-text-data";

    var $inputTextArea = $("#input");
    var $inputButton = $("#import-button");

    var $exerciseArea = $("#exercise-area");
    var templateExerciseSubsection = $("#template-exercise-subsection").removeAttr("id").html();
    var templateQuestion = $("#template-question").removeAttr("id").html();

    var storedData = localStorage.getItem(STORED_DATA_KEY);
    $inputTextArea.val(localStorage.getItem(STORED_DATA_KEY));

    if(storedData.length > 0){
        SetupWorksheet(ConvertInputDataToSections(storedData));
    }

    $inputButton.on("click", function() {
        var text = $inputTextArea.val();
        localStorage.setItem(STORED_DATA_KEY, text);

        var sections = ConvertInputDataToSections(text);

        console.log("Data imported:", sections);

        SetupWorksheet(sections);
    });

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
            $exerciseSubsection.find("h3").text(section.name);

            for (var j = 0; j < section.entries.length; j++) {
                var entry = section.entries[j];
                var $question = $(templateQuestion);
                $question.find(".untranslated-text .text").text(entry.untranslated);
                $question.find(".translated-text .text").text(entry.translated);
                $exerciseSubsection.append($question);
            }
            $exerciseArea.append($exerciseSubsection);

        }
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
    if(matchingVoices.length == 0){
        console.error("No matching voices found for language: " + language);
        return null;
    }
    return matchingVoices;
}
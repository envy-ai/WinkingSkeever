// index.js
const OpenAIClient = require('./openaiClient');
const fs = require('fs');
const yaml = require('js-yaml');
const location = require('./location');

// Load config.yaml into config
const config = require('./config');

const Character = require('./character');
const Manager = require('./manager');
const GameMaster = require('./gamemaster');


// Replace with your OpenAI API key
//const apiKey = 'your-api-key-here';
const apiKey = 'dz83jkliZnXqIk7RuvlSgxDpr8Z9LPsL';

// Initialize the OpenAI client
const client = new OpenAIClient(config.api_key, config.api_url);
//const client = new OpenAIClient(apiKey, 'https://api.deepinfra.com/v1/openai');

// Local location info.yaml from location directory into global.location

const locationName = 'The Winking Skeever';
const locationFile = `locations/${locationName}/info.yaml`;

location.data = yaml.load(fs.readFileSync(locationFile, 'utf8'));

const characters = ['Lydia', 'Lisette', 'Aela'];

// Load the characters
for(character of characters) {
    const char = new Character(character, client);
    location.characters[character] = char;
}

// Set up the manager
var manager = new Manager(client);
var gameMaster = new GameMaster(client);

// The response from the character should be in the json format: { character: 'character speaking', text: 'response text' }
function parseResponse(response) {
    // convert json to python variable
    console.log(response);
    try {
        response = JSON.parse(trimAroundJson(response));
    }
    catch(error) {
        console.log("Error parsing response: " + error);
        console.log("Response: " + response);
        return { status: 'error', error: 'Error parsing response', response: response };
    }

    // get the character and response
    try {
        const character = response.speaker;
        const text = response.text;
        let location = '';
        if('travel' in response && travel) {
            location = response.travel;
        }
        return { status: 'ok', character: character, text: text, location: location };
    } catch(error) {
        console.log("Error parsing response" + error);
        console.log("Response: " + response);
        return { status: 'error', error: 'Error parsing response', response: response };
    }

}

function trimAroundJson(text) {
    return text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
}

function parseManagerResponse(response) {
    // convert json to python variable
    console.log(response);

    try {
        response = JSON.parse(trimAroundJson(response));
    }
    catch {
        console.log("Error parsing response");
        console.log(response);
        return { status: 'error', error: 'Error parsing response', response: response };
    }
    
    // get the character
    try {
        const character = response.character;
        return { status: 'ok', character: character };
    } catch {
        console.log("Error parsing response");
        console.log(response);
        return { status: 'error', error: 'Error parsing response', response: response };
    }
}

async function runLoop() {
    let previousCharacter = '';
    let character = '';
    let nextCharacter = '';
    let wait_for_events = 0;
    while(1) {
        if(previousCharacter === '') {
            // Randomly select a starting character from location.characters
            let characters = Object.keys(location.characters);
            character = characters[Math.floor(Math.random() * characters.length)];
        } else {
            /*
            let character_json = parseManagerResponse(await manager.getNextCharacter(previousCharacter));

            if(character_json.status === 'error') {
                console.log("Error getting next character");
                console.log(character_json.error);
                continue;
            }
            character = character_json.character;
            */
            character = nextCharacter;
        }

        try {
            let response = parseResponse(await location.characters[character].generateResponse());

            if(response.status === 'error') {
                console.log("Error generating response: " + response.error);
                continue;
            }

            if(response.character !== character) {
                console.log(`Error: character mismatch. Expected ${character}, got ${response.character}`);
                console.log(response.text);
                continue;
            }

            location.conversation += `${response.character}: ${response.text}\n\n`;
            nextCharacter = getNextSpeaker(character, response.text);
            //console.log(character + ": " + response.text.trim() + "\n\n");
            

            if(response.location !== '') {
                let journey = await gameMaster.travel(locationName, response.location);
                location.conversation += journey.journey;
                location.data.name = journey.location;
                location.data.description = journey.description;
                console.log(journey.journey);
                //console.log(journey.description);
            }

            // Do an event one round in 10
            if(wait_for_events == 0) {
                if(Math.random() < config.event_frequency) {
                    let event = await gameMaster.do_event(location.data.name);
                    location.conversation += "\n" + event + "\n";
                    console.log(event);
                }
                wait_for_events = config.min_time_between_events;
            } else {
                wait_for_events--;
            }

            console.log(location.conversation);
            previousCharacter = character;
        }
        catch(error) {
            console.log("Error generating response: " + error);
            console.log(character);
            continue;
        }


    }
}

/**
 * Return the first speaker whose name is mentioned in the previous line.  If no speakers are found, choose someone other than the previous speaker.
 * @param {string} previous_line - The previous line of text.
 * @returns {string} - The name of the next speaker.
 */
function getNextSpeaker(previous_speaker, previous_line) {
    let speakers = Object.keys(location.characters);
    //remove previous_speaker from speakers
    speakers = speakers.filter(speaker => speaker !== previous_speaker);

    let next_speaker = speakers[Math.floor(Math.random() * speakers.length)];
    if(previous_line === undefined) {
        return next_speaker;
    }
    for(speaker of speakers) {
        if(previous_line.includes(speaker)) {
            next_speaker = speaker;
            break;
        }
    }
    return next_speaker;
}

runLoop();
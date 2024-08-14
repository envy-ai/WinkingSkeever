// index.js
const OpenAIClient = require('./openaiClient');
const fs = require('fs');
const yaml = require('js-yaml');
const location = require('./location');

// Load config.yaml into config
const config = require('./config');

const Character = require('./character');
const Manager = require('./manager');


// Replace with your OpenAI API key
const apiKey = 'your-api-key-here';

// Initialize the OpenAI client
const client = new OpenAIClient(apiKey, 'http://192.168.1.2:5001/v1');

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

// The response from the character should be in the json format: { character: 'character speaking', text: 'response text' }
function parseResponse(response) {
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

    // get the character and response
    try {
        const character = response.speaker;
        const text = response.text;
        return { status: 'ok', character: character, text: text };
    } catch {
        console.log("Error parsing response");
        console.log(response);
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
    while(1) {
        if(previousCharacter === '') {
            // Randomly select a starting character from location.characters
            let characters = Object.keys(location.characters);
            character = characters[Math.floor(Math.random() * characters.length)];
        } else {
            let character_json = parseManagerResponse(await manager.getNextCharacter(previousCharacter));

            if(character_json.status === 'error') {
                console.log("Error getting next character");
                console.log(character_json.error);
                continue;
            }
            character = character_json.character;
        }

        try {
            let response = parseResponse(await location.characters[character].generateResponse());

            if(response.status === 'error') {
                console.log("Error generating response");
                console.log(response.error);
                continue;
            }

            if(response.character !== character) {
                console.log(`Error: character mismatch. Expected ${character}, got ${response.character}`);
                console.log(response.text);
                continue;
            }

            location.conversation += `${response.character}: ${response.text}\n\n`;
            //console.log(character + ": " + response.text.trim() + "\n\n");
            console.log(location.conversation);
            previousCharacter = character;
        }
        catch {
            console.log("Error generating response");
            console.log(character);
            continue;
        }


    }
}

runLoop();
// This class wraps around the OpenAIClient class and controls a single character in the chat room.  It loads a name, a character description, and a private character prompt from a specified yaml file.  It also has a method to generate a response to a user prompt using the OpenAI API.  The response is generated using the character's private prompt and the user's prompt.  The character's response is then returned to the user.
//
// The character class has the following properties:
// - name: The name of the character.
// - description: The description of the character.
// - history: The history of the character.
// - client: The OpenAI client instance.
// - quotes: The quotes of the character.
// - prompt: The private prompt for the character.
//
// The character class has the following methods:
// - constructor: Initializes the character with a name, description, and prompt.
// - generateResponse: Generates a response to a user prompt using the OpenAI API.
//
// The character class is used in the chat room to control the behavior of individual characters.  Each character has its own private prompt and can generate responses to user prompts using the OpenAI API.

const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config');
const location = require('./location');
const Handlebars = require('handlebars');

class Character {
    /**
     * Create a Character instance.
     * @param {string} name - The name of the character.
     * @param {object} client - The OpenAI client instance.
     */
    constructor(name, client) {
        // Load the character data from the info.yaml file in the characters directory
        const data = yaml.load(fs.readFileSync(`characters/${name}/info.yaml`, 'utf8'));

        // Load the character's relationship data from the relationships.yaml file in the characters directory
        const relationships = yaml.load(fs.readFileSync(`characters/${name}/relationships.yaml`, 'utf8'));

        this.name = data.name;
        this.description = data.description;
        this.bio = data.bio;
        this.client = client;
        this.quotes = data.quotes;
        this.relationships = relationships;

        this.compiledPromptTemplate = Handlebars.compile(config.character_prompt);
        this.compiledSystemPromptTemplate = Handlebars.compile(config.character_system_prompt);
    }

    getDescription() {  
        return this.description;
    }

    generateCharacterList(characters) {
        // Return an array of items in the format { name: 'Character Name', description: 'Character Description', relationship: 'this character's relationship with the other character' }

        let characterList = [];
        for(const character in characters) {
            if(character != this.name) {
                let description = location.characters[character].description;
                let characterListItem = `  ${character.trim()}: ${description.trim()}`
                // if this.relationships[character] exists, add it to the characterListItem
                if(this.relationships !== undefined && character in this.relationships) {
                    characterListItem += ` ${this.relationships[character].trim()}`;
                }
                characterList.push(characterListItem);
            }
            
        }
        //console.log(characterList);
        return characterList;
    }

    generatePrompt() {
        return this.compiledPromptTemplate({ 
            character: {
                name: this.name,
                description: this.description,
                quotes: this.quotes,
            },
            characters: this.generateCharacterList(location.characters),
            location: location.data,
            conversation: location.conversation,
        });        
    }

    generateSystemPrompt() {
        return this.compiledSystemPromptTemplate({ 
            character: {
                name: this.name,
                description: this.description,
                quotes: this.quotes,
            },
            characters: this.generateCharacterList(location.characters),
            location: location.data,
            conversation: location.conversation,
        });        
    }

    // Takes an array of quotes and formats them into a single string, indented two spaces and separated by newlines
    formatQuotes(quotes) {
        return quotes.map(quote => `  ${quote}`).join('\n');        
    }

    /**
     * Generate a response to a user prompt using the OpenAI API.
     * @returns {Promise<string>} - The character's response.
     */
    async generateResponse() {
        // Construct the options for the OpenAI API request
        let userPrompt = this.generatePrompt();
        let systemPrompt = this.generateSystemPrompt();

        //console.log(userPrompt);
        const options = {
            prompt: userPrompt,
            system_prompt: systemPrompt,
            max_tokens: config.max_tokens,
            temperature: config.temperature,
            stop: ["\n", "}"],
        };

        // Make a request to the OpenAI API
        try {
            const response = await this.client.request('chat/completions', options);
            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error:', error);
            console.log(systemPrompt);
            console.log(userPrompt);
            console.log(response);
            return `Error. Prompt follows:\n${prompt}`;
        }
    }
}

module.exports = Character;
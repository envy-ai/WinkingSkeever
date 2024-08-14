// This class uses the OpenAI client to look at the current conversation and determine which character should speak next, then returns that character's name, so that character's chatbot can be called to generate a response.

const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config');
const location = require('./location');
const Handlebars = require('handlebars');

class Manager {
    /**
     * Create a Manager instance.
     * @param {object} client - The OpenAI client instance.
     */
    constructor(client) {
        this.client = client;
        this.compiledPromptTemplate = Handlebars.compile(config.manager_prompt);
    }

    /**
     * Get the next character to speak.
     * @returns {string} - The name of the next character to speak.
     */
    async getNextCharacter(lastCharacter) {
         // Make a list of characters in the conversation, excluding the last character
        let characterList = [];
        for (const character in location.characters) {
            if (character !== lastCharacter) {
                characterList.push(character);
            }
        }

        console.log(characterList);

        let prompt = config.manager_prompt;

        // Use handlebars to replace the character list in the prompt
        prompt = this.compiledPromptTemplate({ characters: characterList, conversation: location.conversation });
        //console.log(prompt);

        // Call the OpenAI API to get the next character
        /*
        const response = await this.client.request('chat/completions', { 
            prompt: prompt,
            system_prompt: "Your job is to view a conversation and determine which character in that conversation should logically speak next.  The response must be a single JSON object with a 'character' attribute set to the name of the character who should speak next.  There should be no text or other characters outside the JSON string.",
            max_tokens: 100
        });
        */
        let response;
        
        try {
            response = await this.client.request('chat/completions', { prompt: prompt, stop: "]", max_tokens: 100 });
            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error:', error);
            console.log(prompt);
            console.log(response);
            return `Error. Prompt follows:\n${prompt}`;
        }
    }
}

module.exports = Manager;
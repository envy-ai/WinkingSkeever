// This class uses the OpenAI client to look at the current conversation and determine which character should speak next, then returns that character's name, so that character's chatbot can be called to generate a response.

const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config');
const location = require('./location');
const Handlebars = require('handlebars');

class GameMaster {
    /**
     * Create a GameMaster instance.
     * @param {object} client - The OpenAI client instance.
     */
    constructor(client) {
        this.client = client;
        this.journeyPromptTemplate = Handlebars.compile(config.gamemaster_journey_prompt);
        this.destinationPromptTemplate = Handlebars.compile(config.gamemaster_destination_prompt);
        this.eventPromptTemplate = Handlebars.compile(config.gamemaster_event_prompt);
    }

    truncateUnfinishedSentence(paragraph) {
        // Regular expression to match a sentence ending with a period, exclamation mark, or question mark.
        const sentenceEndPattern = /([.!?])\s*/g;
    
        // Find the last match of a complete sentence
        let lastCompleteSentenceIndex = -1;
        let match;
        while ((match = sentenceEndPattern.exec(paragraph)) !== null) {
            lastCompleteSentenceIndex = sentenceEndPattern.lastIndex;
        }
    
        // If there's a complete sentence, truncate the paragraph to the last complete sentence
        if (lastCompleteSentenceIndex !== -1) {
            return paragraph.substring(0, lastCompleteSentenceIndex).trim() + "\n\n";
        }
    
        // If no complete sentence is found, return an empty string or the original paragraph depending on your use case
        return paragraph;
    }
    /**
     * Travel from one location to another.
     * @param {string} start - The starting location.
     * @param {string} destination - The destination location.
     * @returns {string} - The journey text
     */
    async travel(start, destination) {
         // Make a list of characters in the conversation, excluding the last character

        let prompt = config.gamemaster_prompt;

        // Use handlebars to replace the character list in the prompt
        prompt = this.journeyPromptTemplate({ start: start, destination: destination, conversation: location.conversation });
        //console.log(prompt);

        let response;
        let journey;

        try {
            response = await this.client.request('chat/completions', { prompt: prompt, max_tokens: 250 });
            journey = this.truncateUnfinishedSentence(response.choices[0].message.content);
        } catch (error) {
            console.error('Error:', error);
            console.log(prompt);
            console.log(response);
            return `Error. Prompt follows:\n${prompt}`;
        }

        journey += "\n\nYou have arrived at " + destination + ".\n\n";

        prompt = this.destinationPromptTemplate({ start: start, destination: destination, conversation: location.conversation });
        let description;
        try {
            response = await this.client.request('chat/completions', { prompt: prompt, max_tokens: 250 });
            description = this.truncateUnfinishedSentence(response.choices[0].message.content);
            journey += description;
        } catch (error) {
            console.error('Error:', error);
            console.log(prompt);
            console.log(response);
            return `Error. Prompt follows:\n${prompt}`;
        }

        return {journey: journey, description: description};
    }

    /**
     * Generate an event at a location.
     * @param {string} location - The location where the event occurs.
     * @returns {string} - The event text
     */
    async do_event(location) {
        // Select a random event type from config.event_types
        let event_type = config.event_types[Math.floor(Math.random() * config.event_types.length)];
        let prompt = this.eventPromptTemplate({ location: location, conversation: location.conversation, event_type: event_type });
        let response;

        try {
            console.log("New event: ")
            console.log(event_type);
            response = await this.client.request('chat/completions', { prompt: prompt, max_tokens: 250 });
            return this.truncateUnfinishedSentence(response.choices[0].message.content);
        } catch (error) {
            console.error('Error:', error);
            console.log(prompt);
            console.log(response);
            return `Error. Prompt follows:\n${prompt}`;
        }
    }
}

module.exports = GameMaster;
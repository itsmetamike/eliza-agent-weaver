// index.js

require('dotenv').config();
const fs = require('fs');
const OpenAI = require('openai');

// Set up OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // Set a timeout to prevent hanging requests (set in the client options)
    timeout: 60000, // 60 seconds
});

// Read lore file
async function getLoreInput() {
    try {
        return fs.readFileSync('lore.txt', 'utf8');
    } catch (error) {
        console.error('Error reading lore file:', error);
        return null;
    }
}

// Utility function to read names from file
function getAvailableNames() {
    try {
        const namesContent = fs.readFileSync('names.txt', 'utf8');
        return namesContent.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
    } catch (error) {
        console.error('Error reading names file:', error);
        return [];
    }
}

// Retry wrapper function
async function withRetry(operation, maxAttempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${maxAttempts}`);
            const result = await operation();
            return result;
        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt}/${maxAttempts} failed:`, error.message);
            if (attempt === maxAttempts) break;
            console.log(`Waiting 2 seconds before retry ${attempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    throw lastError;
}

// Function to strip code fences from the assistant's response
function stripCodeFences(text) {
    const codeFencePattern = /^```(?:json)?\s*([\s\S]*?)\s*```$/s;
    const match = text.match(codeFencePattern);
    if (match) {
        return match[1].trim();
    } else {
        return text.trim();
    }
}

// Generate character summaries and relationships
async function generateCharacterFramework(loreText, characterNames) {
    console.log(`\nGenerating character framework for ${characterNames.length} characters...`);

    const namesList = characterNames.map((name, index) => `${index + 1}. ${name}`).join('\n');

    const prompt = `
Based on the following world lore and provided character names, create interconnected characters. For each character, use the given name and provide:

- **Summary**: A brief description (2-3 sentences) of the character's background, personality, and role in the world.
- **Relationships**: Describe relationships with other characters using their names, including the nature of the relationship (e.g., ally, rival, sibling).

Ensure that:

- The characters are deeply interconnected through shared events, organizations, or conflicts.
- Relationships are reciprocal and consistent across characters.
- The characters fit naturally within the provided lore.

**Character Names:**

${namesList}

**World Lore:**

${loreText}

**Return Format (JSON only, without code fences or additional text):**

{
    "characters": [
        {
            "name": "Character Name",
            "summary": "Brief description...",
            "relationships": [
                {
                    "name": "Other Character's Name",
                    "relationship": "Nature of the relationship",
                    "details": "Specifics about their relationship"
                }
            ]
        }
    ]
}

**Please output only the JSON object without any code fences or additional text.**`;

    try {
        console.log('Sending request to OpenAI API for character framework...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'user',
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: 2000,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        // Parse the JSON response
        const framework = JSON.parse(content);

        // Print the character framework to the console
        console.log('\nGenerated Character Framework:');
        console.dir(framework, { depth: null });

        // Write the framework to a JSON file
        fs.writeFileSync('character_framework.json', JSON.stringify(framework, null, 2));
        console.log('\nCharacter framework saved to character_framework.json');

        // Optionally, write individual character summaries to separate JSON files
        framework.characters.forEach(char => {
            const fileName = `${char.name.replace(/\s+/g, '_')}_summary.json`;
            fs.writeFileSync(fileName, JSON.stringify(char, null, 2));
            console.log(`Character summary saved to ${fileName}`);
        });

        return framework.characters;
    } catch (error) {
        console.error('Error generating character framework:', error);
        throw error;
    }
}

// Generate bio
async function generateBio(loreText, charSummary) {
    console.log(`Generating bio for ${charSummary.name}...`);
    const prompt = `
Generate a detailed bio for the character "${charSummary.name}" based on the following world lore, character summary, and relationships.

**World Lore:**

${loreText}

**Character Summary:**

${charSummary.summary}

**Relationships:**

${charSummary.relationships.map(rel => `- ${rel.name}: ${rel.relationship} (${rel.details})`).join('\n')}

**Instructions:**

- Provide between **10 to 100** statements in the bio.
- Make all statements assertive and direct with strong claims.
- Include specific numbers, names, and concrete details.
- Use emphasis (CAPS) for key points and contrasts.
- Reference events, places, and other characters by name.
- Show strong personality and opinions in all content.
- Include concrete accomplishments and specific claims.
- Output should be a JSON array of strings (no additional text).

**Example Output:**

[
    "First statement.",
    "Second statement.",
    // ...
]
`;

    try {
        console.log(`Sending bio generation request for ${charSummary.name}...`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.7,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        let bioArray;
        try {
            bioArray = JSON.parse(content);
            if (!Array.isArray(bioArray)) {
                throw new Error('Bio is not an array');
            }
        } catch (error) {
            console.error(`Failed to parse bio for ${charSummary.name}:`, error.message);
            console.error('Content received:', content);
            throw error;
        }

        return bioArray;
    } catch (error) {
        console.error(`Error generating bio for ${charSummary.name}:`, error.message);
        throw error;
    }
}

// Generate lore
async function generateLore(loreText, charSummary) {
    console.log(`Generating lore for ${charSummary.name}...`);
    const prompt = `
Generate detailed lore for the character "${charSummary.name}", incorporating the following relationships.

**World Lore:**

${loreText}

**Character Summary:**

${charSummary.summary}

**Relationships:**

${charSummary.relationships.map(rel => `- ${rel.name}: ${rel.relationship} (${rel.details})`).join('\n')}

**Instructions:**

- Provide between **10 to 100** statements in the lore.
- Include the relationships with other characters.
- Follow the key requirements outlined previously.
- Output should be a JSON array of strings.

**Example Output:**

[
    "First statement.",
    "Second statement.",
    // ...
]
`;

    try {
        console.log(`Sending lore generation request for ${charSummary.name}...`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.7,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        let loreArray;
        try {
            loreArray = JSON.parse(content);
            if (!Array.isArray(loreArray)) {
                throw new Error('Lore is not an array');
            }
        } catch (error) {
            console.error(`Failed to parse lore for ${charSummary.name}:`, error.message);
            console.error('Content received:', content);
            throw error;
        }

        return loreArray;
    } catch (error) {
        console.error(`Error generating lore for ${charSummary.name}:`, error.message);
        throw error;
    }
}

// Generate knowledge
async function generateKnowledge(loreText, charSummary) {
    console.log(`Generating knowledge for ${charSummary.name}...`);
    const prompt = `
Generate detailed knowledge points for the character "${charSummary.name}", reflecting their expertise and awareness.

**World Lore:**

${loreText}

**Character Summary:**

${charSummary.summary}

**Instructions:**

- Provide between **10 to 50** knowledge points.
- Include specific facts, theories, or insights the character possesses.
- Reference events, places, and other characters by name.
- Output should be a JSON array of strings.

**Example Output:**

[
    "First knowledge point.",
    "Second knowledge point.",
    // ...
]
`;

    try {
        console.log(`Sending knowledge generation request for ${charSummary.name}...`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.7,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        let knowledgeArray;
        try {
            knowledgeArray = JSON.parse(content);
            if (!Array.isArray(knowledgeArray)) {
                throw new Error('Knowledge is not an array');
            }
        } catch (error) {
            console.error(`Failed to parse knowledge for ${charSummary.name}:`, error.message);
            console.error('Content received:', content);
            throw error;
        }

        return knowledgeArray;
    } catch (error) {
        console.error(`Error generating knowledge for ${charSummary.name}:`, error.message);
        throw error;
    }
}

// Generate message examples
async function generateMessageExamples(loreText, charSummary) {
    console.log(`Generating message examples for ${charSummary.name}...`);
    const prompt = `
Generate between **5 to 10** message examples for the character "${charSummary.name}". Each example should be a conversation consisting of exactly **2** messages: one from "{{user1}}" and one from "${charSummary.name}".

**World Lore:**

${loreText}

**Character Summary:**

${charSummary.summary}

**Instructions:**

- The first message should be from "{{user1}}", asking a question or making a statement.
- The second message should be from "${charSummary.name}", responding in character.
- Make every statement impactful and declarative.
- Use emphasis (CAPS) for key points and contrasts.
- Output should be a JSON array of arrays, each containing two message objects.

**Example Output:**

[
    [
        {
            "user": "{{user1}}",
            "content": {
                "text": "What's your perspective on the new proofs in the white paper?"
            }
        },
        {
            "user": "${charSummary.name}",
            "content": {
                "text": "The new proofs are REVOLUTIONARY! They have the potential to UNLOCK NEW ENERGIES and reshape our understanding of reality."
            }
        }
    ],
    // More message examples...
]
`;

    try {
        console.log(`Sending message examples generation request for ${charSummary.name}...`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0.7,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        let messageExamplesArray;
        try {
            messageExamplesArray = JSON.parse(content);
            if (!Array.isArray(messageExamplesArray)) {
                throw new Error('Message examples is not an array');
            }
        } catch (error) {
            console.error(`Failed to parse message examples for ${charSummary.name}:`, error.message);
            console.error('Content received:', content);
            throw error;
        }

        return messageExamplesArray;
    } catch (error) {
        console.error(`Error generating message examples for ${charSummary.name}:`, error.message);
        throw error;
    }
}

// Generate post examples
async function generatePostExamples(loreText, charSummary) {
    console.log(`Generating post examples for ${charSummary.name}...`);
    const prompt = `
Generate between **10 to 50** post examples for the character "${charSummary.name}".

**World Lore:**

${loreText}

**Character Summary:**

${charSummary.summary}

**Instructions:**

- Make every post impactful and declarative.
- Include specific numbers, names, and concrete details.
- Use emphasis (CAPS) for key points and contrasts.
- Show strong personality and opinions.
- Output should be a JSON array of strings.

**Example Output:**

[
    "First post.",
    "Second post.",
    // ...
]
`;

    try {
        console.log(`Sending post examples generation request for ${charSummary.name}...`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0.7,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        let postExamplesArray;
        try {
            postExamplesArray = JSON.parse(content);
            if (!Array.isArray(postExamplesArray)) {
                throw new Error('Post examples is not an array');
            }
        } catch (error) {
            console.error(`Failed to parse post examples for ${charSummary.name}:`, error.message);
            console.error('Content received:', content);
            throw error;
        }

        return postExamplesArray;
    } catch (error) {
        console.error(`Error generating post examples for ${charSummary.name}:`, error.message);
        throw error;
    }
}

// Generate topics
async function generateTopics(loreText, charSummary) {
    console.log(`Generating topics for ${charSummary.name}...`);
    const prompt = `
Generate between **15 to 50** topics that the character "${charSummary.name}" is interested in or frequently discusses.

**World Lore:**

${loreText}

**Character Summary:**

${charSummary.summary}

**Instructions:**

- Topics should be relevant to the character's background, interests, and relationships.
- Output should be a JSON array of strings.

**Example Output:**

[
    "First topic",
    "Second topic",
    // ...
]
`;

    try {
        console.log(`Sending topics generation request for ${charSummary.name}...`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.7,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        let topicsArray;
        try {
            topicsArray = JSON.parse(content);
            if (!Array.isArray(topicsArray)) {
                throw new Error('Topics is not an array');
            }
        } catch (error) {
            console.error(`Failed to parse topics for ${charSummary.name}:`, error.message);
            console.error('Content received:', content);
            throw error;
        }

        return topicsArray;
    } catch (error) {
        console.error(`Error generating topics for ${charSummary.name}:`, error.message);
        throw error;
    }
}

// Generate style
async function generateStyle(loreText, charSummary) {
    console.log(`Generating style for ${charSummary.name}...`);
    const prompt = `
Generate writing style traits for the character "${charSummary.name}".

**Instructions:**

- For **style.all**: Provide between **10 to 30** general writing style traits.
- For **style.chat**: Provide between **10 to 30** chat-specific writing style traits.
- For **style.post**: Provide between **10 to 30** post-specific writing style traits.
- Output should be a JSON object with "all", "chat", and "post" arrays.

**Example Output:**

{
    "all": ["Trait 1", "Trait 2", "..."],
    "chat": ["Trait 1", "Trait 2", "..."],
    "post": ["Trait 1", "Trait 2", "..."]
}
`;

    try {
        console.log(`Sending style generation request for ${charSummary.name}...`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.7,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        let styleObject;
        try {
            styleObject = JSON.parse(content);
            if (typeof styleObject !== 'object' || !styleObject.all || !styleObject.chat || !styleObject.post) {
                throw new Error('Invalid style object');
            }
        } catch (error) {
            console.error(`Failed to parse style for ${charSummary.name}:`, error.message);
            console.error('Content received:', content);
            throw error;
        }

        return styleObject;
    } catch (error) {
        console.error(`Error generating style for ${charSummary.name}:`, error.message);
        throw error;
    }
}

// Generate adjectives
async function generateAdjectives(loreText, charSummary) {
    console.log(`Generating adjectives for ${charSummary.name}...`);
    const prompt = `
Generate a list of adjectives that describe the character "${charSummary.name}" based on the following information.

**World Lore:**

${loreText}

**Character Summary:**

${charSummary.summary}

**Instructions:**

- Provide between **20 to 40** adjectives.
- Adjectives should reflect the character's personality, style, and role.
- Output should be a JSON array of strings.

**Example Output:**

[
    "First adjective",
    "Second adjective",
    // ...
]
`;

    try {
        console.log(`Sending adjectives generation request for ${charSummary.name}...`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.7,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        let adjectivesArray;
        try {
            adjectivesArray = JSON.parse(content);
            if (!Array.isArray(adjectivesArray)) {
                throw new Error('Adjectives is not an array');
            }
        } catch (error) {
            console.error(`Failed to parse adjectives for ${charSummary.name}:`, error.message);
            console.error('Content received:', content);
            throw error;
        }

        return adjectivesArray;
    } catch (error) {
        console.error(`Error generating adjectives for ${charSummary.name}:`, error.message);
        throw error;
    }
}

// Validate character content
function validateCharacter(character) {
    const errors = [];

    // First check if all required top-level properties exist
    const requiredProps = [
        'bio', 'lore', 'knowledge', 'messageExamples',
        'postExamples', 'topics', 'style', 'adjectives'
    ];

    requiredProps.forEach(prop => {
        if (!character[prop]) {
            errors.push(`Missing ${prop} property`);
            return;
        }
    });

    // If any required props are missing, return early
    if (errors.length > 0) {
        return errors;
    }

    // Validate array ranges
    const rangeRequirements = {
        bio: { min: 10, max: 100 },
        lore: { min: 10, max: 100 },
        knowledge: { min: 10, max: 100 },
        messageExamples: { min: 5, max: 25 },
        postExamples: { min: 10, max: 100 },
        topics: { min: 15, max: 100 },
        adjectives: { min: 20, max: 1000 }
    };

    Object.entries(rangeRequirements).forEach(([field, { min, max }]) => {
        if (!Array.isArray(character[field])) {
            errors.push(`${field} must be an array`);
        } else if (character[field].length < min || character[field].length > max) {
            errors.push(`${field} must have between ${min} and ${max} items, got ${character[field].length}`);
        }
    });

    // Validate style object separately
    if (typeof character.style !== 'object') {
        errors.push('style must be an object');
        return errors;
    }

    ['all', 'chat', 'post'].forEach(styleType => {
        if (!Array.isArray(character.style[styleType])) {
            errors.push(`style.${styleType} must be an array`);
        } else if (character.style[styleType].length < 10 || character.style[styleType].length > 30) {
            errors.push(`style.${styleType} must have between ${min} and ${max} items, got ${character.style[styleType]?.length}`);
        }
    });

    return errors;
}

// Update character with relationships
function updateCharacterWithRelationships(character, characterFramework) {
    const frameworkChar = characterFramework.find(c => c.name === character.name);
    if (!frameworkChar) {
        console.error(`No framework found for ${character.name}`);
        return;
    }

    frameworkChar.relationships.forEach(rel => {
        // Add relationship details to lore
        const relationshipStatement = `${rel.name} is ${rel.relationship} of ${character.name}: ${rel.details}`;
        character.lore.push(relationshipStatement);

        // Add to knowledge
        character.knowledge.push(`Knows that ${rel.name} is ${rel.relationship}: ${rel.details}`);

        // Add to topics
        character.topics.push(`${rel.name} (${rel.relationship})`);
    });

    const fileName = `${character.name.replace(/\s+/g, '_')}.json`;
    fs.writeFileSync(fileName, JSON.stringify(character, null, 2));
    console.log(`Updated ${fileName} with relationships`);
}

// Generate character
async function createCharacter(loreText, charSummary, characterNumber) {
    console.log(`\nGenerating character ${characterNumber}: ${charSummary.name}...`);

    const character = {
        name: charSummary.name,
        clients: [],
        modelProvider: 'anthropic',
        settings: {
            secrets: {},
            voice: {
                model: 'en_US-male-medium'
            }
        },
        plugins: [],
        bio: [],
        lore: [],
        knowledge: [],
        messageExamples: [],
        postExamples: [],
        topics: [],
        style: {
            all: [],
            chat: [],
            post: []
        },
        adjectives: []
    };

    try {
        // Generate each section
        character.bio = await withRetry(() => generateBio(loreText, charSummary));
        character.lore = await withRetry(() => generateLore(loreText, charSummary));
        character.knowledge = await withRetry(() => generateKnowledge(loreText, charSummary));
        character.messageExamples = await withRetry(() => generateMessageExamples(loreText, charSummary));
        character.postExamples = await withRetry(() => generatePostExamples(loreText, charSummary));
        character.topics = await withRetry(() => generateTopics(loreText, charSummary));
        character.style = await withRetry(() => generateStyle(loreText, charSummary));
        character.adjectives = await withRetry(() => generateAdjectives(loreText, charSummary));

        // Validate the character
        const validationErrors = validateCharacter(character);
        if (validationErrors.length > 0) {
            console.error(`Validation errors for ${charSummary.name}:`, validationErrors);
            throw new Error(`Character validation failed: ${validationErrors.join(', ')}`);
        }

        return character;

    } catch (error) {
        console.error(`Error in createCharacter for ${charSummary.name}:`, error.message);
        throw error;
    }
}

// Main execution function
async function main() {
    try {
        console.log('Reading world lore...');
        const loreText = await getLoreInput();
        if (!loreText) throw new Error('Failed to read lore file');

        console.log('Reading available names...');
        const availableNames = getAvailableNames();
        if (availableNames.length < 5) {
            throw new Error('Not enough names available in names.txt');
        }

        console.log('\nGenerating character framework...');
        const characterNames = availableNames.slice(0, 5); // Adjust the number as needed
        const characterFramework = await generateCharacterFramework(loreText, characterNames);

        if (!characterFramework || characterFramework.length === 0) {
            throw new Error('Failed to generate character framework');
        }

        const characters = [];

        // Generate detailed characters using the framework
        for (let i = 0; i < characterFramework.length; i++) {
            const charSummary = characterFramework[i];
            try {
                const character = await withRetry(() =>
                    createCharacter(loreText, charSummary, i + 1)
                );

                if (character) {
                    characters.push(character);
                    const fileName = `${character.name.replace(/\s+/g, '_')}.json`;
                    fs.writeFileSync(fileName, JSON.stringify(character, null, 2));
                    console.log(`Created ${fileName}`);
                }
            } catch (error) {
                console.error(`Failed to generate character ${charSummary.name}:`, error.message);
            }
        }

        if (characters.length === 0) {
            throw new Error('No characters were generated successfully');
        }

        // Update character files with relationships
        console.log('\nUpdating characters with relationships...');
        characters.forEach(char => {
            try {
                updateCharacterWithRelationships(char, characterFramework);
            } catch (error) {
                console.error(`Error updating ${char.name}:`, error.message);
            }
        });

        console.log('\nCharacter generation complete!');
    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    }
}

// Run the script
main().catch(error => {
    console.error('Unhandled error:', error.message);
    process.exit(1);
});

// backend/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
// Add at the top with other imports
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3002 });

// Set up Express app
const app = express();
app.use(cors());
app.use(express.json());

// Set a timeout to prevent hanging requests
const TIMEOUT = 60000; // 60 seconds

// Add broadcast function
// Add this after your broadcast function
function broadcast(message) {
    console.log('Broadcasting:', message); // Debug log
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
            console.log('Message sent to client'); // Debug log
        }
    });
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
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }

    throw lastError;
}

// Generate character summaries and relationships
async function generateCharacterFramework(openai, loreText, characterNames) {
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
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 2000,
        });

        let content = response.choices[0].message.content;

        // Strip code fences
        content = stripCodeFences(content);

        // Parse the JSON response
        const framework = JSON.parse(content);

        return framework.characters;
    } catch (error) {
        console.error('Error generating character framework:', error);
        throw error;
    }
}

// Generate bio
async function generateBio(openai, loreText, charSummary) {
    console.log(`Generating bio for ${charSummary.name}...`);
    const prompt = `
Generate a detailed bio for the character "${charSummary.name}" based on the following world lore, character summary, and relationships.

**World Lore:**

${loreText}

**Character Summary:**

${charSummary.summary}

**Relationships:**

${charSummary.relationships.map((rel) => `- ${rel.name}: ${rel.relationship} (${rel.details})`).join('\n')}

**Instructions:**

- Provide between **10 to 50** statements in the bio.
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
async function generateLore(openai, loreText, charSummary) {
    console.log(`Generating lore for ${charSummary.name}...`);
    const prompt = `
Generate detailed lore for the character "${charSummary.name}", incorporating the following relationships.

**World Lore:**

${loreText}

**Character Summary:**

${charSummary.summary}

**Relationships:**

${charSummary.relationships.map((rel) => `- ${rel.name}: ${rel.relationship} (${rel.details})`).join('\n')}

**Instructions:**

- Provide between **10 to 50** statements in the lore.
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
async function generateKnowledge(openai, loreText, charSummary) {
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
async function generateMessageExamples(openai, loreText, charSummary) {
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
async function generatePostExamples(openai, loreText, charSummary) {
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
async function generateTopics(openai, loreText, charSummary) {
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
async function generateStyle(openai, loreText, charSummary) {
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
async function generateAdjectives(openai, loreText, charSummary) {
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
        'bio',
        'lore',
        'knowledge',
        'messageExamples',
        'postExamples',
        'topics',
        'style',
        'adjectives',
    ];

    requiredProps.forEach((prop) => {
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
        messageExamples: { min: 5, max: 100 },
        postExamples: { min: 10, max: 100 },
        topics: { min: 15, max: 100 },
        adjectives: { min: 20, max: 100 },
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

    ['all', 'chat', 'post'].forEach((styleType) => {
        if (!Array.isArray(character.style[styleType])) {
            errors.push(`style.${styleType} must be an array`);
        } else if (character.style[styleType].length < 10 || character.style[styleType].length > 30) {
            errors.push(
                `style.${styleType} must have between 10 and 30 items, got ${character.style[styleType]?.length}`
            );
        }
    });

    return errors;
}

// Update character with relationships
function updateCharacterWithRelationships(character, characterFramework) {
    const frameworkChar = characterFramework.find((c) => c.name === character.name);
    if (!frameworkChar) {
        console.error(`No framework found for ${character.name}`);
        return;
    }

    frameworkChar.relationships.forEach((rel) => {
        // Add relationship details to lore
        const relationshipStatement = `${rel.name} is ${rel.relationship} of ${character.name}: ${rel.details}`;
        character.lore.push(relationshipStatement);

        // Add to knowledge
        character.knowledge.push(`Knows that ${rel.name} is ${rel.relationship}: ${rel.details}`);

        // Add to topics
        character.topics.push(`${rel.name} (${rel.relationship})`);
    });
}

// Generate character
async function createCharacter(openai, loreText, charSummary, characterNumber) {
    console.log(`\nGenerating character ${characterNumber}: ${charSummary.name}...`);

    const character = {
        name: charSummary.name,
        clients: [],
        modelProvider: 'anthropic',
        settings: {
            secrets: {},
            voice: {
                model: 'en_US-male-medium',
            },
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
            post: [],
        },
        adjectives: [],
        relationships: charSummary.relationships || [],
    };

    try {
        // Generate each section
        character.bio = await withRetry(() => generateBio(openai, loreText, charSummary));
        character.lore = await withRetry(() => generateLore(openai, loreText, charSummary));
        character.knowledge = await withRetry(() => generateKnowledge(openai, loreText, charSummary));
        character.messageExamples = await withRetry(() => generateMessageExamples(openai, loreText, charSummary));
        character.postExamples = await withRetry(() => generatePostExamples(openai, loreText, charSummary));
        character.topics = await withRetry(() => generateTopics(openai, loreText, charSummary));
        character.style = await withRetry(() => generateStyle(openai, loreText, charSummary));
        character.adjectives = await withRetry(() => generateAdjectives(openai, loreText, charSummary));

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

// API endpoint to generate characters
// API endpoint to generate characters
app.post('/api/generate', async (req, res) => {
    try {
        const { apiKey, loreText, namesText, numCharacters, temperature } = req.body;

        // Initialize OpenAI client with the provided API key
        const openai = new OpenAI({
            apiKey: apiKey,
            timeout: TIMEOUT,
        });

        // Parse the names from namesText
        const names = namesText
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (names.length < numCharacters) {
            return res.status(400).json({ error: 'Not enough names provided' });
        }

        const characters = []; // Initialize characters array
        const characterNames = names.slice(0, numCharacters);

        broadcast({
            type: 'progress',
            step: 'Initializing character generation...',
            progress: 0
        });

        // Generate character framework
        broadcast({
            type: 'progress',
            step: `Generating character framework for ${characterNames.length} characters...`,
            progress: 5
        });

        const characterFramework = await generateCharacterFramework(openai, loreText, characterNames);

        // Generate characters with progress updates
        const totalSteps = characterNames.length * 8; // 8 generation steps per character
        let completedSteps = 0;

        for (let i = 0; i < characterFramework.length; i++) {
            const charSummary = characterFramework[i];
            try {
                broadcast({
                    type: 'log',
                    message: `Starting generation for ${charSummary.name}...`
                });

                const character = await createCharacter(openai, loreText, charSummary, i + 1);
                completedSteps++;
                broadcast({
                    type: 'progress',
                    step: `Generating character ${i + 1} of ${characterNames.length}`,
                    progress: 5 + ((completedSteps / totalSteps) * 90)
                });

                if (character) {
                    characters.push(character);
                    broadcast({
                        type: 'log',
                        message: `✓ Completed generation for ${charSummary.name}`
                    });
                }
            } catch (error) {
                broadcast({
                    type: 'log',
                    message: `❌ Error generating ${charSummary.name}: ${error.message}`
                });
            }
        }

        // Update character relationships
        characters.forEach(char => {
            updateCharacterWithRelationships(char, characterFramework);
        });

        broadcast({
            type: 'progress',
            step: 'Finalizing characters...',
            progress: 100
        });

        res.json({ characters });
    } catch (error) {
        broadcast({
            type: 'log',
            message: `❌ Error: ${error.message}`
        });
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

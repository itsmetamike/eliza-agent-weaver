import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, TerminalIcon } from 'lucide-react'; // Changed Terminal to TerminalIcon
import CharacterViewer from './CharacterViewer';
import mermaid from 'mermaid';

// Initialize mermaid with custom styling
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    themeVariables: {
        primaryColor: '#f79321',
        primaryTextColor: '#fff',
        primaryBorderColor: '#f79321',
        lineColor: '#f79321',
        secondaryColor: '#fff',
        tertiaryColor: '#fff'
    }
});

// Add this near the top of the file, after the imports but before any components
const sanitizeName = (name) => {
    return name.replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_');
};

// Keep your existing RelationshipDiagram component, which can now use the sanitizeName function
const RelationshipDiagram = ({ characters }) => {
    const diagramRef = useRef(null);

    useEffect(() => {
        const generateDiagram = async () => {
            if (diagramRef.current && characters.length > 0) {
                try {
                    let graphDefinition = 'graph TD\n';
                    // First add all nodes
                    characters.forEach(char => {
                        const nodeId = sanitizeName(char.name);
                        graphDefinition += `${nodeId}["${char.name}"]\n`;
                    });

                    // Then add relationships
                    const addedRelationships = new Set();
                    characters.forEach(char => {
                        if (char.relationships) {
                            char.relationships.forEach(rel => {
                                const sourceId = sanitizeName(char.name);
                                const targetId = sanitizeName(rel.name);
                                const relationshipKey = [sourceId, targetId].sort().join('-');
                                if (!addedRelationships.has(relationshipKey)) {
                                    graphDefinition += `${sourceId} --- |"${rel.relationship}"| ${targetId}\n`;
                                    addedRelationships.add(relationshipKey);
                                }
                            });
                        }
                    });

                    const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
                    const { svg } = await mermaid.render(id, graphDefinition);
                    diagramRef.current.innerHTML = svg;
                } catch (error) {
                    console.error('Mermaid rendering error:', error);
                }
            }
        };

        generateDiagram();
    }, [characters]);

    return (
        <div className="mt-8 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold text-[#f79321] mb-4">Character Relationships</h2>
            <div ref={diagramRef} className="overflow-x-auto"></div>
        </div>
    );
};

const formatLog = (log) => {
    if (typeof log === 'string') {
        return log;
    }
    if (log.type === 'progress') {
        return log.step;
    }
    if (log.type === 'log') {
        return log.message;
    }
    return JSON.stringify(log);
};

const GenerationProgress = ({ progress, currentStep, logs }) => {
    const logsEndRef = useRef(null); // Add this line to define the ref

    const formatGenerationStep = (step) => {
        if (step.includes('Attempt') || step.includes('Sending')) {
            return null;
        }
        return step;
    };

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    return (
        <div className="space-y-4 bg-black/30 border border-[#f79321]/30 rounded-lg p-4">
            <div className="space-y-2">
                <div className="relative h-2 bg-black/50 rounded-full overflow-hidden">
                    <div
                        className="absolute h-full bg-[#f79321] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="text-sm text-[#f79321] text-left">{currentStep}</div>
            </div>

            <div className="mt-4 border border-[#f79321]/30 rounded-lg p-4 bg-black">
                <div className="flex items-start gap-2 mb-2">
                    <TerminalIcon className="h-4 w-4 text-[#f79321]" />
                    <h3 className="text-[#f79321] text-left">Terminal Output</h3>
                </div>
                <div className="h-48 overflow-y-auto text-sm space-y-1 p-2 text-left">
                    {logs.length === 0 ? (
                        <div className="text-[#f79321] italic text-left">
                            Initializing generation process...
                        </div>
                    ) : (
                        logs.map((log, index) => {
                            const formattedLog = formatLog(log);
                            const generationStep = formatGenerationStep(formattedLog);
                            if (generationStep) {
                                return (
                                    <div key={index} className="text-[#f79321] text-left">
                                        &gt; {generationStep}
                                    </div>
                                );
                            }
                            return null;
                        }).filter(Boolean)
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};

const CharacterGenerator = () => {
    // Initialize all state variables
    const [formData, setFormData] = useState({
        apiKey: '',
        loreText: '',
        namesText: '',
        numCharacters: 5,
        temperature: 0.7,
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [characters, setCharacters] = useState([]);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [logs, setLogs] = useState([]);


    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Add WebSocket connection
    // In CharacterGenerator.js, update the WebSocket useEffect
    useEffect(() => {
        let ws;
        try {
            ws = new WebSocket('ws://localhost:3002');

            ws.onopen = () => {
                console.log('WebSocket Connected');
                setLogs(prev => [...prev, "WebSocket Connected - Ready to receive updates"]);
            };

            ws.onmessage = (event) => {
                console.log('Received message:', event.data); // Debug log
                const data = JSON.parse(event.data);

                if (data.type === 'progress') {
                    setProgress(data.progress);
                    setCurrentStep(data.step);
                } else if (data.type === 'log') {
                    setLogs(prev => {
                        console.log('Adding log:', data.message); // Debug log
                        return [...prev, data.message];
                    });
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setLogs(prev => [...prev, `WebSocket Error: ${error.message}`]);
            };

            ws.onclose = () => {
                console.log('WebSocket Disconnected');
                setLogs(prev => [...prev, "WebSocket Disconnected"]);
            };

        } catch (error) {
            console.error('WebSocket connection error:', error);
            setLogs(prev => [...prev, `WebSocket Connection Error: ${error.message}`]);
        }

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate that we have enough names
        const names = formData.namesText
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (names.length < formData.numCharacters) {
            setError('Not enough character names provided. Please add more names.');
            return;
        }

        setError('');
        setIsGenerating(true);
        setProgress(0);
        setCurrentStep('');
        setLogs([]);

        try {
            const response = await fetch('http://localhost:3001/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    namesText: names.join('\n') // Send cleaned names
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An error occurred');
            }

            const data = await response.json();
            setCharacters(data.characters);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const TypingText = ({ text, className, speed = 50 }) => {
        const [displayedText, setDisplayedText] = useState('');

        useEffect(() => {
            let index = 0;
            const timer = setInterval(() => {
                if (index < text.length) {
                    setDisplayedText((prev) => prev + text.charAt(index));
                    index++;
                } else {
                    clearInterval(timer);
                }
            }, speed);

            return () => clearInterval(timer);
        }, [text, speed]);

        return <span className={className}>{displayedText}</span>;
    };

    return (
        <div className="min-h-screen bg-black text-[#f79321] p-6">
            <style jsx global>{`
                * {
                    font-family: "Courier New", Courier, "Lucida Console", Monaco, monospace;
                }
                pre {
                    font-family: "Courier New", Courier, "Lucida Console", Monaco, monospace;
                }
                textarea, input {
                    font-family: "Courier New", Courier, "Lucida Console", Monaco, monospace;
                }
            `}</style>

            <div className="scanline" />
            <div className="max-w-6xl mx-auto space-y-8">
                {/* ASCII Logo - only this keeps monospace */}
                <div className="space-y-4">
                    <pre className="text-[#f79321] text-lg whitespace-pre">
                        {`
                         .---.                          
           __.....__     |   |.--.                      
       .-''         '.   |   ||__|                      
      /     .-''"'-.  '. |   |.--.                      
     /     /________\\   \\|   ||  |               __     
     |                  ||   ||  |.--------.  .:--.'.   
     \\    .-------------'|   ||  ||____    | / |   \\ |  
      \\    '-.____...---.|   ||  |    /   /  \`" __ | |  
       \`.             .' |   ||__|  .'   /    .'.''| |  
         \`''-...... -'   '---'     /    /___ / /   | |_ 
                                  |         |\\ \\._,\\ '/ 
                                  |_________| \`--'  \`"  
    `}
                    </pre>
                    <div className="bg-zinc-900 rounded p-4">
                        <p className="text-[#f79321] text-center">
                            eliza is a lightweight AI agent framework. It leverages Character files - JSON-formatted configurations
                            that define an AI character's personality, knowledge, and behavior patterns. This tool enables you
                            to develop a set of Character files based on your own lore, and connects the narratives of
                            multiple agents together through their character files.
                        </p>
                    </div>
                    <div className="w-full h-52 relative mb-8">
                        <img
                            src="/hero.jpg"
                            alt="Eliza Hero"
                            className="w-full h-full object-cover rounded"
                        />
                    </div>


                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* World Lore */}
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <TerminalIcon className="h-4 w-4 mt-1" />
                            <h2 className="text-lg">World Lore</h2>
                        </div>
                        <p className="text-[#f79321] text-left">
                            Define your world's background story, rules, and setting. This context will shape your characters' personalities and relationships.
                        </p>
                        <textarea
                            name="loreText"
                            value={formData.loreText}
                            onChange={handleInputChange}
                            className="w-full h-40 bg-zinc-900 rounded p-4 text-white"
                            placeholder="Enter your world's lore here..."
                            required
                        />
                    </div>

                    {/* Character Names */}
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <TerminalIcon className="h-4 w-4 mt-1" />
                            <h2 className="text-lg">Character Names</h2>
                        </div>
                        <p className="text-[#f79321] text-left">
                            List your character names (one per line). These will be developed into full character profiles.
                        </p>
                        <textarea
                            name="namesText"
                            value={formData.namesText}
                            onChange={handleInputChange}
                            className="w-full h-32 bg-zinc-900 rounded p-4 text-white"
                            placeholder="Enter character names (one per line)..."
                            required
                        />
                    </div>

                    {/* Configuration */}
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <TerminalIcon className="h-4 w-4 mt-1" />
                            <h2 className="text-lg">Configuration</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-left">OpenAI API Key</label>
                                <input
                                    type="password"
                                    name="apiKey"
                                    value={formData.apiKey}
                                    onChange={handleInputChange}
                                    className="mt-1 w-full bg-zinc-900 rounded px-4 py-2 text-white"
                                    required
                                />
                                <p className="text-xs mt-1">Your API key will not be stored.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-left mb-1">Number of Characters</label>
                                    <input
                                        type="number"
                                        name="numCharacters"
                                        value={formData.numCharacters}
                                        onChange={handleInputChange}
                                        min="1"
                                        max="10"
                                        className="w-full bg-zinc-900 rounded px-4 py-2 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-left mb-1">Temperature</label>
                                    <input
                                        type="number"
                                        name="temperature"
                                        value={formData.temperature}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        className="w-full bg-zinc-900 rounded px-4 py-2 text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isGenerating}
                        className="w-full bg-[#f79321] text-black py-3 rounded hover:bg-[#f79321]/90 disabled:bg-[#f79321]/50"
                    >
                        {isGenerating ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating Characters...
                            </span>
                        ) : (
                            'Generate Characters'
                        )}
                    </button>
                </form>

                {/* Progress Display */}
                {isGenerating && (
                    <GenerationProgress
                        progress={progress}
                        currentStep={currentStep}
                        logs={logs}
                    />
                )}

                {/* Results Display */}
                {characters.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-2 text-[#f79321]">  {/* removed justify-center */}
                            <TerminalIcon className="h-4 w-4" />
                            <h2 className="text-lg">Generated Characters</h2>
                        </div>
                        {characters.map((character, index) => (
                            <CharacterViewer key={index} character={character} />
                        ))}
                        <RelationshipDiagram characters={characters} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CharacterGenerator;
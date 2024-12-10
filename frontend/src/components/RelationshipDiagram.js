// In the RelationshipDiagram component, update the generateDiagram function:

const RelationshipDiagram = ({ characters }) => {
    useEffect(() => {
        const generateDiagram = async () => {
            if (diagramRef.current && characters.length > 0) {
                try {
                    let graphDefinition = 'graph LR\n';  // Changed to LR for left-to-right layout

                    // Add characters as nodes with more details
                    characters.forEach(char => {
                        const charId = char.name.replace(/\s+/g, '_');
                        // Include character title and key traits in node
                        graphDefinition += `${charId}["${char.name}<br/>${getCharacterTitle(char)}<br/>${getKeyTraits(char)}"]\n`;
                    });

                    // Add relationships with detailed labels
                    characters.forEach(char => {
                        if (char.relationships) {
                            char.relationships.forEach(rel => {
                                const fromId = char.name.replace(/\s+/g, '_');
                                const toId = rel.name.replace(/\s+/g, '_');
                                // Add detailed relationship description
                                graphDefinition += `${fromId} ---|"${formatRelationship(rel)}"| ${toId}\n`;
                            });
                        }
                    });

                    // Style nodes and edges
                    graphDefinition += `
    classDef default fill:#f0f7ff,stroke:#333,stroke-width:2px;
    classDef relationship stroke:#f79321,color:#333;
    linkStyle default stroke:#f79321,stroke-width:2px,fill:none;
    `;
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

    const getCharacterTitle = (char) => {
        // Get the character's role from their bio
        const title = char.bio
            .find(line => line.includes('role') || line.includes('profession') || line.includes('occupation'))
            ?.split('.')[0] || char.bio[0]?.split('.')[0] || '';

        // Get key achievements or characteristics
        const keyInfo = char.knowledge
            .find(k => k.includes('created') || k.includes('founded') || k.includes('pioneered'))
            ?.split('.')[0] || '';

        return [title, keyInfo]
            .filter(Boolean)
            .join('<br/>');
    };

    const formatRelationship = (rel) => {
        // Split relationship details into bullet points
        const details = rel.details
            .split('.')
            .filter(d => d.trim())
            .map(d => `• ${d.trim()}`)
            .join('<br/>');

        // Format with relationship type as header
        return `${rel.relationship}<br/>${details}`;
    };

    const getKeyTraits = (char) => {
        // Look for signature achievements or traits
        const traits = char.knowledge
            .filter(k =>
                k.includes('specializes') ||
                k.includes('known for') ||
                k.includes('expert in'))
            .slice(0, 2)
            .map(t => `• ${t.trim()}`)
            .join('<br/>');

        return traits;
    };

    return (
        <div className="mt-8 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold text-[#f79321] mb-4">Character Relationships</h2>
            <div ref={diagramRef} className="overflow-x-auto"></div>
        </div>
    );
};
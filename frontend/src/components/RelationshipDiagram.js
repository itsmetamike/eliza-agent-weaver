const RelationshipDiagram = ({ characters }) => {
    const diagramRef = useRef(null);

    useEffect(() => {
        const generateDiagram = async () => {
            if (diagramRef.current && characters.length > 0) {
                try {
                    // Initialize mermaid with custom config
                    mermaid.initialize({
                        startOnLoad: true,
                        theme: 'default',
                        fontFamily: 'Courier New',
                        fontSize: 16,
                        nodeSpacing: 100,
                        curve: 'basis',
                        securityLevel: 'loose',
                        flowchart: {
                            htmlLabels: true,
                            padding: 20,
                            nodeSpacing: 100,
                            rankSpacing: 100,
                            curve: 'basis'
                        }
                    });

                    let graphDefinition = 'graph LR\n';

                    // Add characters as nodes with wrapped text
                    characters.forEach(char => {
                        const charId = sanitizeName(char.name);
                        const title = getCharacterTitle(char);
                        const traits = getKeyTraits(char);

                        // Create a styled node with larger text and better spacing
                        graphDefinition += `${charId}["<div class='node-content'>
                            <div style='font-size: 18px; font-weight: bold; margin-bottom: 8px;'>${char.name}</div>
                            ${title ? `<div style='font-size: 14px; margin-bottom: 6px;'>${title}</div>` : ''}
                            ${traits ? `<div style='font-size: 14px;'>${traits}</div>` : ''}
                            </div>"]\n`;
                    });

                    // Add relationships with better formatted labels
                    const addedRelationships = new Set();
                    characters.forEach(char => {
                        if (char.relationships) {
                            char.relationships.forEach(rel => {
                                const fromId = sanitizeName(char.name);
                                const toId = sanitizeName(rel.name);
                                const relationshipKey = [fromId, toId].sort().join('-');
                                if (!addedRelationships.has(relationshipKey)) {
                                    // Format relationship text with larger font and better spacing
                                    const formattedRelationship = formatRelationship(rel);
                                    graphDefinition += `${fromId} ---|"<div style='font-size: 14px; padding: 8px;'>
                                        ${formattedRelationship}</div>"| ${toId}\n`;
                                    addedRelationships.add(relationshipKey);
                                }
                            });
                        }
                    });

                    // Enhanced styling for nodes and edges
                    graphDefinition += `
                        classDef default fill:#f0f7ff,stroke:#333,stroke-width:2px,rx:10,ry:10;
                        classDef relationship stroke:#f79321,color:#333,stroke-width:2px;
                        linkStyle default stroke:#f79321,stroke-width:2px,fill:none;
                    `;

                    const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
                    const { svg } = await mermaid.render(id, graphDefinition);
                    diagramRef.current.innerHTML = svg;

                    // Add post-render styling to SVG
                    const svgElement = diagramRef.current.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.width = '100%';
                        svgElement.style.maxWidth = '1200px';
                        svgElement.style.height = 'auto';
                        svgElement.style.minHeight = '400px';
                    }
                } catch (error) {
                    console.error('Mermaid rendering error:', error);
                }
            }
        };

        generateDiagram();
    }, [characters]);

    const getCharacterTitle = (char) => {
        const title = char.bio
            .find(line =>
                line.toLowerCase().includes('role') ||
                line.toLowerCase().includes('profession') ||
                line.toLowerCase().includes('occupation')
            )
            ?.split('.')[0] || char.bio[0]?.split('.')[0] || '';

        const keyInfo = char.knowledge
            .find(k =>
                k.toLowerCase().includes('created') ||
                k.toLowerCase().includes('founded') ||
                k.toLowerCase().includes('pioneered')
            )
            ?.split('.')[0] || '';

        return [title, keyInfo]
            .filter(Boolean)
            .map(text => text.trim())
            .join('<br/>');
    };

    const formatRelationship = (rel) => {
        const details = rel.details
            .split('.')
            .filter(d => d.trim())
            .map(d => `<div style='margin: 4px 0;'>• ${d.trim()}</div>`)
            .join('');

        return `<div style='font-weight: bold; margin-bottom: 6px;'>${rel.relationship}</div>${details}`;
    };

    const getKeyTraits = (char) => {
        const traits = char.knowledge
            .filter(k =>
                k.toLowerCase().includes('specializes') ||
                k.toLowerCase().includes('known for') ||
                k.toLowerCase().includes('expert in')
            )
            .slice(0, 2)
            .map(t => `<div style='margin: 4px 0;'>• ${t.trim()}</div>`)
            .join('');

        return traits;
    };

    return (
        <div className="mt-8 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold text-[#f79321] mb-4">Character Relationships</h2>
            <div ref={diagramRef} className="overflow-x-auto min-h-[400px]"></div>
        </div>
    );
};

export default RelationshipDiagram;
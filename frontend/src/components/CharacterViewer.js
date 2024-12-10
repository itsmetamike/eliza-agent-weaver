// src/components/CharacterViewer.js

import React, { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';

const CharacterViewer = ({ character }) => {
    const [isOpen, setIsOpen] = useState(false);

    const sections = [
        { title: 'Bio', data: character.bio },
        { title: 'Lore', data: character.lore },
        { title: 'Knowledge', data: character.knowledge },
        { title: 'Topics', data: character.topics },
        { title: 'Adjectives', data: character.adjectives },
        {
            title: 'Style',
            subsections: [
                { title: 'General', data: character.style.all },
                { title: 'Chat', data: character.style.chat },
                { title: 'Post', data: character.style.post },
            ],
        },
    ];

    const downloadCharacter = () => {
        const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${character.name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="border rounded-lg overflow-hidden bg-white mb-4">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-orange-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="text-lg font-medium">{character.name}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            downloadCharacter();
                        }}
                        className="p-2 hover:bg-orange-100 rounded-full"
                        title="Download character data"
                    >
                        <Download className="h-5 w-5 text-[#f79321]" />
                    </button>
                    <ChevronDown
                        className={`h-5 w-5 transition-transform text-[#f79321] ${isOpen ? 'transform rotate-180' : ''}`}
                    />
                </div>
            </div>

            {isOpen && (
                <div className="p-4 border-t">
                    {sections.map((section) => (
                        <div key={section.title} className="mb-6">
                            <h4 className="font-medium mb-2 text-[#f79321]">{section.title}</h4>
                            {section.subsections ? (
                                <div className="space-y-4">
                                    {section.subsections.map((subsection) => (
                                        <div key={subsection.title} className="ml-4">
                                            <h5 className="font-medium mb-2 text-gray-700">{subsection.title}</h5>
                                            <ul className="list-disc list-inside space-y-1">
                                                {subsection.data.map((item, index) => (
                                                    <li key={index} className="text-sm text-gray-600">
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <ul className="list-disc list-inside space-y-1">
                                    {section.data.map((item, index) => (
                                        <li key={index} className="text-sm text-gray-600">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CharacterViewer;

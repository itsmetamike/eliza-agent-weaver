import React from 'react';

const SimpleRelationshipView = ({ characters }) => {
    return (
        <div className="p-6 bg-black rounded-lg">
            <h2 className="text-xl font-bold text-[#f79321] mb-6">Character Relationships</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {characters.map((char, index) => (
                    <div key={index} className="border border-[#f79321] rounded-lg p-4">
                        {/* Character Header */}
                        <div className="mb-4">
                            <h3 className="text-lg text-[#f79321] font-bold">{char.name}</h3>
                            <p className="text-white text-sm">{char.bio[0]}</p>
                        </div>

                        {/* Relationships */}
                        {char.relationships && char.relationships.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[#f79321] font-bold mb-2">Relationships:</div>
                                {char.relationships.map((rel, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center ml-4 text-white"
                                    >
                                        <span className="text-[#f79321] mr-2">→</span>
                                        <div>
                                            <span className="font-bold">{rel.name}</span>
                                            <span className="mx-2">•</span>
                                            <span>{rel.relationship}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SimpleRelationshipView;
